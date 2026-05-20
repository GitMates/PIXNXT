-- Folder metadata for create-folder flow (Pixieset-style).
ALTER TABLE public.folders
  ADD COLUMN IF NOT EXISTS event_date date,
  ADD COLUMN IF NOT EXISTS guest_password_hash text;

COMMENT ON COLUMN public.folders.event_date IS 'Optional event date shown on folder / homepage.';
COMMENT ON COLUMN public.folders.guest_password_hash IS 'Optional password required to access collections in this folder.';
