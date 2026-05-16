-- Delete activity_log rows for collection owners (download / other activity tabs).
-- Direct DELETE from the client often matches 0 rows under RLS while returning no error.

CREATE OR REPLACE FUNCTION public.delete_activity_log_owned(p_activity_id bigint)
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

  DELETE FROM public.activity_log al
  USING public.collections c
  WHERE al.id = p_activity_id
    AND al.collection_id = c.id
    AND c.photographer_id = auth.uid();

  GET DIAGNOSTICS deleted_rows = ROW_COUNT;
  RETURN deleted_rows;
END;
$$;

ALTER FUNCTION public.delete_activity_log_owned(bigint) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.delete_activity_log_owned(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_activity_log_owned(bigint) TO authenticated;

COMMENT ON FUNCTION public.delete_activity_log_owned(bigint) IS
  'Deletes one activity_log row when the caller owns the collection (collections.photographer_id = auth.uid()).';
