-- Ensure authenticated delivery owners can INSERT/SELECT/UPDATE photos.
-- After collections → deliveries, some projects only retained DELETE + anon public-read
-- policies in migrations; missing SELECT after INSERT makes PostgREST return PGRST116
-- (masked in the app as "Check your connection").

DROP POLICY IF EXISTS "photos_select_own" ON public.photos;
DROP POLICY IF EXISTS "photos_insert_own" ON public.photos;
DROP POLICY IF EXISTS "photos_update_own" ON public.photos;
DROP POLICY IF EXISTS "photos_select_delivery_owner" ON public.photos;
DROP POLICY IF EXISTS "photos_insert_delivery_owner" ON public.photos;
DROP POLICY IF EXISTS "photos_update_delivery_owner" ON public.photos;
DROP POLICY IF EXISTS "Users can view their own photos" ON public.photos;
DROP POLICY IF EXISTS "Users can insert their own photos" ON public.photos;
DROP POLICY IF EXISTS "Users can update their own photos" ON public.photos;

CREATE POLICY "photos_select_delivery_owner"
  ON public.photos
  FOR SELECT
  TO authenticated
  USING (
    photographer_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.deliveries d
      WHERE d.id = photos.collection_id
        AND d.photographer_id = auth.uid()
    )
  );

CREATE POLICY "photos_insert_delivery_owner"
  ON public.photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    photographer_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.deliveries d
      WHERE d.id = photos.collection_id
        AND d.photographer_id = auth.uid()
    )
  );

CREATE POLICY "photos_update_delivery_owner"
  ON public.photos
  FOR UPDATE
  TO authenticated
  USING (
    photographer_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.deliveries d
      WHERE d.id = photos.collection_id
        AND d.photographer_id = auth.uid()
    )
  )
  WITH CHECK (
    photographer_id = auth.uid()
  );

NOTIFY pgrst, 'reload schema';
