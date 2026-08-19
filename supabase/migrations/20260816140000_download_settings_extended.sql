-- Extra Downloads settings from the delivery Downloads / Advanced UI.

ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS download_selling text NOT NULL DEFAULT 'off',
  ADD COLUMN IF NOT EXISTS download_price_film numeric,
  ADD COLUMN IF NOT EXISTS download_bundles jsonb,
  ADD COLUMN IF NOT EXISTS download_contact_mode text NOT NULL DEFAULT 'never',
  ADD COLUMN IF NOT EXISTS film_playback text NOT NULL DEFAULT 'adapt',
  ADD COLUMN IF NOT EXISTS single_film_download boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS video_downloads_enabled boolean NOT NULL DEFAULT false;

UPDATE public.deliveries
SET download_contact_mode = 'large'
WHERE large_download_contact = true
  AND download_contact_mode = 'never';

UPDATE public.deliveries
SET download_contact_mode = 'every'
WHERE download_contact_mode = 'always';

UPDATE public.deliveries
SET download_selling = 'full'
WHERE download_selling = 'off'
  AND COALESCE(download_price_full, 0) > 0;

UPDATE public.deliveries
SET download_selling = 'watermarked'
WHERE download_selling IN ('all', 'web');

COMMENT ON COLUMN public.deliveries.download_selling IS 'What visitors pay for: off, full, or watermarked.';
COMMENT ON COLUMN public.deliveries.download_price_film IS 'Price for a single film download. NULL or 0 means free.';
COMMENT ON COLUMN public.deliveries.download_bundles IS 'Bundle tiers as [{count, price}, ...].';
COMMENT ON COLUMN public.deliveries.download_contact_mode IS 'When to ask for a contact: never, large, or every.';
COMMENT ON COLUMN public.deliveries.film_playback IS 'Film playback: adapt or highest.';
COMMENT ON COLUMN public.deliveries.single_film_download IS 'Allow a visitor to take one film without the whole set.';
COMMENT ON COLUMN public.deliveries.video_downloads_enabled IS 'Whether films can be downloaded, separate from photographs.';

DROP VIEW IF EXISTS public.collections CASCADE;

CREATE VIEW public.collections AS
SELECT * FROM public.deliveries;

COMMENT ON VIEW public.collections IS
  'Compatibility alias for public.deliveries after the collections → deliveries rename.';

GRANT SELECT ON public.collections TO anon, authenticated, service_role;
