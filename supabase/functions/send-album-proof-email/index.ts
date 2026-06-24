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

type PhotoCommentRow = {
  spread_label?: string;
  message?: string;
};

type SwapRequestRow = {
  from_label?: string;
  to_label?: string;
};

type SpreadCommentRow = {
  spread_index?: number;
  author_name?: string;
  body?: string;
  created_at?: string;
  updated_at?: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const COUNTRY_DIAL_CODES: Record<string, string> = {
  US: '1',
  CA: '1',
  UK: '44',
  AU: '61',
  IN: '91',
};

function inferCountryFromTimeZone(timeZone?: string | null): string | null {
  const tz = (timeZone || '').toLowerCase();
  if (!tz) return null;
  if (tz.includes('kolkata') || tz.includes('india') || tz.includes('calcutta') || tz.includes('ist')) {
    return 'IN';
  }
  if (tz.includes('pacific') || tz.includes('eastern') || tz.includes('america/')) {
    return 'US';
  }
  if (tz.includes('london') || tz.includes('europe/london')) {
    return 'UK';
  }
  if (tz.includes('australia') || tz.includes('sydney')) {
    return 'AU';
  }
  return null;
}

function isIndianMobile(digits: string): boolean {
  return /^[6-9]\d{9}$/.test(digits);
}

function normalizeWhatsAppPhone(
  phone: string,
  businessCountry?: string | null,
  timeZone?: string | null
): string | null {
  let digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  // Local trunk prefix, e.g. 08056361226 → 8056361226
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (digits.length >= 11) return digits;

  const country =
    (businessCountry || '').trim().toUpperCase() ||
    inferCountryFromTimeZone(timeZone) ||
    (isIndianMobile(digits) ? 'IN' : '');

  const dialCode = COUNTRY_DIAL_CODES[country];
  if (dialCode && digits.length === 10) {
    return `${dialCode}${digits}`;
  }

  if (isIndianMobile(digits)) {
    return `91${digits}`;
  }

  return digits.length >= 10 ? digits : null;
}

type WhatsAppSendResult = { ok: boolean; messageId?: string; error?: string; errorCode?: number };

/** Meta sandbox templates ship with fixed body text — no parameters. */
const ZERO_PARAM_TEMPLATES = new Set(['hello_world', 'jaspers_market_order_confirmation']);

const WHATSAPP_TEMPLATE_FALLBACKS = ['hello_world', 'jaspers_market_order_confirmation'];
const WHATSAPP_LANG_FALLBACKS = ['en_US', 'en'];

function whatsAppTemplateParamCount(templateName: string, configuredCount: number | null): number {
  if (configuredCount !== null) return configuredCount;
  if (ZERO_PARAM_TEMPLATES.has(templateName)) return 0;
  return 5;
}

async function listWhatsAppTemplateNames(accessToken: string, wabaId: string): Promise<string[]> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v25.0/${wabaId}/message_templates?limit=50&fields=name,language,status`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await response.json();
    if (!response.ok) {
      console.error('send-album-proof-email: could not list WhatsApp templates:', data);
      return [];
    }
    return (data?.data || []).map(
      (t: { name?: string; language?: string; status?: string }) =>
        `${t.name || '?'} (${t.language || '?'}) [${t.status || '?'}]`
    );
  } catch (err) {
    console.error('send-album-proof-email: list templates failed:', err);
    return [];
  }
}

async function verifyWhatsAppPhoneAccess(
  accessToken: string,
  phoneNumberId: string
): Promise<{ ok: boolean; displayPhone?: string; error?: string }> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v25.0/${phoneNumberId}?fields=display_phone_number,verified_name`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await response.json();
    if (!response.ok) {
      const msg = data?.error?.message || 'Token cannot access this phone number ID';
      return { ok: false, error: msg };
    }
    return {
      ok: true,
      displayPhone: data?.display_phone_number || data?.verified_name || phoneNumberId,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'verify failed' };
  }
}

