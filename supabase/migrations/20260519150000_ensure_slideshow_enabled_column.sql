-- Ensure slideshow_enabled exists (social_sharing_enabled may already be present on older DBs).
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS slideshow_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.collections.slideshow_enabled IS 'When false, hide slideshow control in public gallery.';
