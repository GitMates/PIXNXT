-- Slideshow and social sharing toggles (General settings).
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS slideshow_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS social_sharing_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.collections.slideshow_enabled IS 'When false, hide slideshow control in public gallery.';
COMMENT ON COLUMN public.collections.social_sharing_enabled IS 'When false, hide share control in public gallery and photo grid.';
