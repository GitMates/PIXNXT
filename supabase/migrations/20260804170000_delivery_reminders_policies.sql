-- Rewrite delivery_reminders RLS to reference public.deliveries by name
-- (policies survive table rename via OID; this keeps dumps/recreates consistent).

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
