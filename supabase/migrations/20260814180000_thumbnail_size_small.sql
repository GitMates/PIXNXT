-- Persist Design tab grid settings across reloads.

ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS cover_layout text;

ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS design_options jsonb;

COMMENT ON COLUMN public.deliveries.cover_layout IS
  'Cover template: center, left, novel, vintage, frame, stripe, divider, journal, stamp, outline, classic, none';

COMMENT ON COLUMN public.deliveries.design_options IS
  'Design grid snapshot: thumbnail_size, grid_style, grid_spacing, nav_style';
