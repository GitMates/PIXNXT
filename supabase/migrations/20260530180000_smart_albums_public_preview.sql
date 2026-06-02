-- Allow share links to load published albums without login.
DROP POLICY IF EXISTS smart_albums_select_published ON public.smart_albums;
CREATE POLICY smart_albums_select_published ON public.smart_albums
  FOR SELECT
  USING (status = 'published');

-- Snapshot of collection + page layout for client preview (photos live in object storage).
ALTER TABLE public.smart_albums
  ADD COLUMN IF NOT EXISTS preview_data jsonb;

COMMENT ON COLUMN public.smart_albums.preview_data IS
  'Published album snapshot: collection items and page layout for anonymous preview.';
