
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts"

// FIX: Polyfill for Deno.writeAll which is missing in newer Deno versions
if (!Deno.writeAll) {
  // @ts-ignore
  Deno.writeAll = async (w: Deno.Writer, data: Uint8Array) => {
    let nwritten = 0;
    while (nwritten < data.length) {
      nwritten += await w.write(data.subarray(nwritten));
    }
  };
}

serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch all active reminders from the new collection_reminders table
    // We join with collections to get the auto_expiry date and slug
    const { data: reminders, error: fetchError } = await supabaseAdmin
      .from('collection_reminders')
      .select('*, collections!inner(name, slug, auto_expiry, download_pin_hash)')
      .is('last_sent_at', null);

    if (fetchError) throw fetchError

    console.log(`Found ${reminders?.length || 0} unsent reminders.`)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const smtpConfig = {
      hostname: Deno.env.get('SMTP_HOST') || '',
      port: parseInt(Deno.env.get('SMTP_PORT') || '465'),
      username: Deno.env.get('SMTP_USER') || '',
      password: Deno.env.get('SMTP_PASS') || '',
    }

    const whatsappConfig = {
      accessToken: Deno.env.get('WHATSAPP_ACCESS_TOKEN') || '',
      phoneNumberId: Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || '',
    }

    const results = []

    for (const reminder of reminders || []) {
      const collection = reminder.collections;
      if (!collection.auto_expiry) continue;

      const expiryDate = new Date(collection.auto_expiry)
      expiryDate.setHours(0, 0, 0, 0)

      // Calculate target date based on timing (e.g., "1 day before...")
      const daysBefore = parseInt(reminder.timing?.split(' ')[0] || '1')
      const targetDate = new Date(expiryDate)
      targetDate.setDate(targetDate.getDate() - daysBefore)

      console.log(`Checking reminder for ${collection.name}: Target=${targetDate.toDateString()}, Today=${today.toDateString()}`);

      // Only send if Today matches the Target Date
      if (today.getTime() === targetDate.getTime()) {
        console.log(`Processing reminder for ${collection.name}...`);

        // --- EMAIL LOGIC ---
        const emailRecipients = new Set<string>()
        if (reminder.to_email) {
          reminder.to_email.split(',').forEach(e => emailRecipients.add(e.trim()))
        }

        // Add from activity lists
        if (reminder.activity_lists?.length > 0) {
          const { data: sessions } = await supabaseAdmin
            .from('client_sessions')
            .select('visitor_email')
            .eq('collection_id', reminder.collection_id)

          if (sessions) {
            sessions.forEach(s => { if (s.visitor_email) emailRecipients.add(s.visitor_email) })
          }
        }

        if (emailRecipients.size > 0) {
          const client = new SmtpClient()
          try {
            await client.connectTLS(smtpConfig)
            for (const email of Array.from(emailRecipients)) {
              let subject = reminder.subject || 'Your gallery is expiring soon!'
              let body = reminder.body || ''

              const replacements = {
                '{collection.name}': collection.name,
                '{expiry.date}': expiryDate.toLocaleDateString(),
                '{days.prior}': `${daysBefore} day${daysBefore > 1 ? 's' : ''}`,
                '{collection.url}': `${Deno.env.get('PUBLIC_SITE_URL') || 'https://pixnxt.com'}/gallery/${collection.slug}`,
                '{pin}': collection.download_pin_hash || 'N/A'
              }

              Object.entries(replacements).forEach(([key, value]) => {
                subject = subject.replace(new RegExp(key, 'g'), value)
                body = body.replace(new RegExp(key, 'g'), value)
              })

              await client.send({
                from: smtpConfig.username,
                to: email,
                subject: subject,
                content: body,
              })
              console.log(`Email sent to ${email}`);
            }
          } catch (err) {
            console.error(`Failed to send emails for ${collection.name}:`, err.message);
          } finally {
            await client.close()
          }
        }

        // --- WHATSAPP LOGIC ---
        if (reminder.whatsapp_enabled && whatsappConfig.accessToken && whatsappConfig.phoneNumberId) {
          const whatsappRecipients = new Set<string>()
          if (reminder.to_whatsapp) {
            reminder.to_whatsapp.split(',').forEach(p => whatsappRecipients.add(p.trim()))
          }

          for (const phone of Array.from(whatsappRecipients)) {
            let message = reminder.whatsapp_body || ''
            const replacements = {
              '{collection.name}': collection.name,
              '{expiry.date}': expiryDate.toLocaleDateString(),
              '{days.prior}': `${daysBefore} day${daysBefore > 1 ? 's' : ''}`,
              '{collection.url}': `${Deno.env.get('PUBLIC_SITE_URL') || 'https://pixnxt.com'}/gallery/${collection.slug}`,
              '{pin}': collection.download_pin_hash || 'N/A'
            }

            Object.entries(replacements).forEach(([key, value]) => {
              message = message.replace(new RegExp(key, 'g'), value)
            })

            try {
              const response = await fetch(
                `https://graph.facebook.com/v25.0/${whatsappConfig.phoneNumberId}/messages`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${whatsappConfig.accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: phone.replace(/\D/g, ''), // Ensure only digits
                    type: "text",
                    text: {
                      preview_url: true,
                      body: message
                    }
                  }),
                }
              );

              const respData = await response.json();
              if (!response.ok) {
                console.error(`WhatsApp error for ${phone}:`, respData);
              } else {
                console.log(`WhatsApp sent to ${phone}`);
              }
            } catch (err) {
              console.error(`WhatsApp fetch failed for ${phone}:`, err.message);
            }
          }
        }

        // 4. Mark as sent
        await supabaseAdmin
          .from('collection_reminders')
          .update({ last_sent_at: new Date().toISOString() })
          .eq('id', reminder.id)

        results.push(`${collection.name} (${reminder.timing})`)
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Global error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
