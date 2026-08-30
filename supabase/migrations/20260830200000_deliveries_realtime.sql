-- Live delivery settings (downloads, digital download, access) on public galleries,
-- including photographer custom domains where BroadcastChannel cannot reach the dashboard origin.

DO $$
BEGIN
  ALTER TABLE public.deliveries REPLICA IDENTITY FULL;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;
