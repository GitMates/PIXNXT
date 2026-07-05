import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  applyTemplate,
  buildAlbumPreviewUrl,
  buildClientTemplateEmailHtml,
  loadPhotographerProoferSettings,
  sendSmtpEmail,
  templateToHtmlParagraphs,
} from '../_shared/smartAlbumProoferEmail.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ClientEmailAction = 'client_reminder' | 'status_approved' | 'status_revision_ready';

async function resolveClientEmail(
  supabaseAdmin: ReturnType<typeof createClient>,
  albumId: string,
  guestEmail?: string | null
): Promise<{ email: string; name: string } | null> {
  const direct = guestEmail?.trim();
  if (direct) return { email: direct, name: '' };

  const { data: album } = await supabaseAdmin
    .from('smart_albums')
    .select('client_contact_email, client_contact_name')
    .eq('id', albumId)
    .maybeSingle();

  const stored = album?.client_contact_email?.trim();
  if (stored) {
    return {
      email: stored,
      name: album?.client_contact_name?.trim() || 'there',
    };
  }

  const { data: comment } = await supabaseAdmin
    .from('smart_album_comments')
    .select('author_email, author_name')
    .eq('album_id', albumId)
    .not('author_email', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const fromComment = comment?.author_email?.trim();
  if (fromComment) {
    return {
      email: fromComment,
      name: comment?.author_name?.trim() || 'there',
    };
  }

  return null;
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
      daysInactive,
      force = false,
    } = body as {
      albumId?: string;
      action?: ClientEmailAction;
      guestName?: string | null;
      guestEmail?: string | null;
      siteOrigin?: string;
      daysInactive?: number;
      force?: boolean;
    };

    if (!albumId || !action) {
      return new Response(JSON.stringify({ error: 'albumId and action are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (
      action !== 'client_reminder' &&
      action !== 'status_approved' &&
      action !== 'status_revision_ready'
    ) {
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
        'id, name, slug, status, photographer_id, proofer_settings, client_approved_at, client_approved_notified_at, revision_ready_notified_at, client_reminder_sent_at'
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

    const prooferSettings = await loadPhotographerProoferSettings(supabaseAdmin, album.photographer_id);

    if (action !== 'client_reminder' && !prooferSettings.statusChangeEmails && !force) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: 'status_change_emails_disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'status_approved' && album.client_approved_notified_at && !force) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: 'already_notified' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'status_revision_ready' && album.revision_ready_notified_at && !force) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: 'already_notified' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const client = await resolveClientEmail(supabaseAdmin, albumId, guestEmail);
    if (!client?.email) {
      return new Response(JSON.stringify({ error: 'Client email not found for this album' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clientName = String(guestName || client.name || 'there').trim() || 'there';
    const origin = (siteOrigin || Deno.env.get('PUBLIC_SITE_URL') || '').replace(/\/$/, '');
    const albumLink = buildAlbumPreviewUrl(album, album.proofer_settings, origin);

    const { data: photographer } = await supabaseAdmin
      .from('photographers')
      .select('display_name, email')
      .eq('id', album.photographer_id)
      .maybeSingle();

    const photographerName = photographer?.display_name?.trim() || 'Your photographer';
    const albumName = album.name || 'your album';

    let template = '';
    let subject = '';

    if (action === 'client_reminder') {
      template = prooferSettings.clientReminderTemplate || '';
      subject = `Reminder: ${albumName} is awaiting your feedback`;
    } else if (action === 'status_approved') {
      template = prooferSettings.approvedTemplate || '';
      subject = `Approved: ${albumName}`;
    } else {
      template = prooferSettings.revisionRequestedTemplate || '';
      subject = `Revisions ready: ${albumName}`;
    }

    const plainBody = applyTemplate(template, {
      client_name: clientName,
      album_name: albumName,
      album_link: albumLink,
      view_album_link: albumLink,
      days_inactive: daysInactive ?? prooferSettings.nudgeDays ?? 5,
    });

    const html = buildClientTemplateEmailHtml({
      photographerName,
      albumName,
      bodyHtml: templateToHtmlParagraphs(plainBody),
      ctaUrl: albumLink,
      ctaLabel: action === 'client_reminder' ? 'Open album' : 'View album',
    });

    await sendSmtpEmail({
      to: client.email,
      subject,
      plainBody,
      html,
    });

    const now = new Date().toISOString();
    const contactPatch: Record<string, string> = {
      client_contact_email: client.email,
      client_contact_name: clientName,
    };

    if (action === 'client_reminder') {
      contactPatch.client_reminder_sent_at = now;
    } else if (action === 'status_approved') {
      contactPatch.client_approved_notified_at = now;
    } else {
      contactPatch.revision_ready_notified_at = now;
    }

    await supabaseAdmin.from('smart_albums').update(contactPatch).eq('id', albumId);

    return new Response(
      JSON.stringify({ ok: true, action, to: client.email }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('send-smart-album-client-email:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to send email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
