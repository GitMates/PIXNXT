-- Custom domain connection status for client gallery (Pixieset-style CNAME flow).

ALTER TABLE public.photographers
  ADD COLUMN IF NOT EXISTS custom_domain_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS custom_domain_verified_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.photographers.custom_domain IS
  'Verified custom subdomain for client galleries (e.g. gallery.yourdomain.com).';
COMMENT ON COLUMN public.photographers.custom_domain_status IS
  'none | pending | verified | failed';
COMMENT ON COLUMN public.photographers.custom_domain_verified_at IS
  'When DNS verification last succeeded.';

CREATE UNIQUE INDEX IF NOT EXISTS photographers_custom_domain_unique
  ON public.photographers (lower(custom_domain))
  WHERE custom_domain IS NOT NULL AND custom_domain <> '';
