-- Delete favorite lists as the collection owner, bypassing RLS on child tables
-- (nested RLS on favorite_items + favorite_lists often blocks plain client DELETEs).

CREATE OR REPLACE FUNCTION public.delete_favorite_list_owned(p_list_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_lists integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.favorite_lists fl
    INNER JOIN public.collections c ON c.id = fl.collection_id
    WHERE fl.id = p_list_id
      AND c.photographer_id = auth.uid()
  ) THEN
    RETURN 0;
  END IF;

  DELETE FROM public.favorite_items WHERE list_id = p_list_id;
  DELETE FROM public.favorite_lists WHERE id = p_list_id;
  GET DIAGNOSTICS deleted_lists = ROW_COUNT;
  RETURN deleted_lists;
END;
$$;

ALTER FUNCTION public.delete_favorite_list_owned(uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.delete_favorite_list_owned(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_favorite_list_owned(uuid) TO authenticated;

COMMENT ON FUNCTION public.delete_favorite_list_owned(uuid) IS
  'Deletes a favorite list and its items when the caller owns the collection (collections.photographer_id = auth.uid()).';
