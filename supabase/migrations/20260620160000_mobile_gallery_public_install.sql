-- Public install links for published Mobile Gallery apps (/m/:slug)

CREATE UNIQUE INDEX IF NOT EXISTS mobile_gallery_apps_slug_unique_idx
  ON public.mobile_gallery_apps (slug)
  WHERE slug IS NOT NULL;

DROP POLICY IF EXISTS mobile_gallery_apps_public_install_read ON public.mobile_gallery_apps;
CREATE POLICY mobile_gallery_apps_public_install_read
  ON public.mobile_gallery_apps
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published' AND slug IS NOT NULL);

DROP POLICY IF EXISTS mobile_gallery_photos_public_read ON public.mobile_gallery_photos;
CREATE POLICY mobile_gallery_photos_public_read
  ON public.mobile_gallery_photos
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.mobile_gallery_apps a
      WHERE a.id = mobile_gallery_photos.app_id
        AND a.status = 'published'
    )
  );

DROP POLICY IF EXISTS mobile_gallery_settings_public_branding ON public.mobile_gallery_settings;
CREATE POLICY mobile_gallery_settings_public_branding
  ON public.mobile_gallery_settings
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.mobile_gallery_apps a
      WHERE a.photographer_id = mobile_gallery_settings.photographer_id
        AND a.status = 'published'
    )
  );

DROP POLICY IF EXISTS public_gallery_read_photographer_branding ON public.photographers;
CREATE POLICY public_gallery_read_photographer_branding
  ON public.photographers
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.collections c
      WHERE c.photographer_id = photographers.id
        AND c.status = 'published'
    )
    OR EXISTS (
      SELECT 1
      FROM public.mobile_gallery_apps mga
      WHERE mga.photographer_id = photographers.id
        AND mga.status = 'published'
    )
  );
