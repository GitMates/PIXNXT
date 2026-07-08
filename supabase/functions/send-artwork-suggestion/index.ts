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
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildArtworkSuggestionEmailHtml(options: {
  customerName: string;
  orderId: string;
  productName: string;
  reviewerNotes: string;
  originalImage: string;
  suggestedImage: string;
  frameAlertUrl: string;
}): string {
  const {
    customerName,
    orderId,
    productName,
    reviewerNotes,
    originalImage,
    suggestedImage,
    frameAlertUrl,
  } = options;

  const shortOrderId = orderId.slice(0, 8).toUpperCase();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Action Required: Artwork Alignment Suggestion</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);border:1px solid #e2e8f0;">
          
          <!-- Header (Brand color - Noida Hub Teal) -->
          <tr>
            <td style="background-color:#005c5a;padding:32px 40px;text-align:center;">
              <h2 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:0.5px;font-family:'EB Garamond','Times New Roman',serif;text-transform:uppercase;">PIXNXT LABS</h2>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:40px 40px 32px;text-align:left;">
              <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0f172a;line-height:1.3;">Hello ${escapeHtml(customerName)},</h1>
              
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">
                Our production lab has reviewed the photo placement for your order <strong style="color:#0f172a;">#${escapeHtml(shortOrderId)}</strong>. 
                To ensure high quality printing, our alignment team has proposed a minor crop adjustment for your <strong>${escapeHtml(productName)}</strong>.
              </p>

              <!-- Note from reviewer -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 28px;">
                <tr>
                  <td style="padding:16px 20px;background-color:#f0fdfa;border-radius:8px;border-left:4px solid #005c5a;">
                    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#005c5a;">Note from Pre-Press Reviewer</p>
                    <p style="margin:0;font-size:14px;line-height:1.6;color:#0f172a;font-style:italic;">"${escapeHtml(reviewerNotes)}"</p>
                  </td>
                </tr>
              </table>

              <!-- Side-by-Side Comparison -->
              <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Visual Comparison</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 32px;border-collapse:collapse;">
                <tr>
                  <!-- Original image slot -->
                  <td width="48%" valign="top" style="background-color:#fafafa;border:1px solid #e2e8f0;border-radius:6px;padding:12px;text-align:center;">
                    <span style="display:block;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:8px;">Original Upload</span>
                    <img src="${escapeHtml(originalImage)}" alt="Original" style="width:100%;max-width:180px;height:140px;object-fit:contain;border:1px solid #e2e8f0;background-color:#fff;" />
                  </td>
                  
                  <td width="4%">&nbsp;</td>

                  <!-- Proposed Adjustment slot -->
                  <td width="48%" valign="top" style="background-color:#f0fdfa;border:1px solid #ccfbf1;border-radius:6px;padding:12px;text-align:center;">
                    <span style="display:block;font-size:11px;font-weight:600;color:#005c5a;text-transform:uppercase;margin-bottom:8px;">Proposed Adjustments</span>
                    <img src="${escapeHtml(suggestedImage)}" alt="Suggested Crop" style="width:100%;max-width:180px;height:140px;object-fit:contain;border:1px solid #ccfbf1;background-color:#fff;" />
                  </td>
                </tr>
              </table>

              <!-- Call to Action -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 24px;text-align:center;">
                <tr>
                  <td align="center" style="border-radius:6px;background-color:#005c5a;">
                    <a href="${escapeHtml(frameAlertUrl)}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#ffffff;text-decoration:none;">Review & Approve Frame</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#64748b;text-align:center;">
                Please review the proposed adjustment above. You can accept our layout suggestion, request to print original anyway, or upload a new photo directly.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:24px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:11px;color:#94a3b8;">This email is sent on behalf of PIXNXT Printing Store. Please do not reply directly to this mail.</p>
            </td>
          </tr>

        </table>
        <p style="margin:20px 0 0;font-size:11px;color:#94a3b8;text-align:center;">&copy; ${new Date().getFullYear()} PIXNXT. All Rights Reserved.</p>
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
    const { reviewId, siteOrigin } = await req.json();

    if (!reviewId) {
      return new Response(JSON.stringify({ error: 'reviewId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch the artwork review details
    const { data: review, error: reviewError } = await supabaseAdmin
      .from('printstore_artwork_reviews')
      .select(`
        id,
        order_id,
        reviewer_notes,
        customer_message,
        original_image,
        suggested_image,
        printstore_orders (
          customer_name,
          customer_email
        ),
        printstore_order_items (
          product_name
        )
      `)
      .eq('id', reviewId)
      .maybeSingle();

    if (reviewError || !review) {
      throw reviewError || new Error('Review not found');
    }

    const order = review.printstore_orders;
    const orderItem = review.printstore_order_items;

    const customerEmail = order?.customer_email;
    const customerName = order?.customer_name || 'Valued Customer';
    const productName = orderItem?.product_name || 'Print Item';
    const reviewerNotes = review.customer_message || review.reviewer_notes || 'We adjusted the framing to center the main subject and prevent crucial elements from being cut off during cutting.';
    const originalImage = review.original_image || '';
    const suggestedImage = review.suggested_image || '';

    if (!customerEmail) {
      return new Response(JSON.stringify({ error: 'Customer email not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const origin = (siteOrigin || Deno.env.get('PUBLIC_SITE_URL') || 'https://pixnxt.com').replace(/\/$/, '');
    const frameAlertUrl = `${origin}/printstore?view=frame-alert&review_id=${reviewId}`;

    const shortOrderId = review.order_id.slice(0, 8).toUpperCase();
    const subject = `Action Required: Crop Suggestion for Order #${shortOrderId}`;

    const html = buildArtworkSuggestionEmailHtml({
      customerName,
      orderId: review.order_id,
      productName,
      reviewerNotes,
      originalImage,
      suggestedImage,
      frameAlertUrl,
    });

    const plainBody = [
      `Hello ${customerName},`,
      '',
      `Our production lab has reviewed the photo placement for your order #${shortOrderId}.`,
      `To ensure high quality printing, our alignment team has proposed a minor crop adjustment for your ${productName}.`,
      '',
      `Note from reviewer: "${reviewerNotes}"`,
      '',
      `Review & Approve Frame: ${frameAlertUrl}`,
    ].join('\n');

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
        to: customerEmail,
        subject,
        content: plainBody,
        html,
      });
      console.log(`Successfully sent artwork review email to: ${customerEmail}`);
    } finally {
      await client.close();
    }

    return new Response(
      JSON.stringify({
        success: true,
        recipient: customerEmail,
        subject,
        frameAlertUrl
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
