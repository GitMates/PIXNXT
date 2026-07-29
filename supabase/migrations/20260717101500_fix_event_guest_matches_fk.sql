-- Drop the FK constraint on event_guest_matches.photo_id that references guest_delivery_photos.
-- When using collection photos, photo_id references the photos table instead.
ALTER TABLE public.event_guest_matches
  DROP CONSTRAINT IF EXISTS event_guest_matches_photo_id_fkey;
