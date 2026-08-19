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
    '',
  );
  const fromClient = String(siteOrigin || '').replace(/\/$/, '');

  if (fromClient && isLocalOrigin(fromClient)) return fromClient;
  if (fromSecret) return fromSecret;
  if (fromClient && !/vercel\.app/i.test(fromClient)) return fromClient;
  return fromClient || fromSecret || '';
}

function buildSelectionEmailHtml(message: string, chooseUrl: string): string {
  const lines = String(message || '').split('\n');
  const linkHref = String(chooseUrl || '').trim();

  const bodyHtml = lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';

      const isLinkLine =
        linkHref &&
        (trimmed === linkHref.replace(/^https?:\/\//, '') ||
          trimmed.includes('/choose') ||
          trimmed.startsWith('http'));

      if (isLinkLine) {
        const href = trimmed.startsWith('http') ? trimmed : linkHref || `https://${trimmed}`;
        return `<p style="margin:0 0 14px;font-size:14px;line-height:1.65;"><a href="${escapeHtml(href)}" style="color:#d67d3a;text-decoration:none;">${escapeHtml(trimmed.replace(/^https?:\/\//, ''))}</a></p>`;
      }

      return `<p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:#333;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(trimmed)}</p>`;
    })
    .filter(Boolean)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f0f0f0;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0f0f0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;padding:36px 32px;">
          <tr>
            <td>${bodyHtml}</td>
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
    const {
      collectionSlug,
      recipientEmail,
      subject,
      message,
      chooseUrl,
      siteOrigin,
      accessToken,
    } = await req.json();

    if (!collectionSlug || !recipientEmail || !message) {
      return new Response(JSON.stringify({ error: 'collectionSlug, recipientEmail, and message are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim() || String(accessToken || '').trim();

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

    const { data: collection, error: colError } = await supabaseAdmin
      .from('deliveries')
      .select('id, name, slug, photographer_id')
      .eq('slug', collectionSlug)
      .eq('photographer_id', user.id)
      .maybeSingle();

    if (colError) throw colError;
    if (!collection) {
      return new Response(JSON.stringify({ error: 'Delivery not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: photographer, error: photogError } = await supabaseAdmin
      .from('photographers')
      .select('display_name, business_name, email')
      .eq('id', collection.photographer_id)
      .maybeSingle();

    if (photogError) throw photogError;

    const brandName = photographer?.business_name || photographer?.display_name || 'Your studio';
    const resolvedOrigin = resolveSiteOrigin(siteOrigin);
    const fallbackChooseUrl = resolvedOrigin
      ? `${resolvedOrigin}/g/${encodeURIComponent(collectionSlug)}/choose`
      : '';
    const finalChooseUrl = String(chooseUrl || fallbackChooseUrl).trim();

    const emailHtml = buildSelectionEmailHtml(message, finalChooseUrl);
    const plainText = String(message || '').trim();

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

    const fromAddress = formatFromAddress(brandName, smtpConfig.username);
    const mailSubject = String(subject || '').trim() || `Your list: ${collection.name || 'Selection'}`;

    const client = new SmtpClient();
    try {
      await client.connectTLS(smtpConfig);
      await client.send({
        from: fromAddress,
        to: recipientEmail,
        subject: mailSubject,
        content: plainText,
        html: emailHtml,
      });
    } finally {
      await client.close();
    }

    return new Response(JSON.stringify({ ok: true, to: recipientEmail }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-selection-email:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to send email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
