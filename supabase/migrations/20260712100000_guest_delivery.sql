-- Guest Delivery: separate module for QR registration → face match → personal photo links

CREATE TABLE IF NOT EXISTS public.guest_delivery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  event_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  cover_image_url text,
  registration_enabled boolean NOT NULL DEFAULT true,
  match_threshold int NOT NULL DEFAULT 85,
  published_at timestamptz,
  photo_count int NOT NULL DEFAULT 0,
  guest_count int NOT NULL DEFAULT 0,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (photographer_id, slug)
);

CREATE INDEX IF NOT EXISTS guest_delivery_events_photographer_id_idx
  ON public.guest_delivery_events(photographer_id);

CREATE INDEX IF NOT EXISTS guest_delivery_events_created_at_idx
  ON public.guest_delivery_events(created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS guest_delivery_events_slug_unique_idx
  ON public.guest_delivery_events (slug);

CREATE TABLE IF NOT EXISTS public.guest_delivery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.guest_delivery_events(id) ON DELETE CASCADE,
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  filename text NOT NULL,
  full_url text NOT NULL,
  thumbnail_url text,
  storage_path text NOT NULL,
  size_bytes bigint,
  width integer,
  height integer,
  position integer NOT NULL DEFAULT 0,
  ai_indexed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS guest_delivery_photos_event_id_idx
  ON public.guest_delivery_photos(event_id);

CREATE INDEX IF NOT EXISTS guest_delivery_photos_photographer_id_idx
  ON public.guest_delivery_photos(photographer_id);

CREATE INDEX IF NOT EXISTS guest_delivery_photos_position_idx
  ON public.guest_delivery_photos(event_id, position);

CREATE TABLE IF NOT EXISTS public.event_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.guest_delivery_events(id) ON DELETE CASCADE,
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  access_token text NOT NULL,
  selfie_storage_path text,
  selfie_url text,
  registered_at timestamptz NOT NULL DEFAULT now(),
  delivery_status text NOT NULL DEFAULT 'pending'
    CHECK (delivery_status IN ('pending', 'matching', 'matched', 'sent', 'no_match', 'failed')),
  delivery_email_sent_at timestamptz,
  matched_photo_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, email),
  UNIQUE (access_token)
);

CREATE INDEX IF NOT EXISTS event_guests_event_id_idx
  ON public.event_guests(event_id);

CREATE INDEX IF NOT EXISTS event_guests_photographer_id_idx
  ON public.event_guests(photographer_id);

CREATE TABLE IF NOT EXISTS public.event_guest_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.guest_delivery_events(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES public.event_guests(id) ON DELETE CASCADE,
  photo_id uuid NOT NULL REFERENCES public.guest_delivery_photos(id) ON DELETE CASCADE,
  face_id text,
  similarity int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guest_id, photo_id)
);

CREATE INDEX IF NOT EXISTS event_guest_matches_guest_id_idx
  ON public.event_guest_matches(guest_id);

CREATE INDEX IF NOT EXISTS event_guest_matches_event_id_idx
  ON public.event_guest_matches(event_id);

-- RLS: guest_delivery_events
ALTER TABLE public.guest_delivery_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY guest_delivery_events_select_own ON public.guest_delivery_events
  FOR SELECT USING (photographer_id = auth.uid());

CREATE POLICY guest_delivery_events_insert_own ON public.guest_delivery_events
  FOR INSERT WITH CHECK (photographer_id = auth.uid());

CREATE POLICY guest_delivery_events_update_own ON public.guest_delivery_events
  FOR UPDATE USING (photographer_id = auth.uid());

CREATE POLICY guest_delivery_events_delete_own ON public.guest_delivery_events
  FOR DELETE USING (photographer_id = auth.uid());

CREATE POLICY guest_delivery_events_public_registration_read ON public.guest_delivery_events
  FOR SELECT TO anon, authenticated
  USING (slug IS NOT NULL AND registration_enabled = true);

-- RLS: guest_delivery_photos
ALTER TABLE public.guest_delivery_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY guest_delivery_photos_select_own ON public.guest_delivery_photos
  FOR SELECT USING (photographer_id = auth.uid());

CREATE POLICY guest_delivery_photos_insert_own ON public.guest_delivery_photos
  FOR INSERT WITH CHECK (photographer_id = auth.uid());

CREATE POLICY guest_delivery_photos_update_own ON public.guest_delivery_photos
  FOR UPDATE USING (photographer_id = auth.uid());

CREATE POLICY guest_delivery_photos_delete_own ON public.guest_delivery_photos
  FOR DELETE USING (photographer_id = auth.uid());

-- RLS: event_guests (photographer reads; inserts via service role API)
ALTER TABLE public.event_guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_guests_select_own ON public.event_guests
  FOR SELECT USING (photographer_id = auth.uid());

CREATE POLICY event_guests_update_own ON public.event_guests
  FOR UPDATE USING (photographer_id = auth.uid());

CREATE POLICY event_guests_delete_own ON public.event_guests
  FOR DELETE USING (photographer_id = auth.uid());

-- RLS: event_guest_matches
ALTER TABLE public.event_guest_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_guest_matches_select_own ON public.event_guest_matches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.guest_delivery_events e
      WHERE e.id = event_guest_matches.event_id
        AND e.photographer_id = auth.uid()
    )
  );

COMMENT ON TABLE public.guest_delivery_events IS 'Guest Delivery events with QR registration and personal photo links.';
COMMENT ON TABLE public.event_guests IS 'Guests registered via QR; selfie stored for publish-time face matching.';
COMMENT ON TABLE public.guest_delivery_photos IS 'Event photos uploaded by photographer; indexed on publish only.';
COMMENT ON TABLE public.event_guest_matches IS 'Photo matches per guest, populated during publish.';
