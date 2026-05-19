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

function linkRow(href: string, label: string, description: string): string {
  return `<tr>
    <td style="padding:0 0 10px;">
      <a href="${escapeHtml(href)}" style="display:block;text-decoration:none;border:1px solid #e8e8e8;border-radius:8px;padding:14px 16px;background:#fafafa;">
        <span style="display:block;font-size:14px;font-weight:600;color:#111;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(label)}</span>
        <span style="display:block;margin-top:4px;font-size:12px;line-height:1.5;color:#777;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(description)}</span>
      </a>
    </td>
  </tr>`;
}

function buildFavoriteSubmitEmailHtml(options: {
  photographerName: string;
  collectionName: string;
  listName: string;
  visitorEmail: string;
  photoCount: number;
  clientMessage: string | null;
  selectionsUrl: string;
  dashboardUrl: string;
}): string {
  const {
    photographerName,
    collectionName,
    listName,
    visitorEmail,
    photoCount,
    clientMessage,
    selectionsUrl,
    dashboardUrl,
  } = options;

  const photoLabel = `${photoCount} ${photoCount === 1 ? 'photo' : 'photos'} selected`;

  const clientNote = clientMessage?.trim()
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
        <tr>
          <td style="padding:16px 18px;background:#f7f7f7;border-radius:8px;border-left:3px solid #111;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#888;">Message from client</p>
            <p style="margin:0;font-size:15px;line-height:1.65;color:#333;">${escapeHtml(clientMessage.trim())}</p>
          </td>
        </tr>
      </table>`
    : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f0f0f0;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0f0f0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:36px 40px 32px;text-align:left;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#999;">${escapeHtml(photographerName)}</p>
              <h1 style="margin:0 0 20px;font-size:20px;font-weight:700;letter-spacing:0.5px;color:#111;line-height:1.3;">Favorite selections confirmed</h1>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;background:#fafafa;border:1px solid #eee;border-radius:10px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:#666;">A client finalized their picks:</p>
                    <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#111;">${escapeHtml(visitorEmail)}</p>
                    <p style="margin:0 0 4px;font-size:14px;line-height:1.5;color:#444;">
                      <span style="color:#111;font-weight:600;">${escapeHtml(collectionName)}</span>
                      <span style="color:#bbb;"> &middot; </span>
                      <span>${escapeHtml(listName)}</span>
                    </p>
                    <p style="margin:8px 0 0;font-size:13px;font-weight:600;color:#555;">${escapeHtml(photoLabel)}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#888;">
                This selection is final — the client can no longer change these photos.
              </p>
              ${clientNote}
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 28px;">
                ${linkRow(selectionsUrl, 'View selected photos', 'Open the gallery with this list selections.')}
                ${linkRow(dashboardUrl, 'Open in your dashboard', 'Favorite Activity — review and manage this submission.')}
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius:6px;background:#111;">
                    <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;padding:14px 28px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#ffffff;text-decoration:none;">Review in dashboard</a>
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
    const { listId, sessionId, siteOrigin, clientMessage } = await req.json();

    if (!listId || !sessionId) {
      return new Response(JSON.stringify({ error: 'listId and sessionId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: list, error: listError } = await supabaseAdmin
      .from('favorite_lists')
      .select(
        `
        id,
        name,
        submitted_at,
        session_id,
        collection_id,
        collections!inner (
          id,
          name,
          slug,
          photographer_id
        )
      `
      )
      .eq('id', listId)
      .eq('session_id', sessionId)
      .maybeSingle();

    if (listError) throw listError;
    if (!list?.submitted_at) {
      return new Response(JSON.stringify({ error: 'List is not submitted yet' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const collectionRaw = list.collections as
      | { id: string; name: string; slug: string; photographer_id: string }
      | { id: string; name: string; slug: string; photographer_id: string }[];
    const collection = Array.isArray(collectionRaw) ? collectionRaw[0] : collectionRaw;

    if (!collection?.slug) {
      return new Response(JSON.stringify({ error: 'Collection not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: session } = await supabaseAdmin
      .from('client_sessions')
      .select('visitor_email')
      .eq('id', sessionId)
      .maybeSingle();

    const { count: photoCount } = await supabaseAdmin
      .from('favorite_items')
      .select('*', { count: 'exact', head: true })
      .eq('list_id', listId);

    const { data: photographer } = await supabaseAdmin
      .from('photographers')
      .select('email, display_name')
      .eq('id', collection.photographer_id)
      .maybeSingle();

    if (!photographer?.email) {
      return new Response(JSON.stringify({ error: 'Photographer email not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const origin = (siteOrigin || Deno.env.get('PUBLIC_SITE_URL') || '').replace(/\/$/, '');
    const selectionsUrl = `${origin}/gallery/${collection.slug}?list=${listId}`;
    const dashboardUrl = `${origin}/collections/manage?id=${collection.id}`;

    const visitorEmail = session?.visitor_email || 'A client';
    const photographerName = photographer.display_name || 'Photographer';
    const subject = `${visitorEmail} confirmed favorites — ${list.name}`;

    const plainBody = [
      `Hi ${photographerName},`,
      '',
      `${visitorEmail} confirmed their favorite selections for "${collection.name}" (list: ${list.name}).`,
      `${photoCount || 0} photo(s) selected. This selection can no longer be changed.`,
      '',
      clientMessage?.trim() ? `Message from client:\n${clientMessage.trim()}\n` : '',
      `View selected photos: ${selectionsUrl}`,
      `Open in your dashboard (Favorite Activity): ${dashboardUrl}`,
    ]
      .filter(Boolean)
      .join('\n');

    const html = buildFavoriteSubmitEmailHtml({
      photographerName,
      collectionName: collection.name,
      listName: list.name,
      visitorEmail,
      photoCount: photoCount || 0,
      clientMessage: clientMessage || null,
      selectionsUrl,
      dashboardUrl,
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
        to: photographer.email,
        subject,
        content: plainBody,
        html,
      });
    } finally {
      await client.close();
    }

    if (clientMessage?.trim()) {
      const { data: latestLog } = await supabaseAdmin
        .from('activity_log')
        .select('id, metadata')
        .eq('collection_id', collection.id)
        .eq('event_type', 'favorite_submit')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestLog?.id) {
        const meta =
          latestLog.metadata && typeof latestLog.metadata === 'object' && !Array.isArray(latestLog.metadata)
            ? { ...(latestLog.metadata as Record<string, unknown>) }
            : {};
        meta.client_message = clientMessage.trim();
        await supabaseAdmin.from('activity_log').update({ metadata: meta }).eq('id', latestLog.id);
      }
    }

    return new Response(JSON.stringify({ ok: true, to: photographer.email }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-favorite-submit-email:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to send email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
