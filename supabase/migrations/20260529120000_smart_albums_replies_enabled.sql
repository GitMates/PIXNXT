-- Toggle client/photographer threaded replies on album proofing.
ALTER TABLE public.smart_albums
  ADD COLUMN IF NOT EXISTS replies_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.smart_albums.replies_enabled IS 'When false, only top-level spread comments are allowed (no threaded replies).';
