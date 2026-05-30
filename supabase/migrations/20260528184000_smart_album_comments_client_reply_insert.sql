-- Allow clients to post threaded replies on published albums.
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
    )
  );

-- Allow photographers to test client-style threaded replies in owner preview.
DROP POLICY IF EXISTS smart_album_comments_owner_client_reply_insert ON public.smart_album_comments;
CREATE POLICY smart_album_comments_owner_client_reply_insert ON public.smart_album_comments
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
        AND a.photographer_id = auth.uid()
    )
  );
