-- Fix: relation "public.collections" does not exist (42P01) on photo upload.
--
-- After collections → deliveries rename, leftover RLS policies / SQL still
-- resolve the name "collections" at runtime. Restore dual-read via a VIEW
-- (same idea as DELIVERY_TABLES_LEGACY in the app) and restore simple
-- photographer-owned photos RLS (how uploads worked before the rename).

-- ---------------------------------------------------------------------------
-- 1) Compatibility view: public.collections → public.deliveries
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.collections CASCADE;

CREATE VIEW public.collections AS
SELECT * FROM public.deliveries;

COMMENT ON VIEW public.collections IS
  'Compatibility alias for public.deliveries after the collections → deliveries rename.';

GRANT SELECT ON public.collections TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Photos RLS — own-row model (no join to collections/deliveries required)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "photos_select_own" ON public.photos;
DROP POLICY IF EXISTS "photos_insert_own" ON public.photos;
DROP POLICY IF EXISTS "photos_update_own" ON public.photos;
DROP POLICY IF EXISTS "photos_delete_own" ON public.photos;
DROP POLICY IF EXISTS "photos_select_delivery_owner" ON public.photos;
DROP POLICY IF EXISTS "photos_insert_delivery_owner" ON public.photos;
DROP POLICY IF EXISTS "photos_update_delivery_owner" ON public.photos;
DROP POLICY IF EXISTS "photos_delete_delivery_owner" ON public.photos;
DROP POLICY IF EXISTS "photos_delete_collection_owner" ON public.photos;
DROP POLICY IF EXISTS "photos_select_collection_owner" ON public.photos;
DROP POLICY IF EXISTS "photos_insert_collection_owner" ON public.photos;
DROP POLICY IF EXISTS "photos_update_collection_owner" ON public.photos;
DROP POLICY IF EXISTS "Users can view their own photos" ON public.photos;
DROP POLICY IF EXISTS "Users can insert their own photos" ON public.photos;
DROP POLICY IF EXISTS "Users can update their own photos" ON public.photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON public.photos;

CREATE POLICY "photos_select_own"
  ON public.photos
  FOR SELECT
  TO authenticated
  USING (photographer_id = auth.uid());

CREATE POLICY "photos_insert_own"
  ON public.photos
  FOR INSERT
  TO authenticated
  WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "photos_update_own"
  ON public.photos
  FOR UPDATE
  TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "photos_delete_own"
  ON public.photos
  FOR DELETE
  TO authenticated
  USING (photographer_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3) RPCs that still hardcode public.collections at execute time
-- ---------------------------------------------------------------------------
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
    INNER JOIN public.deliveries c ON c.id = fl.collection_id
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
  USING public.deliveries c
  WHERE al.id = p_activity_id
    AND al.collection_id = c.id
    AND c.photographer_id = auth.uid();

  GET DIAGNOSTICS deleted_rows = ROW_COUNT;
  RETURN deleted_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_favorite_list(p_list_id uuid, p_session_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_list public.favorite_lists%ROWTYPE;
  v_photo_count integer;
  v_email text;
BEGIN
  IF p_list_id IS NULL OR p_session_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT fl.* INTO v_list
  FROM public.favorite_lists fl
  WHERE fl.id = p_list_id
    AND fl.session_id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  IF v_list.submitted_at IS NOT NULL THEN
    RETURN 0;
  END IF;

  SELECT count(*)::integer INTO v_photo_count
  FROM public.favorite_items fi
  WHERE fi.list_id = p_list_id;

  IF v_photo_count < 1 THEN
    RETURN 0;
  END IF;

  UPDATE public.favorite_lists
  SET submitted_at = now()
  WHERE id = p_list_id;

  SELECT cs.visitor_email INTO v_email
  FROM public.client_sessions cs
  WHERE cs.id = p_session_id;

  INSERT INTO public.activity_log (
    collection_id,
    photographer_id,
    event_type,
    visitor_email,
    session_id,
    metadata
  )
  SELECT
    c.id,
    c.photographer_id,
    'favorite_submit'::public.activity_type,
    v_email,
    p_session_id,
    jsonb_build_object(
      'list_id', p_list_id,
      'list_name', v_list.name,
      'photo_count', v_photo_count,
      'max_selection', v_list.max_selection
    )
  FROM public.deliveries c
  WHERE c.id = v_list.collection_id;

  RETURN 1;
END;
$$;

NOTIFY pgrst, 'reload schema';
