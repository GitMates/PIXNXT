-- Allow authenticated collection owners to delete favorite lists and their items.
-- Without these policies, PostgREST DELETE returns success but removes 0 rows under RLS,
-- so the UI updates but rows reappear after reload.

-- favorite_items (delete before list, or when cleaning orphans)
DROP POLICY IF EXISTS "favorite_items_delete_collection_owner" ON public.favorite_items;
CREATE POLICY "favorite_items_delete_collection_owner"
  ON public.favorite_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.favorite_lists fl
      JOIN public.collections c ON c.id = fl.collection_id
      WHERE fl.id = favorite_items.list_id
        AND c.photographer_id = auth.uid()
    )
  );

-- favorite_lists
DROP POLICY IF EXISTS "favorite_lists_delete_collection_owner" ON public.favorite_lists;
CREATE POLICY "favorite_lists_delete_collection_owner"
  ON public.favorite_lists
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.collections c
      WHERE c.id = favorite_lists.collection_id
        AND c.photographer_id = auth.uid()
    )
  );
