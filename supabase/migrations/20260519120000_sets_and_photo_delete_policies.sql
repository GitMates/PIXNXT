-- Allow collection owners to delete sets and related activity when removing photo sets / photos.

DROP POLICY IF EXISTS "sets_delete_collection_owner" ON public.sets;
CREATE POLICY "sets_delete_collection_owner"
  ON public.sets
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.collections c
      WHERE c.id = sets.collection_id
        AND c.photographer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "photos_delete_collection_owner" ON public.photos;
CREATE POLICY "photos_delete_collection_owner"
  ON public.photos
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.collections c
      WHERE c.id = photos.collection_id
        AND c.photographer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "activity_log_delete_collection_owner" ON public.activity_log;
CREATE POLICY "activity_log_delete_collection_owner"
  ON public.activity_log
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.collections c
      WHERE c.id = activity_log.collection_id
        AND c.photographer_id = auth.uid()
    )
  );
