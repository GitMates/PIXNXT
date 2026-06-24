-- Total R2 bytes used by each smart album's photo collection
ALTER TABLE public.smart_albums
  ADD COLUMN IF NOT EXISTS storage_bytes bigint NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.smart_albums.storage_bytes IS
  'Sum of uploaded photo bytes in R2 for this album (updated when assets sync).';
