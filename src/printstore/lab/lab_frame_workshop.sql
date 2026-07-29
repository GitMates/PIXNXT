-- ========================================================
-- FRAME WORKSHOP STATION
-- ========================================================
-- Run in Supabase SQL Editor after lab_order_status_machine.sql
-- Stores assembly checklist / notes per framed order.
-- ========================================================

CREATE TABLE IF NOT EXISTS public.printstore_lab_frame_jobs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id     UUID NOT NULL UNIQUE REFERENCES public.printstore_orders(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'in_progress', 'completed', 'failed')),
  checklist    JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes        TEXT,
  operator_name TEXT,
  started_at   TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lab_frame_jobs_status
  ON public.printstore_lab_frame_jobs (status);

ALTER TABLE public.printstore_lab_frame_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on printstore_lab_frame_jobs" ON public.printstore_lab_frame_jobs;
DROP POLICY IF EXISTS "Allow public insert on printstore_lab_frame_jobs" ON public.printstore_lab_frame_jobs;
DROP POLICY IF EXISTS "Allow public update on printstore_lab_frame_jobs" ON public.printstore_lab_frame_jobs;
DROP POLICY IF EXISTS "Allow public delete on printstore_lab_frame_jobs" ON public.printstore_lab_frame_jobs;

CREATE POLICY "Allow public select on printstore_lab_frame_jobs"
  ON public.printstore_lab_frame_jobs FOR SELECT USING (true);
CREATE POLICY "Allow public insert on printstore_lab_frame_jobs"
  ON public.printstore_lab_frame_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on printstore_lab_frame_jobs"
  ON public.printstore_lab_frame_jobs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on printstore_lab_frame_jobs"
  ON public.printstore_lab_frame_jobs FOR DELETE USING (true);

COMMENT ON TABLE public.printstore_lab_frame_jobs IS
  'Frame Workshop station checklist and notes; order.status remains the pipeline source of truth.';
