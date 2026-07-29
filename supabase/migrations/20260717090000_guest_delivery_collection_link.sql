-- Link guest delivery events to client gallery collections
ALTER TABLE public.guest_delivery_events
  ADD COLUMN IF NOT EXISTS collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS guest_delivery_events_collection_id_idx
  ON public.guest_delivery_events(collection_id);

-- Flag on collections to indicate guest delivery is enabled
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS guest_delivery_enabled boolean NOT NULL DEFAULT false;
