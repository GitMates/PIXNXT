-- Run this once in Supabase Dashboard → SQL Editor
-- Project: oibvtecxxoqhvyejovsy (PIXNXT)
-- Or from CLI: supabase login && supabase db push --linked

-- Mobile Gallery Apps
CREATE TABLE IF NOT EXISTS public.mobile_gallery_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  name text NOT NULL,
  event_date date,
  slug text,
  icon_url text,
  cover_image_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mobile_gallery_apps_photographer_id_idx
  ON public.mobile_gallery_apps(photographer_id);

CREATE INDEX IF NOT EXISTS mobile_gallery_apps_created_at_idx
  ON public.mobile_gallery_apps(created_at DESC);

ALTER TABLE public.mobile_gallery_apps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mobile_gallery_apps_select_own ON public.mobile_gallery_apps;
CREATE POLICY mobile_gallery_apps_select_own ON public.mobile_gallery_apps
  FOR SELECT USING (photographer_id = auth.uid());

DROP POLICY IF EXISTS mobile_gallery_apps_insert_own ON public.mobile_gallery_apps;
CREATE POLICY mobile_gallery_apps_insert_own ON public.mobile_gallery_apps
  FOR INSERT WITH CHECK (photographer_id = auth.uid());

DROP POLICY IF EXISTS mobile_gallery_apps_update_own ON public.mobile_gallery_apps;
CREATE POLICY mobile_gallery_apps_update_own ON public.mobile_gallery_apps
  FOR UPDATE USING (photographer_id = auth.uid());

DROP POLICY IF EXISTS mobile_gallery_apps_delete_own ON public.mobile_gallery_apps;
CREATE POLICY mobile_gallery_apps_delete_own ON public.mobile_gallery_apps
  FOR DELETE USING (photographer_id = auth.uid());

-- Mobile Gallery Photos
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

DROP POLICY IF EXISTS mobile_gallery_photos_select_own ON public.mobile_gallery_photos;
CREATE POLICY mobile_gallery_photos_select_own ON public.mobile_gallery_photos
  FOR SELECT USING (photographer_id = auth.uid());

DROP POLICY IF EXISTS mobile_gallery_photos_insert_own ON public.mobile_gallery_photos;
CREATE POLICY mobile_gallery_photos_insert_own ON public.mobile_gallery_photos
  FOR INSERT WITH CHECK (photographer_id = auth.uid());

DROP POLICY IF EXISTS mobile_gallery_photos_update_own ON public.mobile_gallery_photos;
CREATE POLICY mobile_gallery_photos_update_own ON public.mobile_gallery_photos
  FOR UPDATE USING (photographer_id = auth.uid());

DROP POLICY IF EXISTS mobile_gallery_photos_delete_own ON public.mobile_gallery_photos;
CREATE POLICY mobile_gallery_photos_delete_own ON public.mobile_gallery_photos
  FOR DELETE USING (photographer_id = auth.uid());

-- Mobile Gallery module settings (contact page, domain, branding, email templates)
-- Drop legacy table if it used the old gallery_id schema
DROP TABLE IF EXISTS public.mobile_gallery_settings CASCADE;

CREATE TABLE public.mobile_gallery_settings (
  photographer_id uuid PRIMARY KEY REFERENCES public.photographers(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mobile_gallery_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mobile_gallery_settings_select_own ON public.mobile_gallery_settings;
CREATE POLICY mobile_gallery_settings_select_own ON public.mobile_gallery_settings
  FOR SELECT USING (photographer_id = auth.uid());

DROP POLICY IF EXISTS mobile_gallery_settings_insert_own ON public.mobile_gallery_settings;
CREATE POLICY mobile_gallery_settings_insert_own ON public.mobile_gallery_settings
  FOR INSERT WITH CHECK (photographer_id = auth.uid());

DROP POLICY IF EXISTS mobile_gallery_settings_update_own ON public.mobile_gallery_settings;
CREATE POLICY mobile_gallery_settings_update_own ON public.mobile_gallery_settings
  FOR UPDATE USING (photographer_id = auth.uid());
