-- Module-level settings for Mobile Gallery (contact page, domain, branding)
CREATE TABLE IF NOT EXISTS public.mobile_gallery_settings (
  photographer_id uuid PRIMARY KEY REFERENCES public.photographers(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mobile_gallery_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY mobile_gallery_settings_select_own ON public.mobile_gallery_settings
  FOR SELECT USING (photographer_id = auth.uid());

CREATE POLICY mobile_gallery_settings_insert_own ON public.mobile_gallery_settings
  FOR INSERT WITH CHECK (photographer_id = auth.uid());

CREATE POLICY mobile_gallery_settings_update_own ON public.mobile_gallery_settings
  FOR UPDATE USING (photographer_id = auth.uid());

COMMENT ON TABLE public.mobile_gallery_settings IS 'Account-wide Mobile Gallery module settings.';
