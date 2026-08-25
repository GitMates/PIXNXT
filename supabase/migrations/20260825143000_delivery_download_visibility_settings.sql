-- Download visibility + set allowlist (used by dashboard settings and public gallery).

ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS gallery_download_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS single_photo_download_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS selected_download_sets jsonb,
  ADD COLUMN IF NOT EXISTS pin_usage_limit integer,
  ADD COLUMN IF NOT EXISTS restrict_to_emails text;

COMMENT ON COLUMN public.deliveries.gallery_download_enabled IS 'Header DOWNLOAD button and bulk zip downloads.';
COMMENT ON COLUMN public.deliveries.single_photo_download_enabled IS 'Per-photo download icon on hover.';
COMMENT ON COLUMN public.deliveries.selected_download_sets IS 'Set names allowed for download; NULL or [] means all sets.';
COMMENT ON COLUMN public.deliveries.pin_usage_limit IS 'How many times the download PIN may be used; NULL = unlimited.';
COMMENT ON COLUMN public.deliveries.restrict_to_emails IS 'Comma-separated emails allowed to download; NULL = anyone.';

-- Backfill from master downloads switch where new columns were never set explicitly.
UPDATE public.deliveries
SET
  gallery_download_enabled = COALESCE(gallery_download_enabled, downloads_enabled, true),
  single_photo_download_enabled = COALESCE(single_photo_download_enabled, true)
WHERE gallery_download_enabled IS DISTINCT FROM COALESCE(downloads_enabled, true)
   OR single_photo_download_enabled IS NULL;

DROP VIEW IF EXISTS public.collections CASCADE;

CREATE VIEW public.collections AS
SELECT * FROM public.deliveries;

COMMENT ON VIEW public.collections IS
  'Compatibility alias for public.deliveries after the collections → deliveries rename.';

GRANT SELECT ON public.collections TO anon, authenticated, service_role;
