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

function buildFavoriteSubmitEmailHtml(options: {
  photographerName: string;
  collectionName: string;
  listName: string;
  visitorEmail: string;
  photoCount: number;
  clientMessage: string | null;
  favoritesHubUrl: string;
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
    favoritesHubUrl,
    selectionsUrl,
    dashboardUrl,
  } = options;

  const clientNote = clientMessage?.trim()
    ? `<div style="margin:24px 0;padding:16px;background:#f8f8f8;border-left:3px solid #111;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#888;">Message from client</p>
        <p style="margin:0;font-size:15px;line-height:1.7;color:#333;">${escapeHtml(clientMessage.trim())}</p>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f5f5f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;box-shadow:0 10px 30px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding:40px 48px;text-align:left;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999;font-family:Arial,sans-serif;">${escapeHtml(photographerName)}</p>
              <h1 style="margin:0 0 24px;font-size:22px;font-weight:500;text-transform:uppercase;letter-spacing:2px;color:#111;">Favorite selections confirmed</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#555;">
                <strong>${escapeHtml(visitorEmail)}</strong> confirmed their favorites for
                <strong>${escapeHtml(collectionName)}</strong> — list <strong>${escapeHtml(listName)}</strong>
                (${photoCount} ${photoCount === 1 ? 'photo' : 'photos'}).
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#777;">
                This selection is final and can no longer be changed by the client.
              </p>
              ${clientNote}
              <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#111;font-family:Arial,sans-serif;">Links</p>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.6;">
                <a href="${escapeHtml(favoritesHubUrl)}" style="color:#111;">Client favorites page</a>
              </p>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.6;">
                <a href="${escapeHtml(selectionsUrl)}" style="color:#111;">View selected photos</a>
              </p>
              <p style="margin:0 0 32px;font-size:14px;line-height:1.6;">
                <a href="${escapeHtml(dashboardUrl)}" style="color:#111;">Open in your dashboard (Favorite Activity)</a>
              </p>
              <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;background-color:#111;color:#ffffff;padding:14px 32px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;text-decoration:none;font-family:Arial,sans-serif;">Review in dashboard</a>
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
    const favoritesHubUrl = `${origin}/gallery/${collection.slug}/f`;
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
      `Client favorites page: ${favoritesHubUrl}`,
      `View selected photos: ${selectionsUrl}`,
      `Dashboard (Favorite Activity): ${dashboardUrl}`,
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
      favoritesHubUrl,
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
