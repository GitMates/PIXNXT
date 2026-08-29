-- Account security fields for Settings → Your account → Signing in.

ALTER TABLE public.photographers
  ADD COLUMN IF NOT EXISTS two_factor_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS login_password_set boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS account_notifications jsonb,
  ADD COLUMN IF NOT EXISTS active_sessions jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.photographers.two_factor_enabled IS
  'Whether the photographer wants two-step verification after password sign-in.';

COMMENT ON COLUMN public.photographers.login_password_set IS
  'True after the photographer has set a password (email identity).';

COMMENT ON COLUMN public.photographers.password_changed_at IS
  'When the photographer last changed their password.';

COMMENT ON COLUMN public.photographers.account_notifications IS
  'Notification preferences for the photographer account (client activity, orders, etc.).';

COMMENT ON COLUMN public.photographers.active_sessions IS
  'Tracked sign-in sessions for the account security page (device label, location, last active).';