async function sendWhatsAppTemplateMessage(
  toPhone: string,
  templateName: string,
  languageCode: string,
  bodyParameters: string[]
): Promise<WhatsAppSendResult> {
  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN') || '';
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || '';

  if (!accessToken || !phoneNumberId) {
    return { ok: false, error: 'WhatsApp is not configured on the server' };
  }

  const template: Record<string, unknown> = {
    name: templateName,
    language: { code: languageCode },
  };

  const params = bodyParameters.map((text) => ({ type: 'text', text: text.slice(0, 1024) }));
  if (params.length) {
    template.components = [{ type: 'body', parameters: params }];
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toPhone,
          type: 'template',
          template,
        }),
      }
    );

    const respData = await response.json();
    if (!response.ok) {
      const errCode = respData?.error?.code as number | undefined;
      const errMsg =
        typeof respData?.error?.message === 'string'
          ? respData.error.message
          : 'WhatsApp API request failed';
      return { ok: false, error: errMsg, errorCode: errCode };
    }

    const messageId = respData?.messages?.[0]?.id as string | undefined;
    return { ok: true, messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'WhatsApp fetch failed';
    return { ok: false, error: message };
  }
}

async function sendWhatsAppTemplateWithFallback(
  toPhone: string,
  preferredTemplate: string,
  preferredLang: string,
  bodyParameters: string[]
): Promise<WhatsAppSendResult & { template?: string; language?: string }> {
  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN') || '';
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || '';
  const wabaId = Deno.env.get('WHATSAPP_BUSINESS_ACCOUNT_ID') || '1892297801470358';

  const phoneCheck = await verifyWhatsAppPhoneAccess(accessToken, phoneNumberId);
  if (!phoneCheck.ok) {
    const msg = `WHATSAPP_ACCESS_TOKEN is invalid or does not match WHATSAPP_PHONE_NUMBER_ID — copy a fresh token from Meta API Setup: ${phoneCheck.error}`;
    console.error('send-album-proof-email:', msg);
    return { ok: false, error: msg };
  }
  console.log('send-album-proof-email: WhatsApp phone verified:', phoneCheck.displayPhone);

  const templatesToTry = [
    preferredTemplate,
    ...WHATSAPP_TEMPLATE_FALLBACKS.filter((t) => t !== preferredTemplate),
  ];

  for (const templateName of templatesToTry) {
    const paramCount = whatsAppTemplateParamCount(templateName, null);
    const params = bodyParameters.slice(0, paramCount);
    const langsToTry =
      templateName === preferredTemplate
        ? [preferredLang, ...WHATSAPP_LANG_FALLBACKS.filter((l) => l !== preferredLang)]
        : WHATSAPP_LANG_FALLBACKS;

    for (const tryLang of langsToTry) {
      console.log('send-album-proof-email: WhatsApp request', {
        phoneNumberId,
        template: templateName,
        language: tryLang,
        paramCount: params.length,
        to: toPhone,
      });

      const result = await sendWhatsAppTemplateMessage(toPhone, templateName, tryLang, params);
      if (result.ok) {
        console.log('send-album-proof-email: WhatsApp sent', {
          messageId: result.messageId,
          template: templateName,
          language: tryLang,
          to: toPhone,
        });
        return { ...result, template: templateName, language: tryLang };
      }

      if (result.errorCode !== 132001) {
        console.error('send-album-proof-email WhatsApp error:', result.error);
        return result;
      }
      console.warn(
        `send-album-proof-email: template "${templateName}" (${tryLang}) not found, trying next...`
      );
    }
  }

  const available = await listWhatsAppTemplateNames(accessToken, wabaId);
  const msg =
    `(#132001) No WhatsApp template worked. Available on your account: [${available.join(', ') || 'none — token may be wrong'}]. ` +
    'Copy WHATSAPP_ACCESS_TOKEN from Meta → API Setup (same page as Phone number ID 1152342977957303).';
  console.error('send-album-proof-email:', msg);
  return { ok: false, error: msg, errorCode: 132001 };
}

function buildClientStartedWhatsAppTemplateParams(options: {
  photographerName: string;
  clientName: string;
  albumName: string;
  startedAt: string;
  editorUrl: string;
}): string[] {
  const { photographerName, clientName, albumName, startedAt, editorUrl } = options;
  return [
    photographerName || 'Photographer',
    clientName,
    albumName,
    startedAt,
    editorUrl,
  ];
}

function spreadLabel(spreadIndex: number): string {
  return spreadIndex <= 0 ? 'Cover' : `Spread ${spreadIndex}`;
}

function formatWhen(iso?: string, timeZone?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };
  const tz = timeZone?.trim();
  if (tz) {
    return d.toLocaleString('en-US', { ...opts, timeZone: tz });
  }
  return d.toLocaleString('en-US', opts);
}

