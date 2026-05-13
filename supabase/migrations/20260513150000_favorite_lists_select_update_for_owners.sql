-- Collection owners could DELETE favorite_lists (20260513120000) but often had no
-- SELECT/UPDATE policies. PostgREST then applies UPDATE but returns 0 rows for
-- .select() … .single(), which surfaces as: "Cannot coerce the result to a single JSON object".

DROP POLICY IF EXISTS "favorite_lists_select_collection_owner" ON public.favorite_lists;
CREATE POLICY "favorite_lists_select_collection_owner"
  ON public.favorite_lists
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.collections c
      WHERE c.id = favorite_lists.collection_id
        AND c.photographer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "favorite_lists_update_collection_owner" ON public.favorite_lists;
CREATE POLICY "favorite_lists_update_collection_owner"
  ON public.favorite_lists
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.collections c
      WHERE c.id = favorite_lists.collection_id
        AND c.photographer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.collections c
      WHERE c.id = favorite_lists.collection_id
        AND c.photographer_id = auth.uid()
    )
  );
