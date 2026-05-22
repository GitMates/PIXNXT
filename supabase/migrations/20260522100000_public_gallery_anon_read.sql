-- Allow anonymous visitors to open published galleries (QR codes, share links).

DROP POLICY IF EXISTS "public_gallery_read_published_collections" ON public.collections;
CREATE POLICY "public_gallery_read_published_collections"
  ON public.collections
  FOR SELECT
  TO anon
  USING (status = 'published');

DROP POLICY IF EXISTS "public_gallery_read_photos_in_published_collections" ON public.photos;
CREATE POLICY "public_gallery_read_photos_in_published_collections"
  ON public.photos
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.collections c
      WHERE c.id = photos.collection_id
        AND c.status = 'published'
    )
  );

DROP POLICY IF EXISTS "public_gallery_read_sets_in_published_collections" ON public.sets;
CREATE POLICY "public_gallery_read_sets_in_published_collections"
  ON public.sets
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.collections c
      WHERE c.id = sets.collection_id
        AND c.status = 'published'
    )
  );

DROP POLICY IF EXISTS "public_gallery_read_photographer_branding" ON public.photographers;
CREATE POLICY "public_gallery_read_photographer_branding"
  ON public.photographers
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.collections c
      WHERE c.photographer_id = photographers.id
        AND c.status = 'published'
    )
  );
