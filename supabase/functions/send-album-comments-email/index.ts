import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts';
import { loadPhotographerProoferSettings } from '../_shared/smartAlbumProoferEmail.ts';

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

type CommentRow = {
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

function buildInstantEmailHtml(options: {
  photographerName: string;
  albumName: string;
  guestName: string;
  guestEmail: string | null;
  eventLabel: string;
  detailLabel: string;
  detailBody: string;
  editorUrl: string;
  timeZone?: string;
}): string {
  const {
    photographerName,
    albumName,
    guestName,
    guestEmail,
    eventLabel,
    detailLabel,
    detailBody,
    editorUrl,
    timeZone,
  } = options;

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
              <h1 style="margin:0 0 20px;font-size:20px;font-weight:700;letter-spacing:0.5px;color:#111;line-height:1.3;">${escapeHtml(eventLabel)}</h1>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;background:#fafafa;border:1px solid #eee;border-radius:10px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:#666;">New client activity on:</p>
                    <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#111;">${escapeHtml(albumName)}</p>
                    <p style="margin:0;font-size:14px;line-height:1.5;color:#444;">From ${guestLine}</p>
                  </td>
                </tr>
              </table>
              <div style="margin:0 0 24px;padding:14px 16px;background:#f7f7f7;border-radius:8px;border-left:3px solid #8b7aa8;">
                <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#888;">${escapeHtml(detailLabel)}</p>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#333;">${escapeHtml(detailBody)}</p>
                ${timeZone ? `<p style="margin:10px 0 0;font-size:12px;color:#999;">${escapeHtml(formatWhen(new Date().toISOString(), timeZone))}</p>` : ''}
              </div>
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

function buildCommentsEmailHtml(options: {
  photographerName: string;
  albumName: string;
  guestName: string;
  guestEmail: string | null;
  commentCount: number;
  groupedComments: { label: string; items: CommentRow[] }[];
  editorUrl: string;
  timeZone?: string;
}): string {
  const {
    photographerName,
    albumName,
    guestName,
    guestEmail,
    commentCount,
    groupedComments,
    editorUrl,
    timeZone,
  } = options;

  const commentBlocks = groupedComments
    .map(({ label, items }) => {
      const rows = items
        .map(
          (item) => `<p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#333;">
            <strong style="color:#111;">${escapeHtml(item.author_name || 'Guest')}</strong>
            <span style="color:#999;"> · ${escapeHtml(formatWhen(item.updated_at || item.created_at, timeZone))}</span><br/>
            ${escapeHtml(String(item.body || '').trim())}
          </p>`
        )
        .join('');
      return `<tr>
        <td style="padding:0 0 16px;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#888;">${escapeHtml(label)}</p>
          <div style="padding:14px 16px;background:#f7f7f7;border-radius:8px;border-left:3px solid #8b7aa8;">
            ${rows}
          </div>
        </td>
      </tr>`;
    })
    .join('');

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
              <h1 style="margin:0 0 20px;font-size:20px;font-weight:700;letter-spacing:0.5px;color:#111;line-height:1.3;">Album comments confirmed</h1>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;background:#fafafa;border:1px solid #eee;border-radius:10px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:#666;">A client confirmed feedback on:</p>
                    <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#111;">${escapeHtml(albumName)}</p>
                    <p style="margin:0 0 4px;font-size:14px;line-height:1.5;color:#444;">From ${guestLine}</p>
                    <p style="margin:8px 0 0;font-size:13px;font-weight:600;color:#555;">${commentCount} comment${commentCount === 1 ? '' : 's'}</p>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                ${commentBlocks}
              </table>
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
    const {
      albumId,
      guestName,
      guestEmail,
      siteOrigin,
      comments,
      clientTimezone,
      mode = 'digest',
      eventType = 'comment',
      eventLabel,
      eventDetail,
    } = await req.json();

    if (!albumId) {
      return new Response(JSON.stringify({ error: 'albumId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isInstant = mode === 'instant';

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: album, error: albumError } = await supabaseAdmin
      .from('smart_albums')
      .select('id, name, status, photographer_id, comments_enabled')
      .eq('id', albumId)
      .maybeSingle();

    if (albumError) throw albumError;
    if (!album) {
      return new Response(JSON.stringify({ error: 'Album not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prooferSettings = await loadPhotographerProoferSettings(supabaseAdmin, album.photographer_id);
    const photographerAlerts = prooferSettings.photographerAlerts || 'digest';

    if (isInstant && photographerAlerts !== 'instant') {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: 'digest_mode' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isInstant && photographerAlerts !== 'digest') {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: 'instant_mode' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isInstant && album.status !== 'published') {
      return new Response(JSON.stringify({ error: 'Album is not published' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isInstant && !album.comments_enabled) {
      return new Response(JSON.stringify({ error: 'Comments are disabled for this album' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let rows: CommentRow[] = Array.isArray(comments) ? comments : [];

    const { data: dbComments, error: commentsError } = await supabaseAdmin
      .from('smart_album_comments')
      .select('spread_index, author_name, body, created_at, updated_at, parent_id')
      .eq('album_id', albumId)
      .is('parent_id', null)
      .order('spread_index', { ascending: true })
      .order('created_at', { ascending: true });

    if (commentsError) throw commentsError;

    if (dbComments?.length) {
      rows = dbComments.filter((row) => String(row.body || '').trim());
    } else {
      rows = rows.filter((row) => String(row.body || '').trim());
    }

    if (!rows.length && !isInstant) {
      return new Response(JSON.stringify({ error: 'No comments to send' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (isInstant && !String(eventDetail || '').trim() && !rows.length) {
      return new Response(JSON.stringify({ error: 'No instant event detail to send' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: photographer } = await supabaseAdmin
      .from('photographers')
      .select('email, display_name')
      .eq('id', album.photographer_id)
      .maybeSingle();

    if (!photographer?.email) {
      return new Response(JSON.stringify({ error: 'Photographer email not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const grouped = new Map<number, CommentRow[]>();
    rows.forEach((row) => {
      const spreadIndex = Number(row.spread_index ?? 0);
      if (!grouped.has(spreadIndex)) grouped.set(spreadIndex, []);
      grouped.get(spreadIndex)!.push(row);
    });

    const groupedComments = [...grouped.entries()]
      .sort(([a], [b]) => a - b)
      .map(([spreadIndex, items]) => ({
        label: spreadLabel(spreadIndex),
        items,
      }));

    const origin = (siteOrigin || Deno.env.get('PUBLIC_SITE_URL') || '').replace(/\/$/, '');
    const editorUrl = `${origin}/smart_albums/album/${albumId}`;
    const clientName = String(guestName || rows[0]?.author_name || 'A client').trim();
    const subject = isInstant
      ? `New ${eventType || 'activity'} on ${album.name || 'album'}`
      : `${clientName} confirmed album comments — ${album.name || 'Album'}`;

    const timeZone =
      typeof clientTimezone === 'string' && clientTimezone.trim() ? clientTimezone.trim() : undefined;

    let plainBody = '';
    let html = '';

    if (isInstant) {
      const detail = String(eventDetail || rows[0]?.body || '').trim();
      const label =
        eventLabel ||
        (eventType === 'swap'
          ? 'Swap request'
          : eventType === 'photo_comment'
            ? 'Photo comment'
            : 'Spread comment');
      plainBody = [
        `Hi ${photographer.display_name || 'Photographer'},`,
        '',
        `${clientName} left new feedback on "${album.name}".`,
        '',
        `${label}: ${detail}`,
        '',
        `Open album: ${editorUrl}`,
      ].join('\n');
      html = buildInstantEmailHtml({
        photographerName: photographer.display_name || 'Photographer',
        albumName: album.name || 'Album',
        guestName: clientName,
        guestEmail: guestEmail?.trim() || null,
        eventLabel: `New client ${eventType || 'activity'}`,
        detailLabel: label,
        detailBody: detail,
        editorUrl,
        timeZone,
      });
    } else {
      plainBody = [
        `Hi ${photographer.display_name || 'Photographer'},`,
        '',
        `${clientName} confirmed their comments on "${album.name}".`,
        `${rows.length} comment(s):`,
        '',
        ...groupedComments.flatMap(({ label, items }) => [
          `${label}:`,
          ...items.map(
            (item) =>
              `- ${item.author_name || 'Guest'}: ${String(item.body || '').trim()}`
          ),
          '',
        ]),
        `Open album: ${editorUrl}`,
      ].join('\n');

      html = buildCommentsEmailHtml({
        photographerName: photographer.display_name || 'Photographer',
        albumName: album.name || 'Album',
        guestName: clientName,
        guestEmail: guestEmail?.trim() || null,
        commentCount: rows.length,
        groupedComments,
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

    const contactPatch: Record<string, string> = {
      client_last_activity_at: new Date().toISOString(),
      client_contact_name: clientName,
    };
    if (guestEmail?.trim()) {
      contactPatch.client_contact_email = guestEmail.trim();
    }
    await supabaseAdmin.from('smart_albums').update(contactPatch).eq('id', albumId);

    if (!isInstant) {
      await supabaseAdmin
        .from('smart_albums')
        .update({
          client_changes_submitted_at: new Date().toISOString(),
          client_changes_submitted_by: clientName,
          revision_ready_notified_at: null,
        })
        .eq('id', albumId);
    }

    return new Response(
      JSON.stringify({ ok: true, to: photographer.email, count: rows.length, mode: isInstant ? 'instant' : 'digest' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('send-album-comments-email:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to send email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
