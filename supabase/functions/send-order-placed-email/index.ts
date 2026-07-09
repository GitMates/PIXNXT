// import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts';

// if (!Deno.writeAll) {
//   // @ts-ignore
//   Deno.writeAll = async (w: Deno.Writer, data: Uint8Array) => {
//     let nwritten = 0;
//     while (nwritten < data.length) {
//       nwritten += await w.write(data.subarray(nwritten));
//     }
//   };
// }

// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
// };

// function escapeHtml(text: any): string {
//   const str = typeof text === 'string' ? text : String(text || '');
//   return str
//     .replace(/&/g, '&amp;')
//     .replace(/</g, '&lt;')
//     .replace(/>/g, '&gt;')
//     .replace(/"/g, '&quot;');
// }

// function formatOptionValue(val: any): string {
//   if (!val) return 'Default';
//   if (typeof val === 'string') return val;
//   if (typeof val === 'object') {
//     return val.name || val.label || val.title || JSON.stringify(val);
//   }
//   return String(val);
// }

// serve(async (req) => {
//   if (req.method === 'OPTIONS') {
//     return new Response('ok', { headers: corsHeaders });
//   }

//   try {
//     const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
//     const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
//     const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey);

//     const { orderId, recipientEmail, siteOrigin, collectionSlug } = await req.json();

//     if (!orderId || !recipientEmail) {
//       return new Response(JSON.stringify({ error: 'orderId and recipientEmail are required' }), {
//         status: 400,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//       });
//     }

//     // Fetch order details
//     const { data: order, error: orderError } = await supabaseAdmin
//       .from('printstore_orders')
//       .select('*')
//       .eq('id', orderId)
//       .single();

//     if (orderError || !order) {
//       throw orderError || new Error('Order not found');
//     }

//     // Fetch order items
//     const { data: items, error: itemsError } = await supabaseAdmin
//       .from('printstore_order_items')
//       .select('*')
//       .eq('order_id', orderId);

//     if (itemsError) {
//       throw itemsError;
//     }

//     const shortId = order.id.split('-')[0].toUpperCase();
//     const subject = `Your Order Receipt - PIXNXT Print Lab #${shortId}`;
    
//     // Build link to view receipt / order summary
//     const viewOrderUrl = `${siteOrigin}/printstore?slug=${collectionSlug}&orderId=${orderId}`;

//     const itemsRowsHtml = (items || [])
//       .map(
//         (item) => `
//       <tr>
//         <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 14px; color: #333;">
//           ${escapeHtml(item.product_name)} (${escapeHtml(formatOptionValue(item.options?.size))})
//         </td>
//         <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 14px; color: #333; text-align: center;">
//           ${item.quantity}
//         </td>
//         <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 14px; color: #333; text-align: right; font-family: monospace;">
//           INR ${(item.unit_price * item.quantity).toFixed(2)}
//         </td>
//       </tr>`
//       )
//       .join('');

//     const html = `<!DOCTYPE html>
// <html>
// <head>
//   <meta charset="utf-8">
//   <meta name="viewport" content="width=device-width, initial-scale=1.0">
// </head>
// <body style="margin: 0; padding: 0; background-color: #f7f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
//   <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f7f5f2; padding: 40px 16px;">
//     <tr>
//       <td align="center">
//         <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e8e5e0;">
//           <!-- Header -->
//           <tr>
//             <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #f2ede4;">
//               <h1 style="margin: 0 0 10px; font-family: 'Georgia', serif; font-size: 24px; color: #111; font-weight: normal; letter-spacing: 0.05em; text-transform: uppercase;">PIXNXT Print Lab</h1>
//               <p style="margin: 0; font-size: 14px; color: #64748b;">Order Confirmation & Receipt</p>
//             </td>
//           </tr>
          
//           <!-- Content -->
//           <tr>
//             <td style="padding: 40px;">
//               <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.5; color: #333;">Hello <strong>${escapeHtml(order.customer_name)}</strong>,</p>
//               <p style="margin: 0 0 30px; font-size: 15px; line-height: 1.6; color: #475569;">
//                 Thank you for your order! Your print request has been received and is being processed. Below is your order summary.
//               </p>
              
