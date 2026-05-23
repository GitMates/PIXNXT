-- Starred flag and filter fields for Smart Albums
ALTER TABLE public.smart_albums
  ADD COLUMN IF NOT EXISTS is_starred boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS category_tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS expiry_date date;

CREATE INDEX IF NOT EXISTS smart_albums_is_starred_idx ON public.smart_albums(photographer_id, is_starred)
  WHERE is_starred = true;
