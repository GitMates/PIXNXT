-- Mobile Gallery Apps: photographer-owned mobile gallery projects
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

CREATE POLICY mobile_gallery_apps_select_own ON public.mobile_gallery_apps
  FOR SELECT USING (photographer_id = auth.uid());

CREATE POLICY mobile_gallery_apps_insert_own ON public.mobile_gallery_apps
  FOR INSERT WITH CHECK (photographer_id = auth.uid());

CREATE POLICY mobile_gallery_apps_update_own ON public.mobile_gallery_apps
  FOR UPDATE USING (photographer_id = auth.uid());

CREATE POLICY mobile_gallery_apps_delete_own ON public.mobile_gallery_apps
  FOR DELETE USING (photographer_id = auth.uid());

COMMENT ON TABLE public.mobile_gallery_apps IS 'Mobile Gallery App projects for client PWA experiences.';
