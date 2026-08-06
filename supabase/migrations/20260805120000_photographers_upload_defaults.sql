-- Photographer Upload defaults (Client Gallery settings → PHOTO HANDLING).
-- Safe to re-run: ADD COLUMN IF NOT EXISTS.

ALTER TABLE public.photographers
  ADD COLUMN IF NOT EXISTS default_language text NOT NULL DEFAULT 'english',
  ADD COLUMN IF NOT EXISTS filename_display text NOT NULL DEFAULT 'show',
  ADD COLUMN IF NOT EXISTS web_display_quality text NOT NULL DEFAULT 'high',
  ADD COLUMN IF NOT EXISTS sharpen_for_web boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sharpening_level text NOT NULL DEFAULT 'high',
  ADD COLUMN IF NOT EXISTS upload_quality text NOT NULL DEFAULT 'original',
  ADD COLUMN IF NOT EXISTS raw_photo_support boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'photographers_filename_display_check'
  ) THEN
    ALTER TABLE public.photographers
      ADD CONSTRAINT photographers_filename_display_check
      CHECK (filename_display IN ('show', 'hide'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'photographers_web_display_quality_check'
  ) THEN
    ALTER TABLE public.photographers
      ADD CONSTRAINT photographers_web_display_quality_check
      CHECK (web_display_quality IN ('standard', 'high', 'maximum'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'photographers_sharpening_level_check'
  ) THEN
    ALTER TABLE public.photographers
      ADD CONSTRAINT photographers_sharpening_level_check
      CHECK (sharpening_level IN ('none', 'optimal', 'high'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'photographers_upload_quality_check'
  ) THEN
    ALTER TABLE public.photographers
      ADD CONSTRAINT photographers_upload_quality_check
      CHECK (upload_quality IN ('original', 'high', 'web'));
  END IF;
END $$;

COMMENT ON COLUMN public.photographers.default_language IS
  'Default language for newly created deliveries.';
COMMENT ON COLUMN public.photographers.filename_display IS
  'Default show/hide filenames on delivery photos (show|hide).';
COMMENT ON COLUMN public.photographers.web_display_quality IS
  'Guest browser display derivative quality (standard|high|maximum).';
COMMENT ON COLUMN public.photographers.sharpen_for_web IS
  'When true, sharpen web/thumb display copies during upload prep.';
COMMENT ON COLUMN public.photographers.sharpening_level IS
  'Legacy sharpen amount for display copies (none|optimal|high).';
COMMENT ON COLUMN public.photographers.upload_quality IS
  'Original upload resize policy (original|high=3600px|web=2048px).';
COMMENT ON COLUMN public.photographers.raw_photo_support IS
  'Allow RAW files in deliveries (Studio/Pro plans).';
