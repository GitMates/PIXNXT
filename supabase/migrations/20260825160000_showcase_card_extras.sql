-- Showcase card extras (public title, client permission, curated photo set).

ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS showcase_display_name text,
  ADD COLUMN IF NOT EXISTS showcase_permission text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS showcase_permission_at timestamptz,
  ADD COLUMN IF NOT EXISTS showcase_permission_contact text,
  ADD COLUMN IF NOT EXISTS showcase_featured_photo_ids jsonb;

COMMENT ON COLUMN public.deliveries.showcase_display_name IS
  'Public Showcase title; NULL falls back to the delivery name.';
COMMENT ON COLUMN public.deliveries.showcase_permission IS
  'Client permission for Showcase: none | asked | approved.';
COMMENT ON COLUMN public.deliveries.showcase_permission_at IS
  'When permission was last asked or approved.';
COMMENT ON COLUMN public.deliveries.showcase_permission_contact IS
  'First name / label used in permission status (“Ask Sneha”).';
COMMENT ON COLUMN public.deliveries.showcase_featured_photo_ids IS
  'Optional subset of photo ids shown for this delivery on Showcase; NULL = all.';

ALTER TABLE public.deliveries
  DROP CONSTRAINT IF EXISTS deliveries_showcase_permission_check;

ALTER TABLE public.deliveries
  ADD CONSTRAINT deliveries_showcase_permission_check
  CHECK (showcase_permission IN ('none', 'asked', 'approved'));

DROP VIEW IF EXISTS public.collections CASCADE;

CREATE VIEW public.collections AS
SELECT * FROM public.deliveries;

COMMENT ON VIEW public.collections IS
  'Compatibility alias for public.deliveries after the collections → deliveries rename.';

GRANT SELECT ON public.collections TO anon, authenticated, service_role;
