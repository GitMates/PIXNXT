-- Grid settings selected at Smart Album creation time.
ALTER TABLE public.smart_albums
  ADD COLUMN IF NOT EXISTS grid_size text NOT NULL DEFAULT 'square',
  ADD COLUMN IF NOT EXISTS grid_layout text NOT NULL DEFAULT 'two-page';

