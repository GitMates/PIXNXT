-- Restore delivery_reminders access. DROP VIEW ... CASCADE on public.collections
-- can remove reminder RLS policies that still named the compatibility view,
-- which leaves RLS enabled with no policies (every insert/update denied).

GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_reminders TO authenticated;
GRANT SELECT ON public.delivery_reminders TO anon;
GRANT ALL ON public.delivery_reminders TO service_role;

DROP POLICY IF EXISTS "Users can view reminders for their own collections" ON public.delivery_reminders;
DROP POLICY IF EXISTS "Users can view reminders for their own deliveries" ON public.delivery_reminders;
CREATE POLICY "Users can view reminders for their own deliveries"
  ON public.delivery_reminders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.id = delivery_reminders.collection_id
        AND d.photographer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert reminders for their own collections" ON public.delivery_reminders;
DROP POLICY IF EXISTS "Users can insert reminders for their own deliveries" ON public.delivery_reminders;
CREATE POLICY "Users can insert reminders for their own deliveries"
  ON public.delivery_reminders
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.id = delivery_reminders.collection_id
        AND d.photographer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update reminders for their own collections" ON public.delivery_reminders;
DROP POLICY IF EXISTS "Users can update reminders for their own deliveries" ON public.delivery_reminders;
CREATE POLICY "Users can update reminders for their own deliveries"
  ON public.delivery_reminders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.id = delivery_reminders.collection_id
        AND d.photographer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.id = delivery_reminders.collection_id
        AND d.photographer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete reminders for their own collections" ON public.delivery_reminders;
DROP POLICY IF EXISTS "Users can delete reminders for their own deliveries" ON public.delivery_reminders;
CREATE POLICY "Users can delete reminders for their own deliveries"
  ON public.delivery_reminders
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.id = delivery_reminders.collection_id
        AND d.photographer_id = auth.uid()
    )
  );
