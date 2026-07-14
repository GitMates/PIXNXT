import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

// Polyfill for Deno.writeAll which is missing in newer Deno versions
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
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function applyTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let out = template || "";
  Object.entries(vars).forEach(([key, value]) => {
    out = out.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), value)
             .replace(new RegExp(`\\{${key}\\}`, "g"), value);
  });
  return out;
}

// Generate inline-styled HTML for banners inside emails
function renderBannerHtmlForEmail(
  bannerKey: string,
  banner: any,
  vars: Record<string, string>
): string {
  if (!banner) return "";

  const bgColor = banner.bg_color || "#4a5338";
  const titleColor = banner.title_color || "#2c3e2d";
  const subtitleColor = banner.subtitle_color || "#4a5a4b";
  const textColor = banner.text_color || "#ffffff";
  const ctaBg = banner.cta_bg || "#3a4a38";
  const ctaColor = banner.cta_color || "#ffffff";

  const title = applyTemplate(banner.title || "", vars);
  const subtitle = applyTemplate(banner.subtitle || "", vars);
  const text = applyTemplate(banner.text || "", vars);
  const cta = banner.cta || "";
  const code = applyTemplate(banner.code || `Code: ${vars.code || ""}`, vars);

  if (bannerKey === "text_banner") {
    return `
      <div style="background-color: ${bgColor}; color: ${textColor}; padding: 12px 24px; text-align: center; font-size: 13px; font-weight: 600; font-family: 'Helvetica Neue', Arial, sans-serif; letter-spacing: 0.5px; line-height: 1.4; border-radius: 4px; margin-bottom: 24px;">
        ${escapeHtml(text)}
      </div>
    `;
  }

  if (bannerKey === "large_banner" || bannerKey === "store_rotator") {
    return `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${bgColor}; border-radius: 6px; overflow: hidden; margin-bottom: 28px; border: 1px solid #e2e8f0; font-family: Georgia, serif;">
        <tr>
          <td style="padding: 32px; text-align: left; vertical-align: middle;">
            <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: ${titleColor}; text-transform: uppercase; letter-spacing: 1px;">
              ${escapeHtml(title || "Relive It in Print")}
            </h2>
            <p style="margin: 0 0 12px; font-size: 13px; color: ${subtitleColor}; font-family: Arial, sans-serif; line-height: 1.5; max-width: 420px;">
              ${escapeHtml(subtitle || "Celebrate these special moments with custom prints.")}
            </p>
            <p style="margin: 0 0 16px; font-size: 12px; font-weight: 600; color: ${subtitleColor}; font-family: Arial, sans-serif;">
              ${escapeHtml(code)}
            </p>
            ${cta ? `
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius: 4px; background: ${ctaBg};">
                    <a href="${escapeHtml(vars.store_url)}" target="_blank" style="display: inline-block; padding: 10px 24px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${ctaColor}; text-decoration: none; font-family: Arial, sans-serif;">
                      ${escapeHtml(cta)}
                    </a>
                  </td>
                </tr>
              </table>
            ` : ""}
          </td>
        </tr>
      </table>
    `;
  }

  if (bannerKey === "photo_banner") {
    return `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${bgColor}; border-radius: 6px; overflow: hidden; margin-bottom: 28px; border: 1px solid #e2e8f0; font-family: Georgia, serif;">
        <tr>
          <td style="padding: 28px; text-align: center;">
            <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 700; color: ${titleColor || '#1a1a1a'}; text-transform: uppercase; letter-spacing: 1.5px;">
              ${escapeHtml(title || "Anniversary Sale")}
            </h2>
            <p style="margin: 0 0 12px; font-size: 12px; color: ${subtitleColor || '#444444'}; font-family: Arial, sans-serif;">
              ${escapeHtml(subtitle || "20% off all prints")}
            </p>
            <div style="font-size: 18px; font-weight: 700; color: ${titleColor || '#1a1a1a'}; margin-bottom: 16px; font-family: Arial, sans-serif; letter-spacing: 1px;">
              00 : 00 : 00 : 00
            </div>
            ${cta ? `
              <table role="presentation" cellspacing="0" cellpadding="0" align="center">
                <tr>
                  <td style="border-radius: 4px; background: ${ctaBg || '#1a1a1a'};">
                    <a href="${escapeHtml(vars.store_url)}" target="_blank" style="display: inline-block; padding: 10px 24px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${ctaColor || '#ffffff'}; text-decoration: none; font-family: Arial, sans-serif;">
                      ${escapeHtml(cta)}
                    </a>
                  </td>
                </tr>
              </table>
            ` : ""}
          </td>
        </tr>
      </table>
    `;
  }

  return "";
}

