-- Link client comments to a photo slot (1 = left, 2 = right) within a spread.
ALTER TABLE public.smart_album_comments
  ADD COLUMN IF NOT EXISTS photo_slot smallint CHECK (photo_slot IS NULL OR photo_slot IN (1, 2));
