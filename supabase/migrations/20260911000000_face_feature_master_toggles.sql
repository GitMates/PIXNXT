-- Master on/off switches for face recognition, separate for normal vs guest.
-- When OFF, the Find People / face-matching UI is hidden and server checks fail fast.
-- Run in Supabase Dashboard > SQL Editor.

ALTER TABLE public.photographers
  ADD COLUMN IF NOT EXISTS face_normal_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS face_guest_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.photographers.face_normal_enabled IS
  'Master switch for Find People in NORMAL deliveries. FALSE hides the Find People button.';
COMMENT ON COLUMN public.photographers.face_guest_enabled IS
  'Master switch for face matching in GUEST deliveries. FALSE blocks guest event creation/publish.';

-- Backfill: if both limits are disabled (-1), keep feature off; otherwise on.
UPDATE public.photographers
SET
  face_normal_enabled = NOT (
    COALESCE(face_normal_image_limit, image_limit, 0) = -1
    AND COALESCE(face_normal_delivery_limit, 0) = -1
  ),
  face_guest_enabled = NOT (
    COALESCE(face_guest_image_limit, image_limit, 0) = -1
    AND COALESCE(face_guest_delivery_limit, face_matching_delivery_limit, 0) = -1
  )
WHERE face_normal_enabled IS NULL OR face_guest_enabled IS NULL;

-- Only admins can flip the switches (same pattern as quota limits).
CREATE OR REPLACE FUNCTION public.protect_face_feature_flags()
RETURNS trigger AS $$
BEGIN
  IF NEW.face_normal_enabled IS DISTINCT FROM OLD.face_normal_enabled
     OR NEW.face_guest_enabled IS DISTINCT FROM OLD.face_guest_enabled
  THEN
    IF auth.uid() IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.admins a WHERE a.id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Only administrators can change face recognition access';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_protect_face_feature_flags ON public.photographers;
CREATE TRIGGER tr_protect_face_feature_flags
BEFORE UPDATE ON public.photographers
FOR EACH ROW
EXECUTE FUNCTION public.protect_face_feature_flags();
