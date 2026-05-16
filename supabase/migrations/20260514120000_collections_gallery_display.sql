-- Public gallery display: optional filenames under thumbnails + persisted client sort order.
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS show_filenames boolean NOT NULL DEFAULT false;

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS gallery_photo_sort text NOT NULL DEFAULT 'upload-new-old';

COMMENT ON COLUMN public.collections.show_filenames IS 'When true, client gallery shows each photo filename on thumbnails.';
COMMENT ON COLUMN public.collections.gallery_photo_sort IS 'Client gallery sort key: upload-new-old, upload-old-new, taken-new-old, taken-old-new, name-az, name-za, random.';
