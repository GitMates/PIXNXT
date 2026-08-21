-- Fix RLS policy: deliveries uses photographer_id, not user_id.

DROP POLICY IF EXISTS "Photographers read own download jobs" ON public.gallery_download_jobs;

CREATE POLICY "Photographers read own download jobs"
  ON public.gallery_download_jobs FOR SELECT
  TO authenticated
  USING (
    photographer_id = auth.uid()
    OR collection_id IN (
      SELECT id FROM public.deliveries WHERE photographer_id = auth.uid()
    )
  );
