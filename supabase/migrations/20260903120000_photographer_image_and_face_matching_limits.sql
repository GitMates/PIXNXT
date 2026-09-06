-- Account quotas: image count and face-matching (guest delivery) events.
-- Limits are set by admins. 0 / NULL means unlimited.

ALTER TABLE public.photographers
  ADD COLUMN IF NOT EXISTS image_limit integer,
  ADD COLUMN IF NOT EXISTS image_used_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS face_matching_delivery_limit integer,
  ADD COLUMN IF NOT EXISTS face_matching_delivery_used integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.photographers.image_limit IS
  'Max images across deliveries, guest delivery, and mobile gallery. NULL or 0 = unlimited.';
COMMENT ON COLUMN public.photographers.image_used_count IS
  'Maintained count of uploaded images (excludes gallery videos).';
COMMENT ON COLUMN public.photographers.face_matching_delivery_limit IS
  'Max face-matching / guest delivery events. NULL or 0 = unlimited.';
COMMENT ON COLUMN public.photographers.face_matching_delivery_used IS
  'Maintained count of guest_delivery_events for this photographer.';

CREATE OR REPLACE FUNCTION public.pixnxt_row_is_gallery_video(p_media_type text, p_filename text)
RETURNS boolean AS $$
BEGIN
  IF to_regprocedure('public.pixnxt_is_gallery_video(text, text)') IS NOT NULL THEN
    RETURN public.pixnxt_is_gallery_video(p_media_type, p_filename);
  END IF;
  RETURN COALESCE(p_media_type, '') = 'video';
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.pixnxt_recount_photographer_quotas(photographer_uuid uuid)
RETURNS void AS $$
DECLARE
  v_images integer;
  v_events integer;
BEGIN
  IF photographer_uuid IS NULL THEN
    RETURN;
  END IF;

  SELECT
    (
      SELECT COUNT(*)::integer
      FROM public.photos p
      WHERE p.photographer_id = photographer_uuid
        AND NOT public.pixnxt_row_is_gallery_video(p.media_type::text, p.filename)
    )
    + COALESCE((
      SELECT COUNT(*)::integer
      FROM public.guest_delivery_photos g
      WHERE g.photographer_id = photographer_uuid
    ), 0)
    + COALESCE((
      SELECT COUNT(*)::integer
      FROM public.mobile_gallery_photos m
      WHERE m.photographer_id = photographer_uuid
    ), 0)
  INTO v_images;

  SELECT COUNT(*)::integer
  INTO v_events
  FROM public.guest_delivery_events e
  WHERE e.photographer_id = photographer_uuid;

  UPDATE public.photographers
  SET
    image_used_count = COALESCE(v_images, 0),
    face_matching_delivery_used = COALESCE(v_events, 0)
  WHERE id = photographer_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.pixnxt_trigger_recount_image_quota()
RETURNS trigger AS $$
DECLARE
  target_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_id := OLD.photographer_id;
  ELSE
    target_id := NEW.photographer_id;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.photographer_id IS DISTINCT FROM NEW.photographer_id THEN
    PERFORM public.pixnxt_recount_photographer_quotas(OLD.photographer_id);
  END IF;

  PERFORM public.pixnxt_recount_photographer_quotas(target_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_recount_image_quota_photos ON public.photos;
CREATE TRIGGER tr_recount_image_quota_photos
AFTER INSERT OR UPDATE OR DELETE ON public.photos
FOR EACH ROW
EXECUTE FUNCTION public.pixnxt_trigger_recount_image_quota();

DROP TRIGGER IF EXISTS tr_recount_image_quota_guest_photos ON public.guest_delivery_photos;
CREATE TRIGGER tr_recount_image_quota_guest_photos
AFTER INSERT OR UPDATE OR DELETE ON public.guest_delivery_photos
FOR EACH ROW
EXECUTE FUNCTION public.pixnxt_trigger_recount_image_quota();

DROP TRIGGER IF EXISTS tr_recount_image_quota_mobile_photos ON public.mobile_gallery_photos;
CREATE TRIGGER tr_recount_image_quota_mobile_photos
AFTER INSERT OR UPDATE OR DELETE ON public.mobile_gallery_photos
FOR EACH ROW
EXECUTE FUNCTION public.pixnxt_trigger_recount_image_quota();

DROP TRIGGER IF EXISTS tr_recount_face_matching_events ON public.guest_delivery_events;
CREATE TRIGGER tr_recount_face_matching_events
AFTER INSERT OR DELETE OR UPDATE OF photographer_id ON public.guest_delivery_events
FOR EACH ROW
EXECUTE FUNCTION public.pixnxt_trigger_recount_image_quota();

CREATE OR REPLACE FUNCTION public.protect_photographer_quota_limits()
RETURNS trigger AS $$
BEGIN
  IF NEW.storage_limit_bytes IS DISTINCT FROM OLD.storage_limit_bytes
     OR NEW.image_limit IS DISTINCT FROM OLD.image_limit
     OR NEW.face_matching_delivery_limit IS DISTINCT FROM OLD.face_matching_delivery_limit
  THEN
    IF auth.uid() IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.admins a WHERE a.id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Only administrators can change account limits';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_protect_photographer_quota_limits ON public.photographers;
CREATE TRIGGER tr_protect_photographer_quota_limits
BEFORE UPDATE ON public.photographers
FOR EACH ROW
EXECUTE FUNCTION public.protect_photographer_quota_limits();

DROP POLICY IF EXISTS photographers_admin_select ON public.photographers;
CREATE POLICY photographers_admin_select ON public.photographers
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.id = auth.uid()));

DROP POLICY IF EXISTS photographers_admin_update ON public.photographers;
CREATE POLICY photographers_admin_update ON public.photographers
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.id = auth.uid()));

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.photographers LOOP
    PERFORM public.pixnxt_recount_photographer_quotas(r.id);
  END LOOP;
END;
$$;
