import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TrackAction =
  | 'activity'
  | 'client_started_commenting'
  | 'submit_changes'
  | 'approve';

function disableFeedbackInProoferSettings(settings: unknown) {
  const raw =
    settings && typeof settings === 'object' && !Array.isArray(settings)
      ? { ...(settings as Record<string, unknown>) }
      : {};
  return {
    ...raw,
    allow_external_uploads: false,
    allow_voice_recordings: false,
    allowExternalUploads: false,
    allowVoiceRecordings: false,
  };
}

function disableFeedbackInPreviewData(previewData: unknown) {
  if (!previewData || typeof previewData !== 'object' || Array.isArray(previewData)) {
    return previewData;
  }
  const next = { ...(previewData as Record<string, unknown>) };
  const access =
    next.proofer_access && typeof next.proofer_access === 'object' && !Array.isArray(next.proofer_access)
      ? { ...(next.proofer_access as Record<string, unknown>) }
      : {};
  next.proofer_access = {
    ...access,
    commentsEnabled: false,
    swapsEnabled: false,
    allowExternalUploads: false,
    allowVoiceRecordings: false,
    repliesEnabled: false,
    feedbackLocked: true,
  };
  next.updated_at = new Date().toISOString();
  return next;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { albumId, action, guestName, guestEmail } = body as {
      albumId?: string;
      action?: TrackAction;
      guestName?: string | null;
      guestEmail?: string | null;
    };

    if (!albumId) {
      return new Response(JSON.stringify({ error: 'albumId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const trackAction: TrackAction = action || 'activity';
    if (
      trackAction !== 'activity' &&
      trackAction !== 'client_started_commenting' &&
      trackAction !== 'submit_changes' &&
      trackAction !== 'approve'
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
      .from('album_proofer_albums')
      .select(
        'id, client_commenting_started_at, client_changes_submitted_at, client_approved_at, proofer_settings, preview_data'
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

    const now = new Date().toISOString();
    const clientName = String(guestName || 'Album client').trim();
    const patch: Record<string, unknown> = {
      client_last_activity_at: now,
      client_contact_name: clientName,
    };

    if (guestEmail?.trim()) {
      patch.client_contact_email = guestEmail.trim();
    }

    if (trackAction === 'approve') {
      patch.client_approved_at = now;
      patch.client_approved_by = clientName;
      // Lock client feedback / messaging once the album is signed off.
      patch.comments_enabled = false;
      patch.messages_enabled = false;
      patch.replies_enabled = false;
      patch.proofer_settings = disableFeedbackInProoferSettings(album.proofer_settings);
      if (album.preview_data) {
        patch.preview_data = disableFeedbackInPreviewData(album.preview_data);
      }
    } else if (trackAction === 'submit_changes') {
      patch.client_changes_submitted_at = now;
      patch.client_changes_submitted_by = clientName;
      patch.revision_ready_notified_at = null;
    } else if (trackAction === 'client_started_commenting' && !album.client_commenting_started_at) {
      patch.client_commenting_started_at = now;
      patch.client_commenting_started_by = clientName;
    }

    const { error: updateError } = await supabaseAdmin
      .from('album_proofer_albums')
      .update(patch)
      .eq('id', albumId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ ok: true, action: trackAction, trackedAt: now }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('track-album-proof-activity:', err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Failed to track album activity',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