//               <!-- Order Details Meta -->
//               <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 30px; background-color: #fcfbfa; border: 1px solid #f2ede4; border-radius: 6px; padding: 16px;">
//                 <tr>
//                   <td style="font-size: 13px; color: #64748b; padding-bottom: 8px;">Order ID:</td>
//                   <td style="font-size: 13px; font-weight: 600; color: #111; padding-bottom: 8px; text-align: right;">#${shortId}</td>
//                 </tr>
//                 <tr>
//                   <td style="font-size: 13px; color: #64748b;">Order Date:</td>
//                   <td style="font-size: 13px; font-weight: 600; color: #111; text-align: right;">${new Date(order.created_at).toLocaleDateString()}</td>
//                 </tr>
//               </table>
              
//               <!-- Items Table -->
//               <h3 style="margin: 0 0 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #111; border-bottom: 2px solid #111; padding-bottom: 6px;">Order Items</h3>
//               <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 30px; border-collapse: collapse;">
//                 <thead>
//                   <tr>
//                     <th style="padding: 8px 0; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #ccc;">Product</th>
//                     <th style="padding: 8px 0; text-align: center; font-size: 12px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #ccc; width: 60px;">Qty</th>
//                     <th style="padding: 8px 0; text-align: right; font-size: 12px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #ccc; width: 100px;">Total</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   ${itemsRowsHtml}
//                 </tbody>
//               </table>

//               <!-- Totals -->
//               <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 40px; font-size: 14px; color: #333;">
//                 <tr>
//                   <td style="padding: 4px 0; color: #64748b;">Subtotal:</td>
//                   <td style="padding: 4px 0; text-align: right; font-family: monospace;">INR ${order.subtotal.toFixed(2)}</td>
//                 </tr>
//                 <tr>
//                   <td style="padding: 4px 0; color: #64748b;">Tax (8%):</td>
//                   <td style="padding: 4px 0; text-align: right; font-family: monospace;">INR ${order.tax_amount.toFixed(2)}</td>
//                 </tr>
//                 <tr>
//                   <td style="padding: 4px 0; color: #64748b;">Shipping:</td>
//                   <td style="padding: 4px 0; text-align: right; font-family: monospace;">INR ${order.shipping_amount.toFixed(2)}</td>
//                 </tr>
//                 <tr style="font-weight: bold; font-size: 16px; border-top: 1px solid #111;">
//                   <td style="padding: 12px 0 0; color: #111;">Total Paid:</td>
//                   <td style="padding: 12px 0 0; text-align: right; font-family: monospace; color: #111;">INR ${order.total.toFixed(2)}</td>
//                 </tr>
//               </table>

//               <!-- View Order Button -->
//               <div style="text-align: center; margin-bottom: 40px;">
//                 <a href="${viewOrderUrl}" style="display: inline-block; padding: 14px 36px; background-color: #111111; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
//                   View Order Summary
//                 </a>
//               </div>
              
//               <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #94a3b8; text-align: center;">
//                 If you have any questions, please reply directly to this email.
//               </p>
//             </td>
//           </tr>
//         </table>
//       </td>
//     </tr>
//   </table>
// </body>
// </html>`;

//     const plainBody = `
// PIXNXT Print Lab Order Confirmation
// Order ID: #${shortId}
// Total Amount: INR ${order.total.toFixed(2)}

// Thank you for your order, ${order.customer_name}!

// View your order summary and receipt: ${viewOrderUrl}
// `;

//     const smtpConfig = {
//       hostname: Deno.env.get('SMTP_HOST') || '',
//       port: parseInt(Deno.env.get('SMTP_PORT') || '465', 10),
//       username: Deno.env.get('SMTP_USER') || '',
//       password: Deno.env.get('SMTP_PASS') || '',
//     };

//     if (!smtpConfig.hostname || !smtpConfig.username) {
//       return new Response(JSON.stringify({ error: 'Email SMTP is not configured on the server' }), {
//         status: 503,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//       });
//     }

//     const client = new SmtpClient();
//     try {
//       await client.connectTLS(smtpConfig);
//       await client.send({
//         from: smtpConfig.username,
//         to: recipientEmail,
//         subject,
//         content: plainBody,
//         html,
//       });
//     } finally {
//       await client.close();
//     }

//     return new Response(JSON.stringify({ ok: true, to: recipientEmail }), {
//       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//     });
//   } catch (err) {
//     console.error('send-order-placed-email error:', err);
//     return new Response(
//       JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to send email' }),
//       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//     );
//   }
// });
