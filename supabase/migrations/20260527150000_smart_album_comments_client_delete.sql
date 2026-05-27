-- Clients may delete their own top-level comments (e.g. when clearing the input).
DROP POLICY IF EXISTS smart_album_comments_delete_client ON public.smart_album_comments;
CREATE POLICY smart_album_comments_delete_client ON public.smart_album_comments
  FOR DELETE
  USING (
    author_type = 'client'
    AND parent_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.smart_albums a
      WHERE a.id = album_id AND a.comments_enabled AND a.status = 'published'
    )
  );