function buildEmailHtml(options: {
  photographerName: string;
  collectionName: string;
  bodyHtml: string;
  bannerHtml: string;
  titleHeader: string;
  buttonText: string;
  buttonBg: string;
  buttonTextColor: string;
  storeUrl: string;
  logoType: string;
}): string {
  const { photographerName, collectionName, bodyHtml, bannerHtml, titleHeader, buttonText, buttonBg, buttonTextColor, storeUrl, logoType } = options;

  const textHexColor = logoType.includes("Light") ? "#ffffff" : "#000000";
  const wrapperBg = logoType.includes("Light") ? "#1a1a1a" : "#ffffff";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Georgia, serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f5f5f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:540px;background-color:${wrapperBg};box-shadow:0 10px 30px rgba(0,0,0,0.05);border-radius:8px;overflow:hidden;">
          <tr>
            <td style="padding:40px;text-align:center;">
              <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999;font-family:Arial,sans-serif;">
                ${escapeHtml(photographerName)}
              </p>
              
              <h1 style="margin:0 0 28px;font-size:24px;font-weight:500;text-transform:uppercase;letter-spacing:3px;color:${textHexColor};line-height:1.3;">
                ${escapeHtml(collectionName)}
              </h1>

              ${bannerHtml}

              <div style="text-align:left;font-size:14.5px;line-height:1.75;color:#444444;margin-bottom:32px;font-family: Arial, sans-serif;">
                <h3 style="font-family: Georgia, serif; font-size: 16px; font-weight: bold; color: ${textHexColor}; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${escapeHtml(titleHeader)}
                </h3>
                ${bodyHtml}
              </div>

              <table role="presentation" cellspacing="0" cellpadding="0" align="center">
                <tr>
                  <td style="border-radius:4px;background-color:${buttonBg};">
                    <a href="${escapeHtml(storeUrl)}" target="_blank" style="display:inline-block;padding:14px 44px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${buttonTextColor};text-decoration:none;font-family:Arial,sans-serif;">
                      ${escapeHtml(buttonText)}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0;font-size:10px;color:#999;text-align:center;font-family:Arial,sans-serif;">Sent by PIXNXT Store Campaigns</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const smtpConfig = {
      hostname: Deno.env.get("SMTP_HOST") || "",
      port: parseInt(Deno.env.get("SMTP_PORT") || "465"),
      username: Deno.env.get("SMTP_USER") || "",
      password: Deno.env.get("SMTP_PASS") || "",
    };

    const whatsappConfig = {
      accessToken: Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "",
      phoneNumberId: Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "",
    };

    const body = await req.json();

    if (body.test === true) {
      // --- TEST SEND MODE ---
      const {
        testType,
        recipient,
        collectionId,
        campaignId,
        emailKey,
        emailConfig,
        activeBannerKey,
        activeBanner,
        siteOrigin,
      } = body;

      if (!recipient || !collectionId) {
        return new Response(JSON.stringify({ error: "Missing test recipient or collectionId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch Collection Details
      const { data: collection, error: colError } = await supabaseAdmin
        .from("collections")
        .select("name, slug, cover_url, photographer_id")
        .eq("id", collectionId)
        .maybeSingle();

      if (colError || !collection) {
        throw new Error(colError?.message || "Collection not found");
      }

      // Fetch Photographer Details
      const { data: photographer, error: photogError } = await supabaseAdmin
        .from("photographers")
        .select("display_name, email")
        .eq("id", collection.photographer_id)
        .maybeSingle();

      if (photogError || !photographer) {
        throw new Error(photogError?.message || "Photographer not found");
      }

      const photographerName = photographer.display_name || "Nandha Studio";
      const collectionName = collection.name || "Your Gallery";
      const siteUrl = (siteOrigin || Deno.env.get("PUBLIC_SITE_URL") || "https://pixnxt.com").replace(/\/$/, "");
      const storeUrl = `${siteUrl}/gallery/${collection.slug}`;

      // Set up variables for templates
      const discountVal = "30%"; // test value
      const promoCode = "HAPPYANI"; // test value
      const vars = {
        client_name: "Sarah",
        photographer_name: photographerName,
        "discount-value": discountVal,
        discount_value: discountVal,
        code: promoCode,
        store_url: storeUrl,
      };

      if (testType === "email") {
        // Apply template replacements
        const rawSubject = emailConfig.subject || "Anniversary Special Gift!";
        const subject = applyTemplate(rawSubject, vars);

        const rawTitle = emailConfig.title || "HAPPY ANNIVERSARY!";
        const titleHeader = applyTemplate(rawTitle, vars);

        const rawMessage = emailConfig.message || "Celebrate those moments.";
        const messageBody = applyTemplate(rawMessage, vars);

        // Convert double newlines to paragraph tags
        const bodyHtml = messageBody
          .split("\n\n")
          .map((p: string) => `<p style="margin:0 0 16px;line-height:1.6;">${escapeHtml(p)}</p>`)
          .join("");

        // Build active banner HTML
        const bannerHtml = activeBannerKey
          ? renderBannerHtmlForEmail(activeBannerKey, activeBanner, vars)
          : "";

        const html = buildEmailHtml({
          photographerName,
          collectionName,
          bodyHtml,
          bannerHtml,
          titleHeader,
          buttonText: emailConfig.button_text || "VISIT SHOP",
          buttonBg: emailConfig.btn_color || "#5d6050",
          buttonTextColor: emailConfig.btn_text_color || "#ffffff",
          storeUrl,
          logoType: emailConfig.logo_type || "Dark Logo, for light background",
        });

        // Send Email
        const client = new SmtpClient();
        try {
          await client.connectTLS(smtpConfig);
          await client.send({
            from: smtpConfig.username,
            to: recipient,
            subject: `[Test] ${subject}`,
            content: messageBody,
            html,
          });
        } finally {
          await client.close();
        }

        return new Response(JSON.stringify({ ok: true, message: "Test email sent successfully" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        // --- WHATSAPP TEST SEND ---
        if (!whatsappConfig.accessToken || !whatsappConfig.phoneNumberId) {
          throw new Error("WhatsApp credentials are not configured on the server");
        }

        const rawMessage = emailConfig.whatsapp_template || "";
        const message = applyTemplate(rawMessage, vars);

        const payload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipient.replace(/\D/g, ""),
          type: "text",
          text: {
            preview_url: true,
            body: message,
          },
        };

        const response = await fetch(
          `https://graph.facebook.com/v25.0/${whatsappConfig.phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${whatsappConfig.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        const respData = await response.json();
        if (!response.ok) {
          throw new Error(respData?.error?.message || "WhatsApp send failed");
        }

        return new Response(JSON.stringify({ ok: true, message: "Test WhatsApp sent successfully" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // --- BACKGROUND PRODUCTION MODE (DAILY CHECK) ---
      // Fetch collections with campaigns configured
      const { data: collections, error: fetchError } = await supabaseAdmin
        .from("collections")
        .select("id, name, slug, cover_url, store_banner_text, event_date, photographer_id")
        .eq("store_enabled", true)
        .not("store_banner_text", "is", null);

      if (fetchError) throw fetchError;

      const siteUrl = (Deno.env.get("PUBLIC_SITE_URL") || "https://pixnxt.com").replace(/\/$/, "");
      const results: string[] = [];

      for (const col of collections || []) {
        let campaigns: any[] = [];
        try {
          const parsed = JSON.parse(col.store_banner_text || "");
          if (Array.isArray(parsed)) campaigns = parsed;
        } catch {
          continue;
        }

        const activeCampaign = campaigns.find((c: any) => c.enabled);
        if (!activeCampaign) continue;

        // Fetch contacts for the collection
        const { data: contacts, error: contactsError } = await supabaseAdmin
          .from("collection_contacts")
          .select("contacts(id, email, phone, full_name)")
          .eq("collection_id", col.id);

        if (contactsError || !contacts || contacts.length === 0) continue;

        // Resolve photographer details
        const { data: photographer } = await supabaseAdmin
          .from("photographers")
          .select("display_name, email")
          .eq("id", col.photographer_id)
          .maybeSingle();

        const photographerName = photographer?.display_name || "Your Photographer";
        const discountVal = activeCampaign.discount ? `${activeCampaign.discount}%` : "30%";
        const promoCode = activeCampaign.discountCode || "HAPPYANI";
        const storeUrl = `${siteUrl}/gallery/${col.slug}`;

        // Send reminders to all contacts
        for (const record of contacts) {
          const contact = (record as any).contacts;
          if (!contact || !contact.email) continue;

          const vars = {
            client_name: contact.full_name || "Client",
            photographer_name: photographerName,
            "discount-value": discountVal,
            discount_value: discountVal,
            code: promoCode,
            store_url: storeUrl,
          };

          // Find enabled emails
          for (const [key, emailConfig] of Object.entries(activeCampaign.emails || {}) as any) {
            if (!emailConfig || emailConfig.enabled === false) continue;

            // In production, compare dates relative to campaign.startDays & durationDays
            console.log(`Campaign ${activeCampaign.id} scheduled reminder ${key} for ${contact.email}`);
          }
        }
        results.push(col.name);
      }

      return new Response(JSON.stringify({ ok: true, processed: results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("send-store-campaign-reminders error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Failed to run reminders" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
