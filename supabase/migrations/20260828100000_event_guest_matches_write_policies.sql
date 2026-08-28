-- Allow photographers to persist face-match rows during draft review (not only on publish via service role).

CREATE POLICY event_guest_matches_insert_own ON public.event_guest_matches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.guest_delivery_events e
      WHERE e.id = event_guest_matches.event_id
        AND e.photographer_id = auth.uid()
    )
  );

CREATE POLICY event_guest_matches_update_own ON public.event_guest_matches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.guest_delivery_events e
      WHERE e.id = event_guest_matches.event_id
        AND e.photographer_id = auth.uid()
    )
  );

CREATE POLICY event_guest_matches_delete_own ON public.event_guest_matches
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.guest_delivery_events e
      WHERE e.id = event_guest_matches.event_id
        AND e.photographer_id = auth.uid()
    )
  );
