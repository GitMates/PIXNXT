-- Per-crop cover focal points (website, desktop, phone, card, email).

ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS cover_focals jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.deliveries.cover_focals IS
  'Per-surface cover crop focals: {website,desktop,phone,card,email:{x,y}} with x/y 0–100.';

UPDATE public.deliveries
SET cover_focals = jsonb_build_object(
  'website', jsonb_build_object('x', COALESCE(cover_focal_x, 50), 'y', COALESCE(cover_focal_y, 50)),
  'desktop', jsonb_build_object('x', COALESCE(cover_focal_x, 50), 'y', COALESCE(cover_focal_y, 50)),
  'phone', jsonb_build_object('x', COALESCE(cover_focal_x, 50), 'y', COALESCE(cover_focal_y, 50)),
  'card', jsonb_build_object('x', COALESCE(cover_focal_x, 50), 'y', COALESCE(cover_focal_y, 50)),
  'email', jsonb_build_object('x', COALESCE(cover_focal_x, 50), 'y', COALESCE(cover_focal_y, 50))
)
WHERE cover_focals = '{}'::jsonb;

DROP VIEW IF EXISTS public.collections CASCADE;

CREATE VIEW public.collections AS
SELECT * FROM public.deliveries;

COMMENT ON VIEW public.collections IS
  'Compatibility alias for public.deliveries after the collections → deliveries rename.';

GRANT SELECT ON public.collections TO anon, authenticated, service_role;
