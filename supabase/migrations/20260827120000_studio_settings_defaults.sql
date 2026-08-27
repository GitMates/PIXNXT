-- Studio-wide defaults for Settings → Delivering photos tabs.
-- Safe to re-run.

ALTER TABLE public.photographers
  ADD COLUMN IF NOT EXISTS guest_delivery_defaults jsonb,
  ADD COLUMN IF NOT EXISTS face_matching_defaults jsonb,
  ADD COLUMN IF NOT EXISTS access_defaults jsonb;

COMMENT ON COLUMN public.photographers.guest_delivery_defaults IS
  'Defaults for Guest Delivery on new deliveries (enabled, reg_close, channel, standee, etc.).';

COMMENT ON COLUMN public.photographers.face_matching_defaults IS
  'Studio face-matching accuracy defaults (match_certainty, hold_low_confidence, etc.).';

COMMENT ON COLUMN public.photographers.access_defaults IS
  'Default access mode for new deliveries (who_can_open: anyone|link_pin|named_email).';
