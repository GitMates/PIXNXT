-- Instant admin <-> photographer sync: push photographers row UPDATEs over
-- Supabase Realtime so limit/feature/usage changes reflect without reload.
-- Same pattern as supabase/migrations/20260830200000_deliveries_realtime.sql.
-- Run in Supabase Dashboard > SQL Editor. Safe to re-run.

DO $$
BEGIN
  ALTER TABLE public.photographers REPLICA IDENTITY FULL;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.photographers;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;
