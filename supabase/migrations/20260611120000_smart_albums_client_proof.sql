-- Client proof actions (approve album / submit changes) for photographer notifications.
ALTER TABLE public.smart_albums
  ADD COLUMN IF NOT EXISTS client_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_approved_by text,
  ADD COLUMN IF NOT EXISTS client_changes_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_changes_submitted_by text;

COMMENT ON COLUMN public.smart_albums.client_approved_at IS
  'When the client approved the album for binding (set by send-album-proof-email).';
COMMENT ON COLUMN public.smart_albums.client_approved_by IS
  'Client display name at approval time.';
COMMENT ON COLUMN public.smart_albums.client_changes_submitted_at IS
  'When the client submitted change requests (set by send-album-proof-email).';
COMMENT ON COLUMN public.smart_albums.client_changes_submitted_by IS
  'Client display name at change submission time.';
