-- Add share_link_paused_at column to smart_albums table to persist pause timestamp in DB
ALTER TABLE public.smart_albums
  ADD COLUMN IF NOT EXISTS share_link_paused_at timestamptz;

COMMENT ON COLUMN public.smart_albums.share_link_paused_at IS 'Timestamp when photographer paused client access / link sharing.';