function buildApproveEmailHtml(options: {
  photographerName: string;
  albumName: string;
  guestName: string;
  guestEmail: string | null;
  approvedAt: string;
  editorUrl: string;
}): string {
  const { photographerName, albumName, guestName, guestEmail, approvedAt, editorUrl } = options;
  const guestLine = guestEmail
    ? `${escapeHtml(guestName)} (${escapeHtml(guestEmail)})`
    : escapeHtml(guestName);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f0f0f0;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0f0f0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:36px 40px 32px;text-align:left;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#999;">${escapeHtml(photographerName)}</p>
              <h1 style="margin:0 0 20px;font-size:20px;font-weight:700;letter-spacing:0.5px;color:#111;line-height:1.3;">Album approved for binding</h1>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:#166534;">Your client has approved the final album and confirmed it is ready for production.</p>
                    <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#111;">${escapeHtml(albumName)}</p>
                    <p style="margin:0 0 4px;font-size:14px;line-height:1.5;color:#444;">Approved by ${guestLine}</p>
                    <p style="margin:8px 0 0;font-size:12px;color:#666;">${escapeHtml(approvedAt)}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;">No further client changes are expected. You may proceed with binding and delivery.</p>
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius:6px;background:#111;">
                    <a href="${escapeHtml(editorUrl)}" style="display:inline-block;padding:14px 28px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#ffffff;text-decoration:none;">Open album in editor</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:#aaa;text-align:center;">Sent by PIXNXT</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildChangesEmailHtml(options: {
  photographerName: string;
  albumName: string;
  guestName: string;
  guestEmail: string | null;
  photoComments: PhotoCommentRow[];
  swapRequests: SwapRequestRow[];
  spreadComments: SpreadCommentRow[];
  editorUrl: string;
  timeZone?: string;
}): string {
  const {
    photographerName,
    albumName,
    guestName,
    guestEmail,
    photoComments,
    swapRequests,
    spreadComments,
    editorUrl,
    timeZone,
  } = options;

  const guestLine = guestEmail
    ? `${escapeHtml(guestName)} (${escapeHtml(guestEmail)})`
    : escapeHtml(guestName);

  const photoBlocks = photoComments
    .map(
      (row) => `<p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#333;">
        <strong style="color:#111;">${escapeHtml(row.spread_label || 'Photo')}</strong><br/>
        ${escapeHtml(String(row.message || '').trim())}
      </p>`
    )
    .join('');

  const swapBlocks = swapRequests
    .map(
      (row) => `<p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#333;">
        <strong style="color:#111;">${escapeHtml(row.from_label || 'Photo A')}</strong>
        <span style="color:#888;"> ↔ </span>
        <strong style="color:#111;">${escapeHtml(row.to_label || 'Photo B')}</strong>
      </p>`
    )
    .join('');

  const grouped = new Map<number, SpreadCommentRow[]>();
  spreadComments.forEach((row) => {
    const spreadIndex = Number(row.spread_index ?? 0);
    if (!grouped.has(spreadIndex)) grouped.set(spreadIndex, []);
    grouped.get(spreadIndex)!.push(row);
  });

  const spreadBlocks = [...grouped.entries()]
    .sort(([a], [b]) => a - b)
    .map(([spreadIndex, items]) => {
      const rows = items
        .map(
          (item) => `<p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#333;">
            <strong style="color:#111;">${escapeHtml(item.author_name || guestName)}</strong>
            <span style="color:#999;"> · ${escapeHtml(formatWhen(item.updated_at || item.created_at, timeZone))}</span><br/>
            ${escapeHtml(String(item.body || '').trim())}
          </p>`
        )
        .join('');
      return `<tr>
        <td style="padding:0 0 16px;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#888;">${escapeHtml(spreadLabel(spreadIndex))}</p>
          <div style="padding:14px 16px;background:#f7f7f7;border-radius:8px;border-left:3px solid #8b7aa8;">
            ${rows}
          </div>
        </td>
      </tr>`;
    })
    .join('');

  const section = (title: string, body: string) =>
    body
      ? `<tr><td style="padding:0 0 20px;">
          <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#888;">${escapeHtml(title)}</p>
          <div style="padding:14px 16px;background:#fafafa;border-radius:8px;border:1px solid #eee;">${body}</div>
        </td></tr>`
      : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f0f0f0;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0f0f0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:36px 40px 32px;text-align:left;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#999;">${escapeHtml(photographerName)}</p>
              <h1 style="margin:0 0 20px;font-size:20px;font-weight:700;letter-spacing:0.5px;color:#111;line-height:1.3;">Album change request submitted</h1>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;background:#fafafa;border:1px solid #eee;border-radius:10px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:#666;">Your client submitted feedback for review:</p>
                    <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#111;">${escapeHtml(albumName)}</p>
                    <p style="margin:0;font-size:14px;line-height:1.5;color:#444;">From ${guestLine}</p>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                ${section('Photo comments', photoBlocks)}
                ${section('Swap requests', swapBlocks)}
                ${spreadBlocks}
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius:6px;background:#111;">
                    <a href="${escapeHtml(editorUrl)}" style="display:inline-block;padding:14px 28px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#ffffff;text-decoration:none;">Review in album editor</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:#aaa;text-align:center;">Sent by PIXNXT</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildClientStartedEmailHtml(options: {
  photographerName: string;
  albumName: string;
  guestName: string;
  guestEmail: string | null;
  startedAt: string;
  editorUrl: string;
}): string {
  const { photographerName, albumName, guestName, guestEmail, startedAt, editorUrl } = options;
  const guestLine = guestEmail
    ? `${escapeHtml(guestName)} (${escapeHtml(guestEmail)})`
    : escapeHtml(guestName);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f0f0f0;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0f0f0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:36px 40px 32px;text-align:left;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#999;">${escapeHtml(photographerName)}</p>
              <h1 style="margin:0 0 20px;font-size:20px;font-weight:700;letter-spacing:0.5px;color:#111;line-height:1.3;">Client started commenting</h1>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;background:#fafafa;border:1px solid #eee;border-radius:10px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:#666;">A client opened your shared album preview and left their first comment or swap request:</p>
                    <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#111;">${escapeHtml(albumName)}</p>
                    <p style="margin:0 0 4px;font-size:14px;line-height:1.5;color:#444;">${guestLine}</p>
                    <p style="margin:8px 0 0;font-size:12px;color:#666;">${escapeHtml(startedAt)}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;">You will receive this alert only once per album. Open the editor to review new feedback as it comes in.</p>
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius:6px;background:#111;">
                    <a href="${escapeHtml(editorUrl)}" style="display:inline-block;padding:14px 28px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#ffffff;text-decoration:none;">Open album in editor</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:#aaa;text-align:center;">Sent by PIXNXT</p>
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
    const body = await req.json();
    const {
      albumId,
      action,
      guestName,
      guestEmail,
      siteOrigin,
      photoComments = [],
      swapRequests = [],
      spreadComments = [],
      clientTimezone,
    } = body;

    if (!albumId) {
      return new Response(JSON.stringify({ error: 'albumId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action !== 'approve' && action !== 'submit_changes' && action !== 'client_started_commenting') {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: album, error: albumError } = await supabaseAdmin
      .from('smart_albums')
      .select(
        'id, name, status, photographer_id, client_commenting_started_at, client_commenting_started_by'
      )
      .eq('id', albumId)
      .maybeSingle();

    if (albumError) throw albumError;
    if (!album) {
      return new Response(JSON.stringify({ error: 'Album not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'client_started_commenting' && album.client_commenting_started_at) {
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: true,
          alreadyNotified: true,
          notifiedAt: album.client_commenting_started_at,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const photoRows: PhotoCommentRow[] = (Array.isArray(photoComments) ? photoComments : []).filter(
      (row) => String(row?.message || '').trim()
    );
    const swapRows: SwapRequestRow[] = (Array.isArray(swapRequests) ? swapRequests : []).filter(
      (row) => String(row?.from_label || '').trim() && String(row?.to_label || '').trim()
    );
    let spreadRows: SpreadCommentRow[] = (Array.isArray(spreadComments) ? spreadComments : []).filter(
      (row) => String(row?.body || '').trim()
    );

    if (action === 'submit_changes') {
      if (!photoRows.length && !swapRows.length && !spreadRows.length) {
        const { data: dbComments, error: commentsError } = await supabaseAdmin
          .from('smart_album_comments')
          .select('spread_index, author_name, body, created_at, updated_at, parent_id')
          .eq('album_id', albumId)
          .is('parent_id', null)
          .order('spread_index', { ascending: true });

        if (commentsError) throw commentsError;
        spreadRows = (dbComments || []).filter((row) => String(row.body || '').trim());
      }

      if (!photoRows.length && !swapRows.length && !spreadRows.length) {
        return new Response(JSON.stringify({ error: 'No comments or swap requests to send' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { data: photographerRow } = await supabaseAdmin
      .from('photographers')
      .select('email, display_name, phone, business_country, time_zone')
      .eq('id', album.photographer_id)
      .maybeSingle();

    let photographerEmail = photographerRow?.email?.trim() || '';
    if (!photographerEmail) {
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(
        album.photographer_id
      );
      if (authError) throw authError;
      photographerEmail = authUser?.user?.email?.trim() || '';
    }

    if (!photographerEmail) {
      return new Response(JSON.stringify({ error: 'Photographer email not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const photographer = {
      email: photographerEmail,
      display_name: photographerRow?.display_name || null,
      phone: photographerRow?.phone?.trim() || null,
      business_country: photographerRow?.business_country?.trim() || null,
      time_zone: photographerRow?.time_zone?.trim() || null,
    };

    const origin = (siteOrigin || Deno.env.get('PUBLIC_SITE_URL') || '').replace(/\/$/, '');
    const editorUrl = `${origin}/smart-albums/album/${albumId}`;
    const clientName = String(guestName || spreadRows[0]?.author_name || 'A client').trim();
    const timeZone =
      typeof clientTimezone === 'string' && clientTimezone.trim() ? clientTimezone.trim() : undefined;
    const approvedAt = formatWhen(new Date().toISOString(), timeZone);
    const startedAt = formatWhen(new Date().toISOString(), timeZone);

    let subject = '';
    let plainBody = '';
    let html = '';

    if (action === 'client_started_commenting') {
      subject = `Client started commenting — ${album.name || 'Album'}`;
      plainBody = [
        `Hi ${photographer.display_name || 'Photographer'},`,
        '',
        `${clientName} started leaving feedback on "${album.name}" via your shared preview link.`,
        '',
        'This is a one-time alert for the first comment or swap request on this album.',
        '',
        `Started on: ${startedAt}`,
        `Open album: ${editorUrl}`,
      ].join('\n');
      html = buildClientStartedEmailHtml({
        photographerName: photographer.display_name || 'Photographer',
        albumName: album.name || 'Album',
        guestName: clientName,
        guestEmail: guestEmail?.trim() || null,
        startedAt,
        editorUrl,
      });
    } else if (action === 'approve') {
      subject = `Album approved for binding — ${album.name || 'Album'}`;
      plainBody = [
        `Hi ${photographer.display_name || 'Photographer'},`,
        '',
        `${clientName} has approved "${album.name}" for binding.`,
        '',
        'The client confirmed the album is final and ready for production. No further changes are expected.',
        '',
        `Approved on: ${approvedAt}`,
        `Open album: ${editorUrl}`,
      ].join('\n');
      html = buildApproveEmailHtml({
        photographerName: photographer.display_name || 'Photographer',
        albumName: album.name || 'Album',
        guestName: clientName,
        guestEmail: guestEmail?.trim() || null,
        approvedAt,
        editorUrl,
      });
    } else {
      subject = `Album change request — ${album.name || 'Album'}`;
      plainBody = [
        `Hi ${photographer.display_name || 'Photographer'},`,
        '',
        `${clientName} submitted change requests for "${album.name}".`,
        '',
        ...(photoRows.length
          ? ['Photo comments:', ...photoRows.map((r) => `- ${r.spread_label}: ${r.message}`), '']
          : []),
        ...(swapRows.length
          ? ['Swap requests:', ...swapRows.map((r) => `- ${r.from_label} ↔ ${r.to_label}`), '']
          : []),
        ...(spreadRows.length
          ? [
              'Spread comments:',
              ...spreadRows.map(
                (r) =>
                  `- ${spreadLabel(Number(r.spread_index ?? 0))}: ${String(r.body || '').trim()}`
              ),
              '',
            ]
          : []),
        `Review album: ${editorUrl}`,
      ].join('\n');
      html = buildChangesEmailHtml({
        photographerName: photographer.display_name || 'Photographer',
        albumName: album.name || 'Album',
        guestName: clientName,
        guestEmail: guestEmail?.trim() || null,
        photoComments: photoRows,
        swapRequests: swapRows,
        spreadComments: spreadRows,
        editorUrl,
        timeZone,
      });
    }

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
        to: photographer.email,
        subject,
        content: plainBody,
        html,
      });
    } finally {
      await client.close();
    }

    let whatsappResult:
      | { sent: true; to: string; messageId?: string; template?: string }
      | { sent: false; skipped?: string; error?: string; to?: string } = { sent: false };

    if (action === 'client_started_commenting') {
      const templateName =
        Deno.env.get('WHATSAPP_CLIENT_STARTED_TEMPLATE') ||
        (Deno.env.get('WHATSAPP_ACCESS_TOKEN') ? 'hello_world' : '');
      const templateLang = Deno.env.get('WHATSAPP_CLIENT_STARTED_TEMPLATE_LANG') || 'en_US';
      const normalizedPhone = photographer.phone
        ? normalizeWhatsAppPhone(
            photographer.phone,
            photographer.business_country,
            photographer.time_zone
          )
        : null;

      if (!templateName) {
        console.warn(
          'send-album-proof-email: WhatsApp skipped — set WHATSAPP_CLIENT_STARTED_TEMPLATE in Edge Function secrets'
        );
        whatsappResult = { sent: false, skipped: 'no_template' };
      } else if (!photographer.phone) {
        console.warn('send-album-proof-email: WhatsApp skipped — photographer has no phone on profile');
        whatsappResult = { sent: false, skipped: 'no_phone' };
      } else if (!normalizedPhone) {
        console.warn(
          `send-album-proof-email: WhatsApp skipped — invalid phone "${photographer.phone}"`
        );
        whatsappResult = { sent: false, skipped: 'invalid_phone', to: photographer.phone };
      } else {
        const templateParams = buildClientStartedWhatsAppTemplateParams({
          photographerName: photographer.display_name || 'Photographer',
          clientName,
          albumName: album.name || 'Album',
          startedAt,
          editorUrl,
        });
        const paramCountRaw = Deno.env.get('WHATSAPP_CLIENT_STARTED_TEMPLATE_PARAM_COUNT');
        const configuredParamCount =
          paramCountRaw === '' || paramCountRaw === undefined
            ? null
            : Math.max(0, parseInt(paramCountRaw, 10) || 0);
        const paramCount = whatsAppTemplateParamCount(templateName, configuredParamCount);
        const bodyParams = templateParams.slice(0, paramCount);
        console.log(
          `send-album-proof-email: sending WhatsApp to ${normalizedPhone} (raw: ${photographer.phone}), preferred template "${templateName}"`
        );
        const sendResult = await sendWhatsAppTemplateWithFallback(
          normalizedPhone,
          templateName,
          templateLang,
          bodyParams
        );
        if (sendResult.ok) {
          whatsappResult = {
            sent: true,
            to: normalizedPhone,
            messageId: sendResult.messageId,
            template: sendResult.template || templateName,
          };
          console.log(
            `WhatsApp template sent to ${normalizedPhone} for album ${albumId} (messageId: ${sendResult.messageId || 'n/a'}, template: ${sendResult.template})`
          );
        } else {
          whatsappResult = { sent: false, error: sendResult.error, to: normalizedPhone };
          console.error('send-album-proof-email: WhatsApp failed:', sendResult.error);
        }
      }
      console.log('send-album-proof-email: whatsapp result:', whatsappResult);
    }

    const proofPatch =
      action === 'approve'
        ? {
            client_approved_at: new Date().toISOString(),
            client_approved_by: clientName,
          }
        : action === 'client_started_commenting'
          ? {
              client_commenting_started_at: new Date().toISOString(),
              client_commenting_started_by: clientName,
            }
          : {
              client_changes_submitted_at: new Date().toISOString(),
              client_changes_submitted_by: clientName,
            };

    const { error: proofUpdateError } = await supabaseAdmin
      .from('smart_albums')
      .update(proofPatch)
      .eq('id', albumId);

    if (proofUpdateError) {
      console.warn('send-album-proof-email: could not persist proof timestamp', proofUpdateError.message);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        action,
        to: photographer.email,
        whatsapp: whatsappResult,
        photoCount: photoRows.length,
        swapCount: swapRows.length,
        commentCount: spreadRows.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('send-album-proof-email:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to send email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
