-- After collections → deliveries rename, plpgsql RPCs still hardcode public.collections
-- (resolved at execute time). Recreate RPCs + RLS policies that subquery the parent.
-- Safe to re-run: CREATE OR REPLACE / DROP POLICY IF EXISTS.

-- ---------------------------------------------------------------------------
-- RPCs
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

COMMENT ON FUNCTION public.delete_favorite_list_owned(uuid) IS
  'Deletes a favorite list and its items when the caller owns the delivery (deliveries.photographer_id = auth.uid()).';

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

COMMENT ON FUNCTION public.delete_activity_log_owned(bigint) IS
  'Deletes one activity_log row when the caller owns the delivery (deliveries.photographer_id = auth.uid()).';

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

COMMENT ON FUNCTION public.submit_favorite_list(uuid, uuid) IS
  'Locks a visitor favorite list after confirm; requires at least one photo.';

-- ---------------------------------------------------------------------------
-- RLS policies that subquery deliveries (rewrite text for clarity + dumps)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "favorite_items_delete_collection_owner" ON public.favorite_items;
DROP POLICY IF EXISTS "favorite_items_delete_delivery_owner" ON public.favorite_items;
CREATE POLICY "favorite_items_delete_delivery_owner"
  ON public.favorite_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.favorite_lists fl
      JOIN public.deliveries d ON d.id = fl.collection_id
      WHERE fl.id = favorite_items.list_id
        AND d.photographer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "favorite_lists_delete_collection_owner" ON public.favorite_lists;
DROP POLICY IF EXISTS "favorite_lists_delete_delivery_owner" ON public.favorite_lists;
CREATE POLICY "favorite_lists_delete_delivery_owner"
  ON public.favorite_lists
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.deliveries d
      WHERE d.id = favorite_lists.collection_id
        AND d.photographer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "favorite_lists_select_collection_owner" ON public.favorite_lists;
DROP POLICY IF EXISTS "favorite_lists_select_delivery_owner" ON public.favorite_lists;
CREATE POLICY "favorite_lists_select_delivery_owner"
  ON public.favorite_lists
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.deliveries d
      WHERE d.id = favorite_lists.collection_id
        AND d.photographer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "favorite_lists_update_collection_owner" ON public.favorite_lists;
DROP POLICY IF EXISTS "favorite_lists_update_delivery_owner" ON public.favorite_lists;
CREATE POLICY "favorite_lists_update_delivery_owner"
  ON public.favorite_lists
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.deliveries d
      WHERE d.id = favorite_lists.collection_id
        AND d.photographer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.deliveries d
      WHERE d.id = favorite_lists.collection_id
        AND d.photographer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "sets_delete_collection_owner" ON public.sets;
DROP POLICY IF EXISTS "sets_delete_delivery_owner" ON public.sets;
CREATE POLICY "sets_delete_delivery_owner"
  ON public.sets
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.deliveries d
      WHERE d.id = sets.collection_id
        AND d.photographer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "photos_delete_collection_owner" ON public.photos;
DROP POLICY IF EXISTS "photos_delete_delivery_owner" ON public.photos;
CREATE POLICY "photos_delete_delivery_owner"
  ON public.photos
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.deliveries d
      WHERE d.id = photos.collection_id
        AND d.photographer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "activity_log_delete_collection_owner" ON public.activity_log;
DROP POLICY IF EXISTS "activity_log_delete_delivery_owner" ON public.activity_log;
CREATE POLICY "activity_log_delete_delivery_owner"
  ON public.activity_log
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.deliveries d
      WHERE d.id = activity_log.collection_id
        AND d.photographer_id = auth.uid()
    )
  );

-- Public gallery read (policy may already sit on deliveries after table rename)
DROP POLICY IF EXISTS "public_gallery_read_published_collections" ON public.deliveries;
DROP POLICY IF EXISTS "public_gallery_read_published_deliveries" ON public.deliveries;
CREATE POLICY "public_gallery_read_published_deliveries"
  ON public.deliveries
  FOR SELECT
  TO anon
  USING (status = 'published');

DROP POLICY IF EXISTS "public_gallery_read_photos_in_published_collections" ON public.photos;
DROP POLICY IF EXISTS "public_gallery_read_photos_in_published_deliveries" ON public.photos;
CREATE POLICY "public_gallery_read_photos_in_published_deliveries"
  ON public.photos
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.deliveries d
      WHERE d.id = photos.collection_id
        AND d.status = 'published'
    )
  );

DROP POLICY IF EXISTS "public_gallery_read_sets_in_published_collections" ON public.sets;
DROP POLICY IF EXISTS "public_gallery_read_sets_in_published_deliveries" ON public.sets;
CREATE POLICY "public_gallery_read_sets_in_published_deliveries"
  ON public.sets
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.deliveries d
      WHERE d.id = sets.collection_id
        AND d.status = 'published'
    )
  );

DROP POLICY IF EXISTS "public_gallery_read_photographer_branding" ON public.photographers;
CREATE POLICY "public_gallery_read_photographer_branding"
  ON public.photographers
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.deliveries d
      WHERE d.photographer_id = photographers.id
        AND d.status = 'published'
    )
    OR EXISTS (
      SELECT 1
      FROM public.mobile_gallery_apps mga
      WHERE mga.photographer_id = photographers.id
        AND mga.status = 'published'
    )
  );

-- Photo AI policies (only if tables exist)
DO $$
BEGIN
  IF to_regclass('public.photo_ai_metadata') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS photo_ai_metadata_select_own ON public.photo_ai_metadata';
    EXECUTE $p$
      CREATE POLICY photo_ai_metadata_select_own ON public.photo_ai_metadata
        FOR SELECT USING (
          photographer_id = auth.uid()
          OR collection_id IN (
            SELECT d.id FROM public.deliveries d
            WHERE d.id = photo_ai_metadata.collection_id
              AND d.status = 'published'
          )
        )
    $p$;
  END IF;

  IF to_regclass('public.photo_ai_people') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS photo_ai_people_select_own ON public.photo_ai_people';
    EXECUTE $p$
      CREATE POLICY photo_ai_people_select_own ON public.photo_ai_people
        FOR SELECT USING (
          photographer_id = auth.uid()
          OR collection_id IN (
            SELECT d.id FROM public.deliveries d
            WHERE d.id = photo_ai_people.collection_id
              AND d.status = 'published'
          )
        )
    $p$;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Index rename (cosmetic; skip if already renamed)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'collections_folder_id_idx'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'deliveries_folder_id_idx'
  ) THEN
    ALTER INDEX public.collections_folder_id_idx RENAME TO deliveries_folder_id_idx;
  END IF;
END $$;
