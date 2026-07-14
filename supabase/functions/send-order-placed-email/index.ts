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

function escapeHtml(text: any): string {
  const str = typeof text === 'string' ? text : String(text || '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatSizeLabel(item: any): string {
  const label = item.options?.size?.label || item.options?.size;
  if (label) return String(label);
  if (item.product_type === 'digital_download_all') return 'All Photos';
  if (item.product_type === 'digital_download') return 'High Resolution';
  return 'Default';
}

const DIGITAL_TYPES = ['digital_download', 'digital_download_all'];

const DEFAULT_R2_BASE = 'https://pub-de49e8c7da824ad9af0c9289299d8467.r2.dev';

/** Force file download via Supabase edge fn — site /api/r2-media returns SPA HTML on Vercel. */
function getForcedDownloadUrl(rawUrl: string, filename: string): string {
  if (!rawUrl) return '';

  const r2Base = (Deno.env.get('R2_PUBLIC_URL') || DEFAULT_R2_BASE).replace(/\/+$/, '');
  const supabaseUrl = (Deno.env.get('SUPABASE_URL') || '').replace(/\/+$/, '');
  if (!supabaseUrl) return rawUrl;

  let r2Path = '';
  if (rawUrl.startsWith(r2Base)) {
    r2Path = rawUrl.slice(r2Base.length).replace(/^\//, '');
  } else {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.hostname.includes('r2.dev')) {
        r2Path = parsed.pathname.replace(/^\//, '');
      }
    } catch {
      r2Path = rawUrl.replace(/^\//, '');
    }
  }

  if (!r2Path) return rawUrl;

  const encodedPath = r2Path
    .split('/')
    .filter(Boolean)
    .map((seg) => encodeURIComponent(decodeURIComponent(seg)))
    .join('/');

  const safeName = (filename || 'photo.jpg').replace(/[^\w.\-() ]+/g, '_').slice(0, 180) || 'photo.jpg';
  return `${supabaseUrl}/functions/v1/download-media?path=${encodedPath}&filename=${encodeURIComponent(safeName)}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey);

    const { orderId, recipientEmail, siteOrigin, collectionSlug } = await req.json();

    if (!orderId || !recipientEmail) {
      return new Response(JSON.stringify({ error: 'orderId and recipientEmail are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from('printstore_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw orderError || new Error('Order not found');
    }

    // Fetch order items
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('printstore_order_items')
      .select('*')
      .eq('order_id', orderId);

    if (itemsError) throw itemsError;

    const shortId = order.id.split('-')[0].toUpperCase();

    // Detect if the entire order is digital downloads
    const allDigital = (items || []).length > 0 &&
      (items || []).every((i: any) => DIGITAL_TYPES.includes(i.product_type));

    const subject = allDigital
      ? `Your Download is Ready – PIXNXT #${shortId}`
      : `Your Order Receipt – PIXNXT Print Lab #${shortId}`;

    const viewOrderUrl = `${siteOrigin}/printstore?slug=${collectionSlug}&orderId=${orderId}`;

    // ── Build item rows ───────────────────────────────────────────────────────
    const itemsRowsHtml = (items || [])
      .map((item: any) => {
        const isDigital = DIGITAL_TYPES.includes(item.product_type);
        const sizeLabel = formatSizeLabel(item);

        let downloadSection = '';
        if (isDigital) {
          if (item.product_type === 'digital_download') {
            // Single photo download — embed thumbnail + download button
            const rawPhotoUrl = item.options?.photo?.full_url || item.options?.photo?.web_url || item.options?.photo?.url || '';
            const photoUrl = getForcedDownloadUrl(rawPhotoUrl, item.options?.photo?.filename || 'photo.jpg');
            const thumbUrl = item.options?.photo?.thumbnail_url || item.options?.photo?.web_url || rawPhotoUrl;
            downloadSection = `
              ${thumbUrl ? `<div style="margin: 10px 0;"><img src="${thumbUrl}" alt="Your photo" style="max-width:100%; max-height:180px; border-radius:6px; border:1px solid #e8e5e0; display:block;" /></div>` : ''}
              ${photoUrl ? `<a href="${photoUrl}" style="display:inline-block; margin-top:8px; padding:8px 16px; background-color:#111; color:#fff; text-decoration:none; border-radius:4px; font-size:12px; font-weight:bold; text-transform:uppercase; letter-spacing:0.05em;">⬇ Download Photo</a>` : ''}
            `;
          } else {
            // Entire collection — show a note instead of embedding all photos
            downloadSection = `
              <div style="margin-top:10px; padding:10px 14px; background:#ecfdf5; border-radius:6px; border:1px solid #bbf7d0; color:#059669; font-size:13px;">
                📧 Your full collection download link will arrive in a separate email once processing is complete.
              </div>
            `;
          }
        }

        return `
    <tr>
      <td style="padding: 14px 0; border-bottom: 1px solid #eee;">
        <div style="font-size:14px; font-weight:700; color:#111;">${escapeHtml(item.product_name)}</div>
        <div style="font-size:12px; color:#64748b; margin-top:3px;">${escapeHtml(sizeLabel)}</div>
        ${downloadSection}
      </td>
      <td style="padding: 14px 0; border-bottom: 1px solid #eee; font-size:14px; color:#333; text-align:center; vertical-align:top;">${item.quantity}</td>
      <td style="padding: 14px 0; border-bottom: 1px solid #eee; font-size:14px; color:#111; text-align:right; font-family:monospace; vertical-align:top;">INR ${(item.unit_price * item.quantity).toFixed(2)}</td>
    </tr>`;
      })
      .join('');

    // ── Totals section — hide shipping/tax for all-digital ───────────────────
    const totalsHtml = allDigital
      ? `
        <tr>
          <td style="padding:4px 0; color:#64748b;">Subtotal:</td>
          <td style="padding:4px 0; text-align:right; font-family:monospace;">INR ${order.subtotal.toFixed(2)}</td>
        </tr>
        <tr style="font-weight:bold; font-size:16px; border-top:1px solid #111;">
          <td style="padding:12px 0 0; color:#111;">Total Paid:</td>
          <td style="padding:12px 0 0; text-align:right; font-family:monospace; color:#111;">INR ${order.total.toFixed(2)}</td>
        </tr>`
      : `
        <tr>
          <td style="padding:4px 0; color:#64748b;">Subtotal:</td>
          <td style="padding:4px 0; text-align:right; font-family:monospace;">INR ${order.subtotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0; color:#64748b;">Tax (8%):</td>
          <td style="padding:4px 0; text-align:right; font-family:monospace;">INR ${order.tax_amount.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0; color:#64748b;">Shipping:</td>
          <td style="padding:4px 0; text-align:right; font-family:monospace;">INR ${order.shipping_amount.toFixed(2)}</td>
        </tr>
        <tr style="font-weight:bold; font-size:16px; border-top:1px solid #111;">
          <td style="padding:12px 0 0; color:#111;">Total Paid:</td>
          <td style="padding:12px 0 0; text-align:right; font-family:monospace; color:#111;">INR ${order.total.toFixed(2)}</td>
        </tr>`;

    // ── Delivery section ─────────────────────────────────────────────────────
    const deliveryHtml = allDigital
      ? `
        <div style="margin-bottom:30px; padding:20px; background:#f0fdf4; border-radius:8px; border:1px solid #bbf7d0;">
          <div style="font-size:12px; font-weight:700; color:#16a34a; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:8px;">📧 Downloads Sent To</div>
          <div style="font-size:15px; color:#14532d; font-weight:600; margin-bottom:4px;">${escapeHtml(order.customer_email)}</div>
          <div style="font-size:13px; color:#166534; line-height:1.5;">
            Your high-resolution files are linked below. High-resolution downloads are instant.
          </div>
        </div>`
      : `
        <div style="margin-bottom:30px; padding:16px; background:#fcfbfa; border-radius:8px; border:1px solid #f2ede4; font-size:13px; color:#333;">
          <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:6px;">Shipping Destination</div>
          <div>${escapeHtml(order.customer_name)}</div>
          <div>${escapeHtml(order.shipping_address?.address || '')}, ${escapeHtml(order.shipping_address?.city || '')}</div>
          <div>${escapeHtml(order.shipping_address?.zip || '')}, India</div>
        </div>`;

    // ── Dedicated Prominent Downloads list for Digital items ─────────────────
    let digitalAssetsHtml = '';
    if (allDigital) {
      const assetsList = (items || []).map((item: any) => {
        const isSingle = item.product_type === 'digital_download';
        const rawPhotoUrl = item.options?.photo?.full_url || item.options?.photo?.web_url || item.options?.photo?.url || '';
        const thumbUrl = item.options?.photo?.thumbnail_url || item.options?.photo?.web_url || rawPhotoUrl;
        const photoUrl = getForcedDownloadUrl(rawPhotoUrl, item.options?.photo?.filename || 'photo.jpg');

        return `
          <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:20px; margin-bottom:20px; box-shadow:0 1px 3px rgba(0,0,0,0.02);">
            <h3 style="margin:0 0 4px 0; font-size:15px; color:#0f172a; font-weight:700; text-transform:uppercase; letter-spacing:0.03em;">
              ${escapeHtml(item.product_name)}
            </h3>
            <p style="margin:0 0 16px 0; font-size:12px; color:#64748b;">
              Format: High-Resolution Digital JPG
            </p>
            ${isSingle && thumbUrl ? `
              <div style="margin-bottom:16px; border-radius:8px; overflow:hidden; border:1px solid #e2e8f0; display:inline-block;">
                <img src="${thumbUrl}" alt="Purchased Image" style="max-height:220px; max-width:100%; display:block; object-fit:contain;" />
              </div>
            ` : ''}
            
            <div style="margin-top:12px;">
              ${isSingle && photoUrl ? `
                <a href="${photoUrl}" style="display:inline-block; padding:12px 24px; background-color:#10b981; color:#ffffff; text-decoration:none; border-radius:6px; font-size:13px; font-weight:bold; text-transform:uppercase; letter-spacing:0.06em; box-shadow:0 2px 4px rgba(16,185,129,0.2);">
                  ⬇ Download Image File
                </a>
              ` : `
                <div style="background:#f0fdf4; border:1px solid #bbf7d0; color:#16a34a; padding:12px 16px; border-radius:6px; font-size:13.5px; font-weight:500;">
                  ⚡ Your entire collection download zip and link will be processed and sent to your inbox in 10-15 minutes.
                </div>
              `}
            </div>
          </div>
        `;
      }).join('');

      digitalAssetsHtml = `
        <div style="margin-bottom:40px;">
          <h2 style="font-family:'Georgia',serif; font-size:18px; color:#1e293b; font-weight:normal; text-transform:uppercase; letter-spacing:0.08em; border-bottom:2px solid #cbd5e1; padding-bottom:8px; margin:0 0 20px 0;">
            Your Download Files
          </h2>
          ${assetsList}
        </div>
      `;
    }

    const introText = allDigital
      ? `Your download purchase is confirmed! Your high-resolution photo(s) are ready for download below.`
      : `Thank you for your order! Your print request has been received and is being processed. Below is your order summary.`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f7f5f2; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f7f5f2; padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px; background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.05); border:1px solid #e8e5e0;">

          <!-- Header -->
          <tr>
            <td style="padding:40px 40px 20px; text-align:center; border-bottom:1px solid #f2ede4;">
              <h1 style="margin:0 0 10px; font-family:'Georgia',serif; font-size:24px; color:#111; font-weight:normal; letter-spacing:0.05em; text-transform:uppercase;">PIXNXT</h1>
              <p style="margin:0; font-size:14px; color:#64748b;">${allDigital ? 'Download Delivery' : 'Order Confirmation &amp; Receipt'}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px; font-size:16px; line-height:1.5; color:#333;">Hello <strong>${escapeHtml(order.customer_name)}</strong>,</p>
              <p style="margin:0 0 28px; font-size:15px; line-height:1.6; color:#475569;">${introText}</p>

              <!-- Download ID / Order ID -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px; background-color:#fcfbfa; border:1px solid #f2ede4; border-radius:6px;">
                <tr>
                  <td style="padding:14px 16px; font-size:13px; color:#64748b;">${allDigital ? 'Download ID:' : 'Order ID:'}</td>
                  <td style="padding:14px 16px; font-size:13px; font-weight:700; color:#111; text-align:right;">#${shortId}</td>
                </tr>
                <tr>
                  <td style="padding:0 16px 14px; font-size:13px; color:#64748b;">Date:</td>
                  <td style="padding:0 16px 14px; font-size:13px; font-weight:600; color:#111; text-align:right;">${new Date(order.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
              </table>

              ${deliveryHtml}

              <!-- Prominent Downloads (Embedded image + download buttons) -->
              ${digitalAssetsHtml}

              <!-- Items Receipt Summary -->
              <h3 style="margin:0 0 12px; font-size:13px; text-transform:uppercase; letter-spacing:0.06em; color:#111; border-bottom:2px solid #111; padding-bottom:6px;">
                ${allDigital ? 'Payment Receipt Summary' : 'Order Items'}
              </h3>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:30px; border-collapse:collapse;">
                <thead>
                  <tr>
                    <th style="padding:8px 0; text-align:left; font-size:11px; text-transform:uppercase; color:#64748b; border-bottom:1px solid #ccc;">Product</th>
                    <th style="padding:8px 0; text-align:center; font-size:11px; text-transform:uppercase; color:#64748b; border-bottom:1px solid #ccc; width:50px;">Qty</th>
                    <th style="padding:8px 0; text-align:right; font-size:11px; text-transform:uppercase; color:#64748b; border-bottom:1px solid #ccc; width:100px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRowsHtml}
                </tbody>
              </table>

              <!-- Totals -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin-left:auto; margin-bottom:40px; font-size:14px; color:#333; min-width:220px;">
                ${totalsHtml}
              </table>

              <!-- CTA -->
              <div style="text-align:center; margin-bottom:40px;">
                <a href="${viewOrderUrl}" style="display:inline-block; padding:14px 36px; background-color:#111; color:#ffffff; text-decoration:none; border-radius:4px; font-size:13px; font-weight:bold; text-transform:uppercase; letter-spacing:0.1em;">
                  ${allDigital ? 'go to summary' : 'View Order Summary'}
                </a>
              </div>

              <p style="margin:0; font-size:13px; line-height:1.5; color:#94a3b8; text-align:center;">
                If you have any questions, please reply directly to this email.
              </p>
            </td>
          </tr>


        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const plainBody = `
PIXNXT – ${allDigital ? 'Download Confirmation' : 'Order Confirmation'}
${allDigital ? 'Download' : 'Order'} ID: #${shortId}
Total: INR ${order.total.toFixed(2)}

Hello ${order.customer_name},
${introText}

${viewOrderUrl}
`;

    const smtpConfig = {
      hostname: Deno.env.get('SMTP_HOST') || '',
      port: parseInt(Deno.env.get('SMTP_PORT') || '465', 10),
      username: Deno.env.get('SMTP_USER') || '',
      password: Deno.env.get('SMTP_PASS') || '',
    };

    if (!smtpConfig.hostname || !smtpConfig.username) {
      return new Response(JSON.stringify({ error: 'Email SMTP is not configured on the server' }), {
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
        subject,
        content: plainBody,
        html,
      });
    } finally {
      await client.close();
    }

    return new Response(JSON.stringify({ ok: true, to: recipientEmail }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-order-placed-email error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to send email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
