-- Showcase enquiry form: studio setting + public submissions

ALTER TABLE public.photographers
  ADD COLUMN IF NOT EXISTS showcase_enquiry_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.photographers.showcase_enquiry_enabled IS
  'When true, public Showcase pages show a contact/enquiry form.';

CREATE TABLE IF NOT EXISTS public.showcase_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  sender_email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS showcase_enquiries_photographer_created_idx
  ON public.showcase_enquiries (photographer_id, created_at DESC);

ALTER TABLE public.showcase_enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS showcase_enquiries_select_own ON public.showcase_enquiries;
CREATE POLICY showcase_enquiries_select_own
  ON public.showcase_enquiries
  FOR SELECT
  TO authenticated
  USING (photographer_id = auth.uid());

DROP POLICY IF EXISTS showcase_enquiries_update_own ON public.showcase_enquiries;
CREATE POLICY showcase_enquiries_update_own
  ON public.showcase_enquiries
  FOR UPDATE
  TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

DROP POLICY IF EXISTS showcase_enquiries_public_insert ON public.showcase_enquiries;
CREATE POLICY showcase_enquiries_public_insert
  ON public.showcase_enquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.photographers p
      WHERE p.id = photographer_id
        AND p.showcase_enabled IS NOT FALSE
        AND p.showcase_enquiry_enabled IS NOT FALSE
    )
  );
