-- Fix: infinite recursion in smart_album_comments RLS.
-- Reply INSERT policies selected from smart_album_comments inside a policy on the
-- same table, which Postgres rejects. Use a SECURITY DEFINER helper instead.

CREATE OR REPLACE FUNCTION public.smart_album_comment_parent_matches(
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
    FROM public.smart_album_comments parent
    WHERE parent.id = p_parent_id
      AND parent.album_id = p_album_id
      AND parent.spread_index = p_spread_index
  );
$$;

REVOKE ALL ON FUNCTION public.smart_album_comment_parent_matches(uuid, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.smart_album_comment_parent_matches(uuid, uuid, integer)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.smart_album_comment_parent_matches(uuid, uuid, integer) IS
  'RLS-safe parent row check for smart_album_comments reply inserts (avoids policy recursion).';

-- Client reply on published + shareable albums
DROP POLICY IF EXISTS smart_album_comments_insert_client_reply ON public.smart_album_comments;
CREATE POLICY smart_album_comments_insert_client_reply ON public.smart_album_comments
  FOR INSERT
  WITH CHECK (
    author_type = 'client'
    AND parent_id IS NOT NULL
    AND public.smart_album_comment_parent_matches(parent_id, album_id, spread_index)
    AND EXISTS (
      SELECT 1 FROM public.smart_albums a
      WHERE a.id = album_id
        AND a.comments_enabled
        AND a.status = 'published'
        AND COALESCE(a.share_link_enabled, true)
        AND COALESCE(a.replies_enabled, true)
    )
  );

-- Photographer testing client-style replies in owner preview
DROP POLICY IF EXISTS smart_album_comments_owner_client_reply_insert ON public.smart_album_comments;
CREATE POLICY smart_album_comments_owner_client_reply_insert ON public.smart_album_comments
  FOR INSERT
  WITH CHECK (
    author_type = 'client'
    AND parent_id IS NOT NULL
    AND public.smart_album_comment_parent_matches(parent_id, album_id, spread_index)
    AND EXISTS (
      SELECT 1 FROM public.smart_albums a
      WHERE a.id = album_id
        AND a.photographer_id = auth.uid()
        AND COALESCE(a.replies_enabled, true)
    )
  );

-- Allow clients to update/delete their replies (not only root comments),
-- while still respecting share_link_enabled from the later migration.
DROP POLICY IF EXISTS smart_album_comments_update_client ON public.smart_album_comments;
CREATE POLICY smart_album_comments_update_client ON public.smart_album_comments
  FOR UPDATE
  USING (
    author_type = 'client'
    AND EXISTS (
      SELECT 1 FROM public.smart_albums a
      WHERE a.id = album_id
        AND a.comments_enabled
        AND a.status = 'published'
        AND COALESCE(a.share_link_enabled, true)
    )
  );

DROP POLICY IF EXISTS smart_album_comments_delete_client ON public.smart_album_comments;
CREATE POLICY smart_album_comments_delete_client ON public.smart_album_comments
  FOR DELETE
  USING (
    author_type = 'client'
    AND EXISTS (
      SELECT 1 FROM public.smart_albums a
      WHERE a.id = album_id
        AND a.comments_enabled
        AND a.status = 'published'
        AND COALESCE(a.share_link_enabled, true)
    )
  );
