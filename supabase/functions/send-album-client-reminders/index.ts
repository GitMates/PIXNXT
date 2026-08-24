import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  albumRemindersEnabled,
  applyTemplate,
  buildAlbumPreviewUrl,
  buildClientTemplateEmailHtml,
  loadPhotographerProoferSettings,
  sendSmtpEmail,
  templateToHtmlParagraphs,
} from '../_shared/smartAlbumProoferEmail.ts';
import { resolveClientFacingOrigin } from '../_shared/clientFacingOrigin.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function daysBetween(fromIso: string, toDate = new Date()): number {
  const from = new Date(fromIso);
  if (Number.isNaN(from.getTime())) return 0;
  const ms = toDate.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const platformOrigin = (Deno.env.get('PUBLIC_SITE_URL') || Deno.env.get('VITE_PUBLIC_SITE_URL') || '').replace(
      /\/$/,
      '',
    );
    const photographerCache = new Map<string, { origin: string; name: string }>();
    const { data: albums, error } = await supabaseAdmin
      .from('album_proofer_albums')
      .select(
        'id, name, slug, photographer_id, proofer_settings, status, client_contact_email, client_contact_name, client_last_activity_at, client_commenting_started_at, client_approved_at, client_changes_submitted_at, published_at, updated_at, client_reminder_sent_at, share_link_enabled'
      )
      .eq('status', 'published');

    if (error) throw error;

    const settingsCache = new Map<string, Awaited<ReturnType<typeof loadPhotographerProoferSettings>>>();
    const results: Array<Record<string, unknown>> = [];

    for (const album of albums || []) {
      if (album.share_link_enabled === false) {
        results.push({ albumId: album.id, skipped: 'share_link_disabled' });
        continue;
      }

      if (album.client_approved_at) {
        results.push({ albumId: album.id, skipped: 'already_approved' });
        continue;
      }

      let settings = settingsCache.get(album.photographer_id);
      if (!settings) {
        settings = await loadPhotographerProoferSettings(supabaseAdmin, album.photographer_id);
        settingsCache.set(album.photographer_id, settings);
      }

      const albumProofer =
        album.proofer_settings && typeof album.proofer_settings === 'object'
          ? (album.proofer_settings as Record<string, unknown>)
          : {};

      if (!albumRemindersEnabled(settings, albumProofer)) {
        results.push({ albumId: album.id, skipped: 'reminders_disabled' });
        continue;
      }

      const nudgeDays = Math.max(1, Number(settings.nudgeDays) || 5);
      const activityAnchor =
        album.client_last_activity_at ||
        album.client_commenting_started_at ||
        album.published_at ||
        album.updated_at;

      if (!activityAnchor) {
        results.push({ albumId: album.id, skipped: 'no_activity_anchor' });
        continue;
      }

      const inactiveDays = daysBetween(activityAnchor);
      if (inactiveDays < nudgeDays) {
        results.push({ albumId: album.id, skipped: 'not_inactive_enough', inactiveDays });
        continue;
      }

      if (album.client_reminder_sent_at) {
        const daysSinceReminder = daysBetween(album.client_reminder_sent_at);
        if (daysSinceReminder < nudgeDays) {
          results.push({ albumId: album.id, skipped: 'reminder_cooldown', daysSinceReminder });
          continue;
        }
      }

      const clientEmail = album.client_contact_email?.trim();
      if (!clientEmail) {
        results.push({ albumId: album.id, skipped: 'no_client_email' });
        continue;
      }

      const clientName = album.client_contact_name?.trim() || 'there';
      let cached = photographerCache.get(album.photographer_id);
      if (!cached) {
        const { data: photographerRow } = await supabaseAdmin
          .from('photographers')
          .select('display_name, custom_domain, custom_domain_status')
          .eq('id', album.photographer_id)
          .maybeSingle();
        cached = {
          origin: resolveClientFacingOrigin({
            siteOrigin: platformOrigin,
            customDomain: photographerRow?.custom_domain,
            customDomainStatus: photographerRow?.custom_domain_status,
          }),
          name: photographerRow?.display_name?.trim() || 'Your photographer',
        };
        photographerCache.set(album.photographer_id, cached);
      }
      const albumLink = buildAlbumPreviewUrl(album, albumProofer, cached.origin);
      const template = settings.clientReminderTemplate || '';
      const plainBody = applyTemplate(template, {
        client_name: clientName,
        album_name: album.name || 'your album',
        album_link: albumLink,
        view_album_link: albumLink,
        days_inactive: inactiveDays,
      });

      const html = buildClientTemplateEmailHtml({
        photographerName: cached.name,
        albumName: album.name || 'your album',
        bodyHtml: templateToHtmlParagraphs(plainBody),
        ctaUrl: albumLink,
        ctaLabel: 'Open album',
      });

      try {
        await sendSmtpEmail({
          to: clientEmail,
          subject: `Reminder: ${album.name || 'your album'} is awaiting your feedback`,
          plainBody,
          html,
        });

        await supabaseAdmin
          .from('album_proofer_albums')
          .update({ client_reminder_sent_at: new Date().toISOString() })
          .eq('id', album.id);

        results.push({ albumId: album.id, sent: true, to: clientEmail, inactiveDays });
      } catch (sendErr) {
        results.push({
          albumId: album.id,
          error: sendErr instanceof Error ? sendErr.message : 'send_failed',
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-album-client-reminders:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to process reminders' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
