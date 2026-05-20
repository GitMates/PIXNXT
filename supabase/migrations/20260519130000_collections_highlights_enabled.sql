-- Allow photographers to remove the virtual Highlights set from a collection.

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS highlights_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.collections.highlights_enabled IS 'When false, the Highlights (unassigned photos) set is hidden in dashboard and public gallery.';
