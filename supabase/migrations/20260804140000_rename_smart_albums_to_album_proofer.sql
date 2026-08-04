-- Rename Smart Album → Album Proofer tables (keeps data & FKs).
-- Apply after prior feedback/RLS migrations.
-- Safe to re-run: table renames no-op if already done; policies/function recreated.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.smart_albums RENAME TO album_proofer_albums;
ALTER TABLE IF EXISTS public.smart_album_comments RENAME TO album_proofer_comments;
ALTER TABLE IF EXISTS public.smart_album_swap_marks RENAME TO album_proofer_swap_marks;
ALTER TABLE IF EXISTS public.smart_album_photo_pins RENAME TO album_proofer_photo_pins;
ALTER TABLE IF EXISTS public.smart_album_proof_replies RENAME TO album_proofer_proof_replies;
ALTER TABLE IF EXISTS public.smart_album_feedback_seen RENAME TO album_proofer_feedback_seen;
ALTER TABLE IF EXISTS public.smart_album_proofer_settings RENAME TO album_proofer_settings;

-- ---------------------------------------------------------------------------
-- Indexes (rename for clarity; optional but keeps schema readable)
-- ---------------------------------------------------------------------------
ALTER INDEX IF EXISTS smart_albums_photographer_id_idx RENAME TO album_proofer_albums_photographer_id_idx;
ALTER INDEX IF EXISTS smart_albums_created_at_idx RENAME TO album_proofer_albums_created_at_idx;
ALTER INDEX IF EXISTS smart_albums_is_starred_idx RENAME TO album_proofer_albums_is_starred_idx;
ALTER INDEX IF EXISTS smart_album_comments_album_spread_idx RENAME TO album_proofer_comments_album_spread_idx;
ALTER INDEX IF EXISTS smart_album_comments_parent_idx RENAME TO album_proofer_comments_parent_idx;
ALTER INDEX IF EXISTS smart_album_swap_marks_album_idx RENAME TO album_proofer_swap_marks_album_idx;
ALTER INDEX IF EXISTS smart_album_photo_pins_album_idx RENAME TO album_proofer_photo_pins_album_idx;
ALTER INDEX IF EXISTS smart_album_proof_replies_album_parent_idx RENAME TO album_proofer_proof_replies_album_parent_idx;
ALTER INDEX IF EXISTS smart_album_feedback_seen_album_viewer_idx RENAME TO album_proofer_feedback_seen_album_viewer_idx;
ALTER INDEX IF EXISTS smart_albums_published_reminders_idx RENAME TO album_proofer_albums_published_reminders_idx;

-- ---------------------------------------------------------------------------
-- RLS helper for reply inserts
-- Drop dependent policies FIRST, then the old function, then recreate.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS smart_album_comments_insert_client_reply ON public.album_proofer_comments;
DROP POLICY IF EXISTS smart_album_comments_owner_client_reply_insert ON public.album_proofer_comments;
DROP POLICY IF EXISTS album_proofer_comments_insert_client_reply ON public.album_proofer_comments;
DROP POLICY IF EXISTS album_proofer_comments_owner_client_reply_insert ON public.album_proofer_comments;

DROP FUNCTION IF EXISTS public.smart_album_comment_parent_matches(uuid, uuid, integer);

CREATE OR REPLACE FUNCTION public.album_proofer_comment_parent_matches(
  p_parent_id uuid,
  p_album_id uuid,
  p_spread_index integer
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.album_proofer_comments parent
    WHERE parent.id = p_parent_id
      AND parent.album_id = p_album_id
      AND parent.spread_index = p_spread_index
  );
$$;

REVOKE ALL ON FUNCTION public.album_proofer_comment_parent_matches(uuid, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.album_proofer_comment_parent_matches(uuid, uuid, integer)
  TO anon, authenticated, service_role;

CREATE POLICY album_proofer_comments_insert_client_reply ON public.album_proofer_comments
  FOR INSERT
  WITH CHECK (
    author_type = 'client'
    AND parent_id IS NOT NULL
    AND public.album_proofer_comment_parent_matches(parent_id, album_id, spread_index)
    AND EXISTS (
      SELECT 1 FROM public.album_proofer_albums a
      WHERE a.id = album_id
        AND a.comments_enabled
        AND a.status = 'published'
        AND COALESCE(a.share_link_enabled, true)
        AND COALESCE(a.replies_enabled, true)
    )
  );

CREATE POLICY album_proofer_comments_owner_client_reply_insert ON public.album_proofer_comments
  FOR INSERT
  WITH CHECK (
    author_type = 'client'
    AND parent_id IS NOT NULL
    AND public.album_proofer_comment_parent_matches(parent_id, album_id, spread_index)
    AND EXISTS (
      SELECT 1 FROM public.album_proofer_albums a
      WHERE a.id = album_id
        AND a.photographer_id = auth.uid()
        AND COALESCE(a.replies_enabled, true)
    )
  );

COMMENT ON TABLE public.album_proofer_albums IS
  'Album Proofer projects (layout albums for clients).';
COMMENT ON TABLE public.album_proofer_comments IS
  'Per-spread proofing comments from clients with photographer replies.';
COMMENT ON TABLE public.album_proofer_settings IS
  'Per-album Album Proofer settings overrides.';
