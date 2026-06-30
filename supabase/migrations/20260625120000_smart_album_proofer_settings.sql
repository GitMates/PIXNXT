-- Photographer-wide album proofer defaults
CREATE TABLE IF NOT EXISTS public.smart_album_proofer_settings (
  photographer_id uuid PRIMARY KEY REFERENCES public.photographers(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.smart_album_proofer_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY smart_album_proofer_settings_select_own ON public.smart_album_proofer_settings
  FOR SELECT USING (photographer_id = auth.uid());

CREATE POLICY smart_album_proofer_settings_insert_own ON public.smart_album_proofer_settings
  FOR INSERT WITH CHECK (photographer_id = auth.uid());

CREATE POLICY smart_album_proofer_settings_update_own ON public.smart_album_proofer_settings
  FOR UPDATE USING (photographer_id = auth.uid());

COMMENT ON TABLE public.smart_album_proofer_settings IS 'Account-wide Smart Album proofer defaults (permissions, workflow, notifications).';

-- Per-album proofer settings (access, PIN, swaps cap, etc.)
ALTER TABLE public.smart_albums
  ADD COLUMN IF NOT EXISTS proofer_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.smart_albums.proofer_settings IS 'Per-album proofer settings: access level, password, PIN, revision caps, reminders.';
