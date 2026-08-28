-- Photographers must be able to delete their own deliveries from the dashboard.
-- Without DELETE policy, R2 files are removed but the delivery row stays (UI never updates).

DROP POLICY IF EXISTS "deliveries_delete_own" ON public.deliveries;
DROP POLICY IF EXISTS "Users can delete their own collections" ON public.deliveries;
DROP POLICY IF EXISTS "collections_delete_own" ON public.deliveries;

CREATE POLICY "deliveries_delete_own"
  ON public.deliveries
  FOR DELETE
  TO authenticated
  USING (photographer_id = auth.uid());

DROP POLICY IF EXISTS "deliveries_update_own" ON public.deliveries;
DROP POLICY IF EXISTS "Users can update their own collections" ON public.deliveries;

CREATE POLICY "deliveries_update_own"
  ON public.deliveries
  FOR UPDATE
  TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

DROP POLICY IF EXISTS "deliveries_insert_own" ON public.deliveries;
DROP POLICY IF EXISTS "Users can insert their own collections" ON public.deliveries;

CREATE POLICY "deliveries_insert_own"
  ON public.deliveries
  FOR INSERT
  TO authenticated
  WITH CHECK (photographer_id = auth.uid());

DROP POLICY IF EXISTS "deliveries_select_own" ON public.deliveries;
DROP POLICY IF EXISTS "Users can view their own collections" ON public.deliveries;

CREATE POLICY "deliveries_select_own"
  ON public.deliveries
  FOR SELECT
  TO authenticated
  USING (photographer_id = auth.uid());

CREATE OR REPLACE FUNCTION public.delete_delivery_owned(p_delivery_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_rows integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  DELETE FROM public.deliveries d
  WHERE d.id = p_delivery_id
    AND d.photographer_id = auth.uid();

  GET DIAGNOSTICS deleted_rows = ROW_COUNT;
  RETURN deleted_rows;
END;
$$;

COMMENT ON FUNCTION public.delete_delivery_owned(uuid) IS
  'Deletes a delivery when the caller owns it (deliveries.photographer_id = auth.uid()).';

GRANT EXECUTE ON FUNCTION public.delete_delivery_owned(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
