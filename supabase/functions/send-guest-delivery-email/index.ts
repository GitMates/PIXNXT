import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts';

if (!Deno.writeAll) {
  // @ts-ignore
  Deno.writeAll = async (w: Deno.Writer, data: Uint8Array) => {
    let nwritten = 0;
    while (nwritten < data.length) {
      nwritten += await w.write(data.subarray(nwritten));
    }
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatFromAddress(displayName: string, email: string): string {
  const safeName = String(displayName || 'Photographer')
    .replace(/[\r\n"<>]/g, '')
    .trim()
    .slice(0, 80);
  return `${safeName} <${email}>`;
}

function isLocalOrigin(origin: string): boolean {
  if (!origin) return true;
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
  } catch {
    return true;
  }
}

function resolveSiteOrigin(siteOrigin: string | null | undefined): string {
  const fromSecret = (Deno.env.get('PUBLIC_SITE_URL') || Deno.env.get('VITE_PUBLIC_SITE_URL') || '').replace(
    /\/$/,
    ''
  );
  const fromClient = String(siteOrigin || '').replace(/\/$/, '');

  // Prefer localhost when the app is running locally so email links are testable before deploy.
  if (fromClient && isLocalOrigin(fromClient)) return fromClient;
  // Prefer client-facing origin (verified custom domain) over the platform secret.
  if (fromClient && !/vercel\.app/i.test(fromClient)) return fromClient;
  if (fromSecret) return fromSecret;
  return fromClient || fromSecret || '';
}

function buildGalleryLink(origin: string, slug: string, accessToken: string): string {
  return `${origin}/e/${encodeURIComponent(slug)}/g/${encodeURIComponent(accessToken)}`;
}

function textToHtmlParagraphs(text: string): string {
  return escapeHtml(text)
    .split('\n')
    .map((line) =>
      line.trim()
        ? `<p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:#555;text-align:center;">${line}</p>`
        : ''
    )
    .filter(Boolean)
    .join('');
}

function buildDeliveryEmailHtml(options: {
  eventName: string;
  guestName: string;
  messageHtml: string;
  galleryLink: string;
  coverUrl: string | null;
}): string {
  const { eventName, guestName, messageHtml, galleryLink, coverUrl } = options;
  const displayEvent = escapeHtml((eventName || 'Your Event').toUpperCase());

  const coverBlock = coverUrl
    ? `<img src="${escapeHtml(coverUrl)}" alt="${displayEvent}" width="280" height="160" style="display:block;width:100%;max-width:280px;height:160px;object-fit:cover;margin:0 auto 24px;" />`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(eventName)} — Your Photos</title>
</head>
<body style="margin:0;padding:0;background-color:#eceae6;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#eceae6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:420px;background-color:#ffffff;padding:40px 32px 32px;">
          <tr>
            <td style="text-align:center;">
              <p style="margin:0 0 12px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#888;font-family:Arial,Helvetica,sans-serif;">${displayEvent}</p>
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:400;color:#333;line-height:1.35;font-family:Georgia,'Times New Roman',serif;">Hi ${escapeHtml(guestName)}, your photos are ready</h1>
              ${coverBlock}
              <div style="margin-bottom:28px;">${messageHtml}</div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 32px;">
                <tr>
                  <td align="center" style="background-color:#3a3a3a;">
                    <a href="${galleryLink}" style="display:block;padding:14px 24px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;">View My Photos</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:12px;color:#aaa;font-family:Arial,Helvetica,sans-serif;">Questions? Reply to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { eventId, guestId, sendCopy = false, siteOrigin, accessToken } = await req.json();

    if (!eventId || !guestId) {
      return new Response(JSON.stringify({ error: 'eventId and guestId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    const token =
      authHeader?.replace(/^Bearer\s+/i, '').trim() ||
      String(accessToken || '').trim();

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment is not configured for this function');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Your session expired. Please sign in again.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: event, error: eventError } = await supabaseAdmin
      .from('guest_delivery_events')
      .select('id, name, slug, status, cover_image_url, photographer_id')
      .eq('id', eventId)
      .eq('photographer_id', user.id)
      .maybeSingle();

    if (eventError) throw eventError;
    if (!event) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (event.status !== 'published') {
      return new Response(JSON.stringify({ error: 'Event must be published before sending delivery emails' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: guest, error: guestError } = await supabaseAdmin
      .from('event_guests')
      .select('id, name, email, access_token, matched_photo_count, delivery_status')
      .eq('id', guestId)
      .eq('event_id', eventId)
      .maybeSingle();

    if (guestError) throw guestError;
    if (!guest) {
      return new Response(JSON.stringify({ error: 'Guest not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!guest.email) {
      return new Response(JSON.stringify({ error: 'Guest has no email address' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if ((guest.matched_photo_count || 0) < 1) {
      return new Response(JSON.stringify({ error: 'Guest has no matched photos to deliver' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: photographer } = await supabaseAdmin
      .from('photographers')
      .select('email, contact_email, display_name, business_name, first_name, last_name')
      .eq('id', user.id)
      .maybeSingle();

    let photographerEmail =
      photographer?.contact_email?.trim() ||
      photographer?.email?.trim() ||
      user.email?.trim() ||
      '';

    if (!photographerEmail) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id);
      photographerEmail = authUser?.user?.email?.trim() || '';
    }

    const photographerName =
      photographer?.business_name?.trim() ||
      [photographer?.first_name, photographer?.last_name].filter(Boolean).join(' ').trim() ||
      photographer?.display_name?.trim() ||
      'Your photographer';

    const origin = resolveSiteOrigin(siteOrigin);
    if (!origin) {
      return new Response(
        JSON.stringify({
          error:
            'Public site URL is not configured. Set PUBLIC_SITE_URL in Supabase Edge Function secrets (e.g. https://pixnxt.com), then redeploy.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const galleryLink = buildGalleryLink(origin, event.slug, guest.access_token);
    const photoCount = guest.matched_photo_count || 0;
    const eventName = event.name || 'Your event';
    const guestName = guest.name || 'there';

    const mailMessage = [
      `${photographerName} found ${photoCount} photo${photoCount === 1 ? '' : 's'} of you from ${eventName}.`,
      '',
      'Tap the button below to view and download your personal gallery.',
    ].join('\n');

    const subject = `Your photos from ${eventName} are ready`;
    const plainBody = [
      `Hi ${guestName},`,
      '',
      mailMessage,
      '',
      'View My Photos:',
      galleryLink,
      '',
      'Questions? Reply to this email.',
    ].join('\n');

    const html = buildDeliveryEmailHtml({
      eventName,
      guestName,
      messageHtml: textToHtmlParagraphs(mailMessage),
      galleryLink,
      coverUrl: event.cover_image_url || null,
    });

    const smtpConfig = {
      hostname: Deno.env.get('SMTP_HOST') || '',
      port: parseInt(Deno.env.get('SMTP_PORT') || '465', 10),
      username: Deno.env.get('SMTP_USER') || '',
      password: Deno.env.get('SMTP_PASS') || '',
    };
    const fromEmail = (Deno.env.get('SMTP_FROM') || smtpConfig.username).trim();

    if (!smtpConfig.hostname || !smtpConfig.username || !fromEmail) {
      return new Response(JSON.stringify({ error: 'Email is not configured on the server' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const client = new SmtpClient();
    try {
      await client.connectTLS(smtpConfig);
      await client.send({
        from: formatFromAddress(photographerName, fromEmail),
        to: guest.email.trim().toLowerCase(),
        bcc: sendCopy && photographerEmail ? photographerEmail : undefined,
        subject,
        content: plainBody,
        html,
        headers: {
          'Reply-To': photographerEmail || fromEmail,
        },
      });
    } finally {
      await client.close();
    }

    const now = new Date().toISOString();
    await supabaseAdmin
      .from('event_guests')
      .update({
        delivery_status: 'sent',
        delivery_email_sent_at: now,
        updated_at: now,
      })
      .eq('id', guest.id);

    return new Response(JSON.stringify({ ok: true, to: guest.email, galleryLink }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-guest-delivery-email:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to send email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
