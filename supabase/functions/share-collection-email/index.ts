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

function formatPersonalMessageToHtml(message: string): string {
  return message
    .split('\n\n')
    .map((p) => {
      const lines = p.split('\n').map(line => escapeHtml(line.trim())).join('<br />');
      return `<p style="margin:0 0 1.4em;font-size:15px;line-height:1.6;color:#4b5563;font-family:Arial,Helvetica,sans-serif;">${lines}</p>`;
    })
    .join('\n');
}

function buildShareCollectionEmailHtml(options: {
  photographerBrandName: string;
  collectionName: string;
  coverUrl: string | null;
  personalMessageHtml: string;
  shareUrl: string;
}): string {
  const { photographerBrandName, collectionName, coverUrl, personalMessageHtml, shareUrl } = options;

  const coverBlock = coverUrl
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#ffffff;text-align:center;">
        <tr>
          <td style="padding:0;">
            <img src="${escapeHtml(coverUrl)}" alt="Collection Cover" style="width:100%;max-width:100%;height:360px;object-fit:cover;display:block;" />
          </td>
        </tr>
      </table>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f0f0f0;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0f0f0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);border:1px solid #e5e5e0;">
          <!-- Brand Logo/Header -->
          <tr>
            <td style="padding:40px 24px 20px;text-align:center;">
              <span style="font-size:13px;font-weight:600;letter-spacing:0.2em;color:#71717a;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">
                ${escapeHtml(photographerBrandName)}
              </span>
            </td>
          </tr>
          <!-- Main Title Block -->
          <tr>
            <td style="padding:0 24px 30px;text-align:center;">
              <h1 style="font-size:32px;font-weight:400;letter-spacing:0.12em;margin:0;color:#18181b;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">
                ${escapeHtml(collectionName)}
              </h1>
            </td>
          </tr>
          <!-- Cover image -->
          <tr>
            <td style="padding:0;">
              ${coverBlock}
            </td>
          </tr>
          <!-- Body Text -->
          <tr>
            <td style="padding:40px 48px;font-size:15px;line-height:1.6;color:#4b5563;text-align:left;">
              ${personalMessageHtml}
            </td>
          </tr>
          <!-- CTA Button -->
          <tr>
            <td style="padding:0 48px 48px;text-align:center;">
              <a href="${escapeHtml(shareUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#111;color:#ffffff;padding:14px 40px;border-radius:24px;font-size:13px;font-weight:600;text-decoration:none;letter-spacing:0.08em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">
                View Gallery
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#faf9f6;border-top:1px solid #f4f3f0;padding:24px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#a1a1aa;line-height:1.5;font-family:Arial,Helvetica,sans-serif;">
                Powered by PixNxt. &copy; ${new Date().getFullYear()} ${escapeHtml(photographerBrandName)}.
              </p>
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
    const { collectionSlug, recipientEmail, senderEmail, personalMessage, subject } = await req.json();

    if (!collectionSlug || !recipientEmail) {
      return new Response(JSON.stringify({ error: 'collectionSlug and recipientEmail are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch collection info
    const { data: collection, error: colError } = await supabaseAdmin
      .from('collections')
      .select('id, name, slug, cover_url, photographer_id')
      .eq('slug', collectionSlug)
      .maybeSingle();

    if (colError) throw colError;
    if (!collection) {
      return new Response(JSON.stringify({ error: 'Collection not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch photographer info
    const { data: photographer, error: photogError } = await supabaseAdmin
      .from('photographers')
      .select('display_name, business_name, email')
      .eq('id', collection.photographer_id)
      .maybeSingle();

    if (photogError) throw photogError;

    const photographerBrandName = photographer?.business_name || photographer?.display_name || 'KAVI';
    const collectionName = collection.name || 'Collection';
    const coverUrl = collection.cover_url || null;

    // Build URLs
    const requestOrigin = req.headers.get('origin') || Deno.env.get('PUBLIC_SITE_URL') || '';
    const origin = requestOrigin.replace(/\/$/, '');
    const shareUrl = `${origin}/gallery/${collection.slug}`;

    const personalMessageHtml = formatPersonalMessageToHtml(personalMessage || '');
    const emailHtml = buildShareCollectionEmailHtml({
      photographerBrandName,
      collectionName,
      coverUrl,
      personalMessageHtml,
      shareUrl,
    });

    const smtpConfig = {
      hostname: Deno.env.get('SMTP_HOST') || '',
      port: parseInt(Deno.env.get('SMTP_PORT') || '465', 10),
      username: Deno.env.get('SMTP_USER') || '',
      password: Deno.env.get('SMTP_PASS') || '',
    };

    if (!smtpConfig.hostname || !smtpConfig.username) {
      return new Response(JSON.stringify({ error: 'Email is not configured on the server' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const client = new SmtpClient();
    try {
      await client.connectTLS(smtpConfig);
      await client.send({
        from: smtpConfig.username,
        to: recipientEmail,
        subject: subject || `Photos from ${collectionName} are ready`,
        content: personalMessage || '',
        html: emailHtml,
      });
    } finally {
      await client.close();
    }

    return new Response(JSON.stringify({ ok: true, to: recipientEmail }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('share-collection-email:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to send email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
