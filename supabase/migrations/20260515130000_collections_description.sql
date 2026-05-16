-- Highlights / gallery storytelling: optional text shown on the public gallery (virtual Highlights set).
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS description text;

COMMENT ON COLUMN public.collections.description IS 'Optional narrative shown on the client gallery for the Highlights (unassigned) view; complements per-set descriptions on sets.';
