
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

    // Fetch collections that have an auto_expiry date set and haven't sent the email yet
    const { data: collections, error: fetchError } = await supabaseAdmin
      .from('collections')
      .select('*')
      .not('auto_expiry', 'is', null)
      .is('last_expiry_email_sent_at', null)

    if (fetchError) throw fetchError

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const client = new SmtpClient()
    const smtpConfig = {
      hostname: Deno.env.get('SMTP_HOST') || '',
      port: parseInt(Deno.env.get('SMTP_PORT') || '465'),
      username: Deno.env.get('SMTP_USER') || '',
      password: Deno.env.get('SMTP_PASS') || '',
    }

    const results = []

    for (const collection of collections || []) {
      const expiryDate = new Date(collection.auto_expiry)
      expiryDate.setHours(0, 0, 0, 0)

      const daysBefore = parseInt(collection.expiry_email_timing?.split(' ')[0] || '1')
      const targetDate = new Date(expiryDate)
      targetDate.setDate(targetDate.getDate() - daysBefore)

      // Only send if Today matches the Target Date (e.g., 1 day before expiry)
      if (today.getTime() === targetDate.getTime()) {
        const recipients = new Set<string>()
        
        // 1. Add direct recipients from the "Send to" field
        if (collection.expiry_email_to) {
          collection.expiry_email_to.split(',').forEach(email => recipients.add(email.trim()))
        }

        // 2. Add recipients from activity lists (Downloaded, Registered, etc.)
        const lists = collection.expiry_email_lists || []
        if (lists.length > 0) {
          const { data: sessions } = await supabaseAdmin
            .from('client_sessions')
            .select('visitor_email')
            .eq('collection_id', collection.id)
          
          if (sessions) {
            sessions.forEach(s => { if (s.visitor_email) recipients.add(s.visitor_email) })
          }
        }

        // 3. Send emails if we have recipients
        if (recipients.size > 0) {
          await client.connectTLS(smtpConfig)

          for (const email of Array.from(recipients)) {
            let subject = collection.expiry_email_subject || 'Your gallery is expiring soon!'
            let body = collection.expiry_email_body || ''
            
            const replacements = {
              '{collection.name}': collection.name,
              '{expiry.date}': expiryDate.toLocaleDateString(),
              '{days.prior}': `${daysBefore} day${daysBefore > 1 ? 's' : ''}`,
              '{collection.url}': `${Deno.env.get('PUBLIC_SITE_URL')}/gallery/${collection.slug}`
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
          }

          await client.close()
        }

        // 4. Mark as sent to prevent duplicate reminders
        await supabaseAdmin
          .from('collections')
          .update({ last_expiry_email_sent_at: new Date().toISOString() })
          .eq('id', collection.id)
        
        results.push(collection.name)
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
