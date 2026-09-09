-- Account status for admin User Management: disable accounts + track last login.
-- Run in Supabase Dashboard > SQL Editor.

ALTER TABLE public.photographers
  ADD COLUMN IF NOT EXISTS is_disabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz NULL;

COMMENT ON COLUMN public.photographers.is_disabled IS
  'Admin-only kill switch. TRUE blocks the photographer app (SidebarLayout gate).';
COMMENT ON COLUMN public.photographers.last_login_at IS
  'Stamped by the app on SIGNED_IN. Shown in admin User Management.';

-- Only admins can flip the disabled switch (same pattern as quota limits).
-- last_login_at stays writable by the owner so logins can stamp it.
CREATE OR REPLACE FUNCTION public.protect_photographer_disabled_flag()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_disabled IS DISTINCT FROM OLD.is_disabled
  THEN
    IF auth.uid() IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.admins a WHERE a.id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Only administrators can disable accounts';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_protect_photographer_disabled_flag ON public.photographers;
CREATE TRIGGER tr_protect_photographer_disabled_flag
BEFORE UPDATE ON public.photographers
FOR EACH ROW
EXECUTE FUNCTION public.protect_photographer_disabled_flag();
