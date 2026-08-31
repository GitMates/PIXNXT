-- Paid digital downloads on deliveries (store-wide toggle + legacy single/all prices).

ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS digital_download_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS digital_download_price_single numeric(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS digital_download_price_all numeric(10, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.deliveries.digital_download_enabled IS 'When true, gallery downloads require purchase (single or entire delivery).';
COMMENT ON COLUMN public.deliveries.digital_download_price_single IS 'Legacy flat price for one photo; synced from store Default tier 1 on save.';
COMMENT ON COLUMN public.deliveries.digital_download_price_all IS 'Legacy flat price for entire delivery; synced from store Default tier 10 on save.';
