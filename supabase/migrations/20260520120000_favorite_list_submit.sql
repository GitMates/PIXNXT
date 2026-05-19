-- Visitor submits a favorite list (locks selection, logs activity for photographer).

ALTER TABLE public.favorite_lists
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

COMMENT ON COLUMN public.favorite_lists.submitted_at IS
  'When the client confirmed their selection; NULL = still editable.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'activity_type'
      AND e.enumlabel = 'favorite_submit'
  ) THEN
    ALTER TYPE public.activity_type ADD VALUE 'favorite_submit';
  END IF;
END $$;

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
  FROM public.collections c
  WHERE c.id = v_list.collection_id;

  RETURN 1;
END;
$$;

ALTER FUNCTION public.submit_favorite_list(uuid, uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.submit_favorite_list(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_favorite_list(uuid, uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.submit_favorite_list(uuid, uuid) IS
  'Locks a visitor favorite list after confirm; requires at least one photo.';
