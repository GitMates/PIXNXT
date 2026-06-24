-- One-time notification when a client first leaves feedback via the shared preview link.
ALTER TABLE public.smart_albums
  ADD COLUMN IF NOT EXISTS client_commenting_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_commenting_started_by text;

COMMENT ON COLUMN public.smart_albums.client_commenting_started_at IS
  'When the photographer was first notified that a client started commenting (send-album-proof-email).';
COMMENT ON COLUMN public.smart_albums.client_commenting_started_by IS
  'Client display name at first-comment notification time.';
