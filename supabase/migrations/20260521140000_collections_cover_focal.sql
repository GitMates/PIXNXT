-- Cover focal point (object-position 0–100), used by design preview and public gallery.
-- Use double precision (not numeric(4,2)) so 100 does not overflow.
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS cover_focal_x double precision
    CHECK (cover_focal_x IS NULL OR (cover_focal_x >= 0 AND cover_focal_x <= 100)),
  ADD COLUMN IF NOT EXISTS cover_focal_y double precision
    CHECK (cover_focal_y IS NULL OR (cover_focal_y >= 0 AND cover_focal_y <= 100));

COMMENT ON COLUMN public.collections.cover_focal_x IS 'Cover crop focal X (0–100), object-position horizontal.';
COMMENT ON COLUMN public.collections.cover_focal_y IS 'Cover crop focal Y (0–100), object-position vertical.';
