-- Fix cover_focal_* if created as numeric(4,2) etc. (max 99.99 → "numeric field overflow" at 100).
ALTER TABLE public.collections
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
