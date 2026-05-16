
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

function stripFocalHash(url: string | null | undefined): string | null {
  if (!url) return null
  return url.split('#')[0] || null
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function bodyToHtmlParagraphs(body: string): string {
  return body
    .split('\n')
    .map((line) => {
      const trimmed = line.trim().toLowerCase()
      if (trimmed === 'hi,' || trimmed === 'hi') return ''
      if (!line.trim()) return '<p style="margin:0 0 16px;">&nbsp;</p>'
      return `<p style="margin:0 0 16px;">${escapeHtml(line)}</p>`
    })
    .filter(Boolean)
    .join('\n')
}

function buildExpiryEmailHtml(options: {
  photographerName: string
  collectionName: string
  coverUrl: string | null
  bodyHtml: string
  galleryUrl: string
  includePin: boolean
  pin: string
}): string {
  const { photographerName, collectionName, coverUrl, bodyHtml, galleryUrl, includePin, pin } = options
  const coverBlock = coverUrl
    ? `<div style="margin-bottom:30px;"><img src="${escapeHtml(coverUrl)}" alt="${escapeHtml(collectionName)}" style="width:100%;max-width:100%;height:auto;max-height:400px;object-fit:cover;display:block;" /></div>`
    : ''

  const pinBlock = includePin
    ? `<div style="margin-top:24px;border-top:1px solid #eee;padding-top:20px;font-size:13px;color:#888;"><p style="margin:0;">Download PIN: <strong>${escapeHtml(pin)}</strong></p></div>`
    : ''

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f5f5f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:500px;background-color:#ffffff;box-shadow:0 10px 30px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding:48px;text-align:center;">
              <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999;font-family:Arial,sans-serif;">${escapeHtml(photographerName)}</p>
              <h1 style="margin:0 0 30px;font-size:28px;font-weight:500;text-transform:uppercase;letter-spacing:4px;color:#111;">${escapeHtml(collectionName)}</h1>
              ${coverBlock}
              <div style="text-align:left;font-size:15px;line-height:1.8;color:#555;margin-bottom:40px;">
                <p style="margin:0 0 16px;">Hi,</p>
                ${bodyHtml}
                ${pinBlock}
              </div>
              <a href="${escapeHtml(galleryUrl)}" style="display:inline-block;background-color:#111;color:#ffffff;padding:14px 40px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;text-decoration:none;font-family:Arial,sans-serif;">View Gallery</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

async function resolveCoverUrl(
  supabaseAdmin: any,
  collectionId: string,
  coverUrl: string | null | undefined
): Promise<string | null> {
  const fromCollection = stripFocalHash(coverUrl)
  if (fromCollection) return fromCollection

  const { data: photo } = await supabaseAdmin
    .from('photos')
    .select('full_url, web_url, thumbnail_url')
    .eq('collection_id', collectionId)
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!photo) return null
  return stripFocalHash(photo.full_url || photo.web_url || photo.thumbnail_url)
}

serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: reminders, error: fetchError } = await supabaseAdmin
      .from('collection_reminders')
      .select('*, collections!inner(name, slug, auto_expiry, download_pin_hash, cover_url, photographer_id)')
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

    const siteUrl = (Deno.env.get('PUBLIC_SITE_URL') || 'https://pixnxt.com').replace(/\/$/, '')
    const results = []

    for (const reminder of reminders || []) {
      const collection = reminder.collections;
      if (!collection.auto_expiry) continue;

      const expiryDate = new Date(collection.auto_expiry)

      // Standard format: May 18, 2026
      const formattedDate = expiryDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // All collections expire at 11:59 PM
      const formattedTime = "11:59 PM";

      const daysBefore = parseInt(reminder.timing?.split(' ')[0] || '1')
      const targetDate = new Date(expiryDate)
      targetDate.setHours(0, 0, 0, 0)
      targetDate.setDate(targetDate.getDate() - daysBefore)

      if (today.getTime() === targetDate.getTime()) {
        console.log(`Processing reminder for ${collection.name}...`);

        const galleryUrl = `${siteUrl}/gallery/${collection.slug}`
        const coverUrl = await resolveCoverUrl(supabaseAdmin, reminder.collection_id, collection.cover_url)

        const { data: photographer } = await supabaseAdmin
          .from('photographers')
          .select('display_name, email')
          .eq('id', collection.photographer_id)
          .maybeSingle()

        const photographerName = photographer?.display_name || 'PHOTOGRAPHER'
        const pinValue = collection.download_pin_hash || 'N/A'

        const replacements: Record<string, string> = {
          '{collection.name}': collection.name,
          '{expiry.date}': formattedDate,
          '{expiry.time}': formattedTime,
          '{days.prior}': `${daysBefore} day${daysBefore > 1 ? 's' : ''}`,
          '{collection.url}': galleryUrl,
          '{pin}': pinValue,
        }

        const applyReplacements = (text: string) => {
          let out = text
          Object.entries(replacements).forEach(([key, value]) => {
            // Support both {expiry.date} and {expiry.date} at {expiry.time} styles
            out = out.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value)
          })
          return out
        }

        // --- EMAIL LOGIC ---
        const emailRecipients = new Set<string>()
        if (reminder.to_email) {
          reminder.to_email.split(',').forEach((e: string) => emailRecipients.add(e.trim()))
        }

        if (reminder.send_copy && photographer?.email) {
          emailRecipients.add(photographer.email)
        }

        if (emailRecipients.size > 0) {
          const client = new SmtpClient()
          try {
            await client.connectTLS(smtpConfig)
            for (const email of Array.from(emailRecipients)) {
              const rawSubject = reminder.subject || 'Your gallery is expiring soon!'
              const rawBody = reminder.body || ''

              const subject = applyReplacements(rawSubject)
              let body = applyReplacements(rawBody)

              // If the user hasn't explicitly added the time placeholder, 
              // append it to the date in the body for clarity
              if (!rawBody.includes('{expiry.time}')) {
                body = body.replace(formattedDate, `${formattedDate} at ${formattedTime}`)
              }

              const html = buildExpiryEmailHtml({
                photographerName,
                collectionName: collection.name,
                coverUrl,
                bodyHtml: bodyToHtmlParagraphs(body),
                galleryUrl,
                includePin: Boolean(reminder.include_pin),
                pin: pinValue,
              })

              await client.send({
                from: smtpConfig.username,
                to: email,
                subject,
                content: body,
                html,
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
            reminder.to_whatsapp.split(',').forEach((p: string) => whatsappRecipients.add(p.trim()))
          }

          for (const phone of Array.from(whatsappRecipients)) {
            const rawMessage = reminder.whatsapp_body || ''
            let message = applyReplacements(rawMessage)

            if (!rawMessage.includes('{expiry.time}')) {
              message = message.replace(formattedDate, `${formattedDate} at ${formattedTime}`)
            }

            try {
              const payload = coverUrl
                ? {
                  messaging_product: 'whatsapp',
                  recipient_type: 'individual',
                  to: phone.replace(/\D/g, ''),
                  type: 'image',
                  image: {
                    link: coverUrl,
                    caption: message.slice(0, 1024),
                  },
                }
                : {
                  messaging_product: 'whatsapp',
                  recipient_type: 'individual',
                  to: phone.replace(/\D/g, ''),
                  type: 'text',
                  text: {
                    preview_url: true,
                    body: message,
                  },
                }

              const response = await fetch(
                `https://graph.facebook.com/v25.0/${whatsappConfig.phoneNumberId}/messages`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${whatsappConfig.accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(payload),
                }
              );

              const respData = await response.json();
              if (!response.ok) {
                console.error(`WhatsApp error for ${phone}:`, respData);
              } else {
                console.log(`WhatsApp sent to ${phone}${coverUrl ? ' (with cover image)' : ''}`);
              }
            } catch (err) {
              console.error(`WhatsApp fetch failed for ${phone}:`, err.message);
            }
          }
        }

        // Mark as sent
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
