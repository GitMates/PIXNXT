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

function buildEmailHeaders(options: {
  fromEmail: string;
  photographerEmail: string;
  appId: string;
}): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Priority': '3',
    Importance: 'normal',
    'X-MSMail-Priority': 'Normal',
    Precedence: 'normal',
    'Auto-Submitted': 'no',
    'X-Auto-Response-Suppress': 'All',
    'X-Entity-Ref-ID': `mg-invite-${options.appId}`,
  };

  if (options.photographerEmail) {
    headers['Reply-To'] = options.photographerEmail;
    if (options.photographerEmail.toLowerCase() !== options.fromEmail.toLowerCase()) {
      headers.Sender = options.fromEmail;
    }
  }

  return headers;
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

function resolveInviteOrigin(siteOrigin: string | null | undefined): string {
  const fromSecret = (Deno.env.get('PUBLIC_SITE_URL') || Deno.env.get('VITE_PUBLIC_SITE_URL') || '').replace(
    /\/$/,
    ''
  );
  const fromClient = String(siteOrigin || '').replace(/\/$/, '');

  if (fromSecret) return fromSecret;
  if (fromClient && !isLocalOrigin(fromClient) && !/vercel\.app/i.test(fromClient)) return fromClient;
  return '';
}

function buildInstallLink(origin: string, slug: string): string {
  return `${origin}/m/${encodeURIComponent(slug)}/`;
}

function assertInstallLink(url: string): string {
  if (!/^https?:\/\/[^/\s?#]+\/m\/[^/\s?#]+\/?$/i.test(url)) {
    throw new Error(`Invalid install link generated: ${url}`);
  }
  return url;
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

function buildInviteEmailHtml(options: {
  appName: string;
  messageHtml: string;
  directLink: string;
  iconUrl: string | null;
  websiteLabel: string | null;
  websiteHref: string | null;
}): string {
  const { appName, messageHtml, directLink, iconUrl, websiteLabel, websiteHref } = options;
  const displayName = escapeHtml((appName || 'Gallery').toUpperCase());

  const iconBlock = iconUrl
    ? `<img src="${escapeHtml(iconUrl)}" alt="${displayName}" width="120" height="120" style="display:block;width:120px;height:120px;object-fit:cover;margin:0 auto;" />`
    : `<div style="width:120px;height:120px;margin:0 auto;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;letter-spacing:0.08em;color:#999;">${displayName}</div>`;

  const websiteBlock =
    websiteHref && websiteLabel
      ? `<a href="${escapeHtml(websiteHref)}" style="color:#20a398;text-decoration:none;font-size:13px;">${escapeHtml(websiteLabel)}</a>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(appName)}</title>
</head>
<body style="margin:0;padding:0;background-color:#eceae6;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#eceae6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:400px;background-color:#ffffff;padding:40px 32px 32px;">
          <tr>
            <td style="text-align:center;">
              <p style="margin:0 0 20px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#888;font-family:Arial,Helvetica,sans-serif;">${displayName}</p>
              <h1 style="margin:0 0 28px;font-size:22px;font-weight:400;color:#333;line-height:1.35;font-family:Georgia,'Times New Roman',serif;">Your Mobile Gallery App is Ready</h1>
              <div style="margin:0 auto 28px;width:120px;height:120px;overflow:hidden;">${iconBlock}</div>
              <div style="margin-bottom:28px;">${messageHtml}</div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 32px;">
                <tr>
                  <td align="center" style="background-color:#3a3a3a;">
                    <a href="${directLink}" style="display:block;padding:14px 24px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;">Install App</a>
                  </td>
                </tr>
              </table>
              <div style="font-size:13px;color:#888;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
                <p style="margin:0 0 4px;font-weight:600;color:#555;">${escapeHtml(appName)}</p>
                ${websiteBlock ? `<p style="margin:0 0 4px;">${websiteBlock}</p>` : ''}
                <p style="margin:16px 0 0;font-size:12px;color:#aaa;">Questions? Reply to this email.</p>
              </div>
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      appId,
      recipientEmail,
      subject,
      message,
      sendCopy = false,
      siteOrigin,
      websiteHref = null,
      websiteLabel = null,
    } = await req.json();

    const to = String(recipientEmail || '').trim().toLowerCase();
    const mailSubject = String(subject || '').trim();
    const mailMessage = String(message || '').trim();

    if (!appId || !to || !mailSubject || !mailMessage) {
      return new Response(
        JSON.stringify({ error: 'appId, recipientEmail, subject, and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return new Response(JSON.stringify({ error: 'Invalid recipient email address' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment is not configured for this function');
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.warn('send-mobile-gallery-invite: auth failed', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Your session expired. Please sign in again and retry.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: app, error: appError } = await supabaseAdmin
      .from('mobile_gallery_apps')
      .select('id, name, slug, cover_image_url, icon_url, photographer_id, status')
      .eq('id', appId)
      .eq('photographer_id', user.id)
      .maybeSingle();

    if (appError) throw appError;
    if (!app) {
      return new Response(JSON.stringify({ error: 'App not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (app.status !== 'published' || !app.slug) {
      return new Response(JSON.stringify({ error: 'App must be published before sending install invites' }), {
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

    const origin = resolveInviteOrigin(siteOrigin);
    if (!origin) {
      return new Response(
        JSON.stringify({
          error:
            'Public site URL is not configured. Set PUBLIC_SITE_URL in Supabase Edge Function secrets (e.g. https://pixnxt.com), then redeploy.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const directLink = assertInstallLink(buildInstallLink(origin, app.slug));
    const iconUrl = app.icon_url || app.cover_image_url || null;
    const appName = app.name || 'Gallery';

    const plainBody = [
      `${photographerName} sent you the ${appName} mobile gallery.`,
      '',
      mailMessage,
      '',
      'Install App:',
      directLink,
      '',
      websiteHref && websiteLabel ? `${websiteLabel}: ${websiteHref}` : '',
      '',
      'Questions? Reply to this email.',
    ]
      .filter((line, index, arr) => !(line === '' && arr[index - 1] === ''))
      .join('\n');

    const html = buildInviteEmailHtml({
      appName,
      messageHtml: textToHtmlParagraphs(mailMessage),
      directLink,
      iconUrl,
      websiteHref: websiteHref || null,
      websiteLabel: websiteLabel || null,
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

    const smtpHeaders = buildEmailHeaders({
      fromEmail,
      photographerEmail,
      appId,
    });

    const client = new SmtpClient();
    try {
      await client.connectTLS(smtpConfig);
      await client.send({
        from: formatFromAddress(photographerName, fromEmail),
        to,
        bcc: sendCopy && photographerEmail ? photographerEmail : undefined,
        subject: mailSubject,
        content: plainBody,
        html,
        headers: smtpHeaders,
      });
    } finally {
      await client.close();
    }

    const { error: logError } = await supabaseAdmin.from('mobile_gallery_invites').insert({
      app_id: appId,
      photographer_id: user.id,
      recipient_email: to,
      subject: mailSubject,
      status: 'sent',
    });

    if (logError) {
      console.warn('send-mobile-gallery-invite: could not log invite', logError.message);
    }

    return new Response(JSON.stringify({ ok: true, to, directLink }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-mobile-gallery-invite:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to send email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
