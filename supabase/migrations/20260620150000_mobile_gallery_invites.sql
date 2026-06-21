-- Log of Mobile Gallery invite emails sent by photographers
CREATE TABLE IF NOT EXISTS public.mobile_gallery_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.mobile_gallery_apps(id) ON DELETE CASCADE,
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mobile_gallery_invites_app_id_idx
  ON public.mobile_gallery_invites(app_id);

CREATE INDEX IF NOT EXISTS mobile_gallery_invites_photographer_id_idx
  ON public.mobile_gallery_invites(photographer_id);

CREATE INDEX IF NOT EXISTS mobile_gallery_invites_created_at_idx
  ON public.mobile_gallery_invites(created_at DESC);

ALTER TABLE public.mobile_gallery_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mobile_gallery_invites_select_own ON public.mobile_gallery_invites;
CREATE POLICY mobile_gallery_invites_select_own ON public.mobile_gallery_invites
  FOR SELECT USING (photographer_id = auth.uid());

DROP POLICY IF EXISTS mobile_gallery_invites_insert_own ON public.mobile_gallery_invites;
CREATE POLICY mobile_gallery_invites_insert_own ON public.mobile_gallery_invites
  FOR INSERT WITH CHECK (photographer_id = auth.uid());

COMMENT ON TABLE public.mobile_gallery_invites IS 'Sent Mobile Gallery app invite emails.';
