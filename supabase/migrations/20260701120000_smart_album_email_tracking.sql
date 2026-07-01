-- Track client contact + activity for automated reminder and status emails.
ALTER TABLE public.smart_albums
  ADD COLUMN IF NOT EXISTS client_contact_email text,
  ADD COLUMN IF NOT EXISTS client_contact_name text,
  ADD COLUMN IF NOT EXISTS client_last_activity_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS revision_ready_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_approved_notified_at timestamptz;

COMMENT ON COLUMN public.smart_albums.client_contact_email IS
  'Last known client email from preview interactions (used for automated client emails).';
COMMENT ON COLUMN public.smart_albums.client_last_activity_at IS
  'Last time the client interacted with the published album preview.';
COMMENT ON COLUMN public.smart_albums.client_reminder_sent_at IS
  'When the last inactivity reminder email was sent to the client.';
COMMENT ON COLUMN public.smart_albums.published_at IS
  'When the album was first published for client review.';
COMMENT ON COLUMN public.smart_albums.revision_ready_notified_at IS
  'When the client was last emailed that revisions are ready for review.';
COMMENT ON COLUMN public.smart_albums.client_approved_notified_at IS
  'When the client was last emailed their approval confirmation.';

CREATE INDEX IF NOT EXISTS smart_albums_published_reminders_idx
  ON public.smart_albums (photographer_id, status)
  WHERE status = 'published';
