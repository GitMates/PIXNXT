-- Keep guest registration open after publish (QR link always works).

UPDATE public.guest_delivery_events
SET registration_enabled = true
WHERE registration_enabled = false;

DROP POLICY IF EXISTS guest_delivery_events_public_registration_read ON public.guest_delivery_events;

CREATE POLICY guest_delivery_events_public_registration_read ON public.guest_delivery_events
  FOR SELECT TO anon, authenticated
  USING (slug IS NOT NULL);
