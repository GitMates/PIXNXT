-- Split face quotas separately for normal delivery vs guest delivery.
-- 0 / NULL = unlimited, -1 = disabled.
-- Run this in Supabase Dashboard > SQL Editor if admin page shows
-- "column photographers.face_normal_image_limit does not exist".

ALTER TABLE public.photographers
  ADD COLUMN IF NOT EXISTS face_normal_image_limit integer,
  ADD COLUMN IF NOT EXISTS face_normal_image_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS face_guest_image_limit integer,
  ADD COLUMN IF NOT EXISTS face_guest_image_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS face_normal_delivery_limit integer,
  ADD COLUMN IF NOT EXISTS face_normal_delivery_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS face_guest_delivery_limit integer,
  ADD COLUMN IF NOT EXISTS face_guest_delivery_used integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.photographers.face_normal_image_limit IS
  'Max photos scannable by Find People in NORMAL deliveries. NULL or 0 = unlimited, -1 = disabled.';
COMMENT ON COLUMN public.photographers.face_guest_image_limit IS
  'Max photos scannable by face matching in GUEST deliveries. NULL or 0 = unlimited, -1 = disabled.';
COMMENT ON COLUMN public.photographers.face_normal_delivery_limit IS
  'Max NORMAL deliveries with Find People enabled. NULL or 0 = unlimited, -1 = disabled.';
COMMENT ON COLUMN public.photographers.face_guest_delivery_limit IS
  'Max GUEST delivery events. NULL or 0 = unlimited, -1 = disabled.';

-- Backfill from legacy columns so existing admins keep their settings.
UPDATE public.photographers
SET
  face_normal_image_limit = COALESCE(face_normal_image_limit, image_limit, 0),
  face_guest_image_limit = COALESCE(face_guest_image_limit, image_limit, 0),
  face_guest_delivery_limit = COALESCE(face_guest_delivery_limit, face_matching_delivery_limit, 0),
  face_normal_delivery_limit = COALESCE(face_normal_delivery_limit, 0)
WHERE face_normal_image_limit IS NULL
   OR face_guest_image_limit IS NULL
   OR face_guest_delivery_limit IS NULL
   OR face_normal_delivery_limit IS NULL;

CREATE OR REPLACE FUNCTION public.pixnxt_recount_split_face_quotas(photographer_uuid uuid)
RETURNS void AS $$
DECLARE
  v_normal_images integer;
  v_guest_images integer;
  v_normal_deliveries integer;
  v_guest_deliveries integer;
BEGIN
  IF photographer_uuid IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*)::integer INTO v_normal_images
  FROM public.photos p
  WHERE p.photographer_id = photographer_uuid
    AND NOT public.pixnxt_row_is_gallery_video(p.media_type::text, p.filename);

  SELECT COUNT(*)::integer INTO v_guest_images
  FROM public.guest_delivery_photos g
  WHERE g.photographer_id = photographer_uuid;

  BEGIN
    SELECT COUNT(*)::integer INTO v_normal_deliveries
    FROM public.deliveries d
    WHERE d.photographer_id = photographer_uuid;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    v_normal_deliveries := 0;
  END;

  SELECT COUNT(*)::integer INTO v_guest_deliveries
  FROM public.guest_delivery_events e
  WHERE e.photographer_id = photographer_uuid;

  UPDATE public.photographers
  SET
    face_normal_image_used = COALESCE(v_normal_images, 0),
    face_guest_image_used = COALESCE(v_guest_images, 0),
    face_normal_delivery_used = COALESCE(v_normal_deliveries, 0),
    face_guest_delivery_used = COALESCE(v_guest_deliveries, 0),
    image_used_count = COALESCE(v_normal_images, 0) + COALESCE(v_guest_images, 0),
    face_matching_delivery_used = COALESCE(v_guest_deliveries, 0)
  WHERE id = photographer_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.pixnxt_trigger_recount_split_face_quota()
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
    PERFORM public.pixnxt_recount_split_face_quotas(OLD.photographer_id);
  END IF;

  PERFORM public.pixnxt_recount_split_face_quotas(target_id);
  PERFORM public.pixnxt_recount_photographer_quotas(target_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_recount_split_photos ON public.photos;
CREATE TRIGGER tr_recount_split_photos
AFTER INSERT OR UPDATE OR DELETE ON public.photos
FOR EACH ROW
EXECUTE FUNCTION public.pixnxt_trigger_recount_split_face_quota();

DROP TRIGGER IF EXISTS tr_recount_split_guest_photos ON public.guest_delivery_photos;
CREATE TRIGGER tr_recount_split_guest_photos
AFTER INSERT OR UPDATE OR DELETE ON public.guest_delivery_photos
FOR EACH ROW
EXECUTE FUNCTION public.pixnxt_trigger_recount_split_face_quota();

DROP TRIGGER IF EXISTS tr_recount_split_guest_events ON public.guest_delivery_events;
CREATE TRIGGER tr_recount_split_guest_events
AFTER INSERT OR DELETE OR UPDATE OF photographer_id ON public.guest_delivery_events
FOR EACH ROW
EXECUTE FUNCTION public.pixnxt_trigger_recount_split_face_quota();

DROP TRIGGER IF EXISTS tr_recount_split_deliveries ON public.deliveries;
CREATE TRIGGER tr_recount_split_deliveries
AFTER INSERT OR DELETE OR UPDATE OF photographer_id ON public.deliveries
FOR EACH ROW
EXECUTE FUNCTION public.pixnxt_trigger_recount_split_face_quota();

CREATE OR REPLACE FUNCTION public.protect_split_face_quota_limits()
RETURNS trigger AS $$
BEGIN
  IF NEW.face_normal_image_limit IS DISTINCT FROM OLD.face_normal_image_limit
     OR NEW.face_guest_image_limit IS DISTINCT FROM OLD.face_guest_image_limit
     OR NEW.face_normal_delivery_limit IS DISTINCT FROM OLD.face_normal_delivery_limit
     OR NEW.face_guest_delivery_limit IS DISTINCT FROM OLD.face_guest_delivery_limit
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

DROP TRIGGER IF EXISTS tr_protect_split_face_quota_limits ON public.photographers;
CREATE TRIGGER tr_protect_split_face_quota_limits
BEFORE UPDATE ON public.photographers
FOR EACH ROW
EXECUTE FUNCTION public.protect_split_face_quota_limits();

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.photographers LOOP
    PERFORM public.pixnxt_recount_split_face_quotas(r.id);
  END LOOP;
END;
$$;
