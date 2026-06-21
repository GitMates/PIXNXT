-- Mobile Gallery App photos
CREATE TABLE IF NOT EXISTS public.mobile_gallery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.mobile_gallery_apps(id) ON DELETE CASCADE,
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  filename text NOT NULL,
  full_url text NOT NULL,
  thumbnail_url text,
  storage_path text NOT NULL,
  size_bytes bigint,
  width integer,
  height integer,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mobile_gallery_photos_app_id_idx
  ON public.mobile_gallery_photos(app_id);

CREATE INDEX IF NOT EXISTS mobile_gallery_photos_photographer_id_idx
  ON public.mobile_gallery_photos(photographer_id);

CREATE INDEX IF NOT EXISTS mobile_gallery_photos_position_idx
  ON public.mobile_gallery_photos(app_id, position);

ALTER TABLE public.mobile_gallery_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY mobile_gallery_photos_select_own ON public.mobile_gallery_photos
  FOR SELECT USING (photographer_id = auth.uid());

CREATE POLICY mobile_gallery_photos_insert_own ON public.mobile_gallery_photos
  FOR INSERT WITH CHECK (photographer_id = auth.uid());

CREATE POLICY mobile_gallery_photos_update_own ON public.mobile_gallery_photos
  FOR UPDATE USING (photographer_id = auth.uid());

CREATE POLICY mobile_gallery_photos_delete_own ON public.mobile_gallery_photos
  FOR DELETE USING (photographer_id = auth.uid());

COMMENT ON TABLE public.mobile_gallery_photos IS 'Photos uploaded to Mobile Gallery Apps.';
