-- Preset favorite lists: client selection cap + optional description (Pixieset-style).
ALTER TABLE public.favorite_lists
  ADD COLUMN IF NOT EXISTS max_selection integer,
  ADD COLUMN IF NOT EXISTS description text;

COMMENT ON COLUMN public.favorite_lists.max_selection IS 'Max photos client may add to this list; NULL = unlimited.';
COMMENT ON COLUMN public.favorite_lists.description IS 'Optional note shown to the photographer in dashboard.';
