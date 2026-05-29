-- Thread status fields for professional review workflow.
ALTER TABLE public.smart_album_comments
  ADD COLUMN IF NOT EXISTS resolved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

-- Let clients edit their own discussion replies as well as root comments.
DROP POLICY IF EXISTS smart_album_comments_update_client ON public.smart_album_comments;
CREATE POLICY smart_album_comments_update_client ON public.smart_album_comments
  FOR UPDATE
  USING (
    author_type = 'client'
    AND EXISTS (
      SELECT 1 FROM public.smart_albums a
      WHERE a.id = album_id AND a.comments_enabled AND a.status = 'published'
    )
  );

-- Let clients delete their own discussion replies as well as root comments.
DROP POLICY IF EXISTS smart_album_comments_delete_client ON public.smart_album_comments;
CREATE POLICY smart_album_comments_delete_client ON public.smart_album_comments
  FOR DELETE
  USING (
    author_type = 'client'
    AND EXISTS (
      SELECT 1 FROM public.smart_albums a
      WHERE a.id = album_id AND a.comments_enabled AND a.status = 'published'
    )
  );
