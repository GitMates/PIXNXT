-- Allow photographers to disable the public share link without unpublishing the album.
ALTER TABLE public.smart_albums
  ADD COLUMN IF NOT EXISTS share_link_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.smart_albums.share_link_enabled IS
  'When false, /album-preview share links are blocked for clients even if status is published.';

DROP POLICY IF EXISTS smart_albums_select_published ON public.smart_albums;
CREATE POLICY smart_albums_select_published ON public.smart_albums
  FOR SELECT
  USING (status = 'published' AND COALESCE(share_link_enabled, true));

DROP POLICY IF EXISTS smart_album_comments_select_enabled ON public.smart_album_comments;
CREATE POLICY smart_album_comments_select_enabled ON public.smart_album_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.smart_albums a
      WHERE a.id = album_id
        AND a.comments_enabled
        AND (
          a.photographer_id = auth.uid()
          OR (a.status = 'published' AND COALESCE(a.share_link_enabled, true))
        )
    )
  );

DROP POLICY IF EXISTS smart_album_comments_insert_client ON public.smart_album_comments;
CREATE POLICY smart_album_comments_insert_client ON public.smart_album_comments
  FOR INSERT
  WITH CHECK (
    author_type = 'client'
    AND parent_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.smart_albums a
      WHERE a.id = album_id
        AND a.comments_enabled
        AND a.status = 'published'
        AND COALESCE(a.share_link_enabled, true)
    )
  );

DROP POLICY IF EXISTS smart_album_comments_update_client ON public.smart_album_comments;
CREATE POLICY smart_album_comments_update_client ON public.smart_album_comments
  FOR UPDATE
  USING (
    author_type = 'client'
    AND parent_id IS NULL
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
    AND parent_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.smart_albums a
      WHERE a.id = album_id
        AND a.comments_enabled
        AND a.status = 'published'
        AND COALESCE(a.share_link_enabled, true)
    )
  );

DROP POLICY IF EXISTS smart_album_comments_insert_client_reply ON public.smart_album_comments;
CREATE POLICY smart_album_comments_insert_client_reply ON public.smart_album_comments
  FOR INSERT
  WITH CHECK (
    author_type = 'client'
    AND parent_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.smart_album_comments parent
      JOIN public.smart_albums a ON a.id = parent.album_id
      WHERE parent.id = smart_album_comments.parent_id
        AND parent.album_id = smart_album_comments.album_id
        AND parent.spread_index = smart_album_comments.spread_index
        AND a.comments_enabled
        AND a.status = 'published'
        AND COALESCE(a.share_link_enabled, true)
    )
  );
