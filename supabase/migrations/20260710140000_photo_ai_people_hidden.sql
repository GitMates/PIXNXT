-- Allow photographers to hide specific people from client gallery / share link
ALTER TABLE public.photo_ai_people
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS photo_ai_people_collection_visible_idx
  ON public.photo_ai_people(collection_id)
  WHERE is_hidden = false;

COMMENT ON COLUMN public.photo_ai_people.is_hidden IS 'When true, person is hidden from public gallery and preview.';
