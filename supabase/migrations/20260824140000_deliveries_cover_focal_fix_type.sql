-- Fix deliveries.cover_focal_* if created as numeric(4,2) (max 99.99 → overflow at 100).
-- public.collections is a view of deliveries; the earlier collections-only type fix does not apply here.

DO $$
DECLARE
  r RECORD;
BEGIN
  IF to_regclass('public.deliveries') IS NULL THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    WHERE con.conrelid = 'public.deliveries'::regclass
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%cover_focal%'
  LOOP
    EXECUTE format('ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS cover_focal_x double precision,
  ADD COLUMN IF NOT EXISTS cover_focal_y double precision;

ALTER TABLE public.deliveries
  ALTER COLUMN cover_focal_x TYPE double precision
    USING (
      CASE
        WHEN cover_focal_x IS NULL THEN NULL
        ELSE LEAST(100::double precision, GREATEST(0::double precision, cover_focal_x::double precision))
      END
    ),
  ALTER COLUMN cover_focal_y TYPE double precision
    USING (
      CASE
        WHEN cover_focal_y IS NULL THEN NULL
        ELSE LEAST(100::double precision, GREATEST(0::double precision, cover_focal_y::double precision))
      END
    );

ALTER TABLE public.deliveries
  DROP CONSTRAINT IF EXISTS deliveries_cover_focal_x_check,
  DROP CONSTRAINT IF EXISTS deliveries_cover_focal_y_check;

ALTER TABLE public.deliveries
  ADD CONSTRAINT deliveries_cover_focal_x_check
    CHECK (cover_focal_x IS NULL OR (cover_focal_x >= 0 AND cover_focal_x <= 100)),
  ADD CONSTRAINT deliveries_cover_focal_y_check
    CHECK (cover_focal_y IS NULL OR (cover_focal_y >= 0 AND cover_focal_y <= 100));

COMMENT ON COLUMN public.deliveries.cover_focal_x IS 'Cover crop focal X (0–100).';
COMMENT ON COLUMN public.deliveries.cover_focal_y IS 'Cover crop focal Y (0–100).';

DROP VIEW IF EXISTS public.collections CASCADE;

CREATE VIEW public.collections AS
SELECT * FROM public.deliveries;

COMMENT ON VIEW public.collections IS
  'Compatibility alias for public.deliveries after the collections → deliveries rename.';

GRANT SELECT ON public.collections TO anon, authenticated, service_role;
