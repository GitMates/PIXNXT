-- Let album owners save client-style comments while testing preview (draft or published).
DROP POLICY IF EXISTS smart_album_comments_owner_client_insert ON public.smart_album_comments;
CREATE POLICY smart_album_comments_owner_client_insert ON public.smart_album_comments
  FOR INSERT
  WITH CHECK (
    author_type = 'client'
    AND parent_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.smart_albums a
      WHERE a.id = album_id AND a.photographer_id = auth.uid()
    )
  );
