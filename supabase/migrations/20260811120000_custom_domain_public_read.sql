-- Allow anonymous visitors on a photographer custom domain to resolve the studio
-- even before a delivery is published. Only verified custom domains are public.

DROP POLICY IF EXISTS "public_read_verified_custom_domain_photographer" ON public.photographers;

CREATE POLICY "public_read_verified_custom_domain_photographer"
  ON public.photographers
  FOR SELECT
  TO anon, authenticated
  USING (
    custom_domain IS NOT NULL
    AND custom_domain <> ''
    AND custom_domain_status = 'verified'
  );
