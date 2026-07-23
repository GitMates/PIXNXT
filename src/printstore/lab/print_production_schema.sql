-- ========================================================
-- PRINT PRODUCTION CENTER MODULE - DATABASE SCHEMA
-- ========================================================
-- Run these statements in your Supabase SQL Editor.
-- Depends on: printstore_orders, printstore_order_items (existing tables).
-- Creates: printstore_lab_printers, printstore_print_batches,
--          printstore_print_jobs, plus indexes and seed data.


-- --------------------------------------------------------
-- 1. Printers — physical printer devices in the lab
-- --------------------------------------------------------
-- Tracks each printer's model, real-time status, assigned
-- operator, physical bay, paper width limit, and the set
-- of paper types it can handle.
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.printstore_lab_printers (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name             TEXT NOT NULL,
    model            TEXT NOT NULL
                         CHECK (model IN (
                             'Canon PRO-300',
                             'Canon imagePROGRAF PRO-1000',
                             'Epson SureColor P900',
                             'Epson SureColor P700',
                             'HP DesignJet'
                         )),
    status           TEXT NOT NULL DEFAULT 'idle'
                         CHECK (status IN ('idle', 'printing', 'paused', 'maintenance', 'offline')),
    assigned_operator TEXT,
    current_job_id   UUID,                          -- FK added below after printstore_print_jobs exists
    location         TEXT,
    max_width_cm     INTEGER DEFAULT 60,
    supported_papers TEXT[],
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

COMMENT ON TABLE  public.printstore_lab_printers IS 'Physical printer devices available in the print lab.';
COMMENT ON COLUMN public.printstore_lab_printers.name             IS 'Human-friendly label, e.g. ''Canon PRO-300 #1''.';
COMMENT ON COLUMN public.printstore_lab_printers.model            IS 'Hardware model — constrained to supported models.';
COMMENT ON COLUMN public.printstore_lab_printers.status           IS 'Current operational state of the printer.';
COMMENT ON COLUMN public.printstore_lab_printers.assigned_operator IS 'Employee currently operating this printer (nullable when unassigned).';
COMMENT ON COLUMN public.printstore_lab_printers.current_job_id   IS 'FK → printstore_print_jobs — the job actively being printed.';
COMMENT ON COLUMN public.printstore_lab_printers.location         IS 'Physical bay or station, e.g. ''Bay 1''.';
COMMENT ON COLUMN public.printstore_lab_printers.max_width_cm     IS 'Maximum printable width in centimetres.';
COMMENT ON COLUMN public.printstore_lab_printers.supported_papers IS 'Array of paper type keys this printer can use.';


-- --------------------------------------------------------
-- 2. Print Batches — groups jobs by paper / size / orientation
-- --------------------------------------------------------
-- Batching reduces paper waste by ganging same-spec jobs
-- together on a single print run.
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.printstore_print_batches (
    id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_number           SERIAL,
    paper_type             TEXT NOT NULL
                               CHECK (paper_type IN ('matte', 'semi_gloss', 'luster', 'fine_art', 'canvas')),
    print_size             TEXT NOT NULL,
    orientation            TEXT NOT NULL
                               CHECK (orientation IN ('landscape', 'portrait', 'square')),
    status                 TEXT NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'in_progress', 'completed')),
    total_copies           INTEGER DEFAULT 0,
    estimated_time_minutes INTEGER,
    printer_id             UUID REFERENCES public.printstore_lab_printers(id) ON DELETE SET NULL,
    created_at             TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at             TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

COMMENT ON TABLE  public.printstore_print_batches IS 'Groups print jobs that share paper type, size, and orientation for efficient batch printing.';
COMMENT ON COLUMN public.printstore_print_batches.batch_number           IS 'Auto-incrementing human-readable batch number.';
COMMENT ON COLUMN public.printstore_print_batches.paper_type             IS 'Paper stock used for every job in the batch.';
COMMENT ON COLUMN public.printstore_print_batches.print_size             IS 'Common print dimensions, e.g. ''25x38 cm''.';
COMMENT ON COLUMN public.printstore_print_batches.orientation            IS 'Orientation shared by all jobs in the batch.';
COMMENT ON COLUMN public.printstore_print_batches.status                 IS 'Batch lifecycle state.';
COMMENT ON COLUMN public.printstore_print_batches.total_copies           IS 'Sum of copies across all jobs in this batch.';
COMMENT ON COLUMN public.printstore_print_batches.estimated_time_minutes IS 'Estimated wall-clock time to complete the batch.';
COMMENT ON COLUMN public.printstore_print_batches.printer_id             IS 'FK → printstore_lab_printers — printer assigned to this batch.';


-- --------------------------------------------------------
-- 3. Print Jobs — individual print tasks tied to orders
-- --------------------------------------------------------
-- Each row is one printable unit: a specific image on a
-- specific paper at a specific size.  Jobs reference orders,
-- order items, printers, and optional batches.
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.printstore_print_jobs (
    id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id               UUID NOT NULL REFERENCES public.printstore_orders(id) ON DELETE CASCADE,
    order_item_id          UUID REFERENCES public.printstore_order_items(id) ON DELETE SET NULL,
    printer_id             UUID REFERENCES public.printstore_lab_printers(id) ON DELETE SET NULL,
    batch_id               UUID REFERENCES public.printstore_print_batches(id) ON DELETE SET NULL,
    priority               TEXT NOT NULL DEFAULT 'medium'
                               CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    print_size             TEXT,
    paper_type             TEXT
                               CHECK (paper_type IN ('matte', 'semi_gloss', 'luster', 'fine_art', 'canvas')),
    orientation            TEXT
                               CHECK (orientation IN ('landscape', 'portrait', 'square')),
    quantity               INTEGER DEFAULT 1 CHECK (quantity >= 1),
    status                 TEXT NOT NULL DEFAULT 'queued'
                               CHECK (status IN (
                                   'queued', 'ready_to_print', 'printing', 'printed',
                                   'failed', 'reprint_required', 'sent_to_qc'
                               )),
    estimated_time_minutes INTEGER,
    estimated_ink_ml       NUMERIC(10, 2),
    estimated_paper_sheets INTEGER,
    failure_reason         TEXT
                               CHECK (failure_reason IS NULL OR failure_reason IN (
                                   'color_mismatch', 'paper_damage', 'printer_error',
                                   'wrong_orientation', 'low_ink_quality', 'customer_revision'
                               )),
    notes                  TEXT,
    started_at             TIMESTAMP WITH TIME ZONE,
    completed_at           TIMESTAMP WITH TIME ZONE,
    created_at             TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at             TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

COMMENT ON TABLE  public.printstore_print_jobs IS 'Individual print jobs — one per printable item in an order.';
COMMENT ON COLUMN public.printstore_print_jobs.order_id               IS 'FK → printstore_orders — the parent customer order.';
COMMENT ON COLUMN public.printstore_print_jobs.order_item_id          IS 'FK → printstore_order_items — specific line item being printed.';
COMMENT ON COLUMN public.printstore_print_jobs.printer_id             IS 'FK → printstore_lab_printers — assigned printer (nullable while queued).';
COMMENT ON COLUMN public.printstore_print_jobs.batch_id               IS 'FK → printstore_print_batches — optional batch grouping.';
COMMENT ON COLUMN public.printstore_print_jobs.priority               IS 'Job urgency: low → urgent.';
COMMENT ON COLUMN public.printstore_print_jobs.print_size             IS 'Final print dimensions, e.g. ''25x38 cm''.';
COMMENT ON COLUMN public.printstore_print_jobs.paper_type             IS 'Paper stock for this job.';
COMMENT ON COLUMN public.printstore_print_jobs.orientation            IS 'Print orientation.';
COMMENT ON COLUMN public.printstore_print_jobs.quantity               IS 'Number of copies to print (≥ 1).';
COMMENT ON COLUMN public.printstore_print_jobs.status                 IS 'Current lifecycle status of the job.';
COMMENT ON COLUMN public.printstore_print_jobs.estimated_time_minutes IS 'Estimated print time in minutes.';
COMMENT ON COLUMN public.printstore_print_jobs.estimated_ink_ml       IS 'Estimated ink consumption in millilitres.';
COMMENT ON COLUMN public.printstore_print_jobs.estimated_paper_sheets IS 'Estimated paper sheets required.';
COMMENT ON COLUMN public.printstore_print_jobs.failure_reason         IS 'Reason for failure (only when status = ''failed'' or ''reprint_required'').';
COMMENT ON COLUMN public.printstore_print_jobs.notes                  IS 'Free-text operator or system notes.';
COMMENT ON COLUMN public.printstore_print_jobs.started_at             IS 'Timestamp when printing actually began.';
COMMENT ON COLUMN public.printstore_print_jobs.completed_at           IS 'Timestamp when the job finished (success or fail).';


-- --------------------------------------------------------
-- 4. Deferred FK: printers.current_job_id → print_jobs
-- --------------------------------------------------------
-- Added after printstore_print_jobs exists to avoid a
-- circular dependency during CREATE TABLE.
-- --------------------------------------------------------

ALTER TABLE public.printstore_lab_printers
    ADD CONSTRAINT fk_printers_current_job
    FOREIGN KEY (current_job_id)
    REFERENCES public.printstore_print_jobs(id)
    ON DELETE SET NULL;


-- ========================================================
-- INDEXES
-- ========================================================

-- printstore_lab_printers
CREATE INDEX IF NOT EXISTS idx_lab_printers_status
    ON public.printstore_lab_printers (status);

-- printstore_print_batches
CREATE INDEX IF NOT EXISTS idx_print_batches_status
    ON public.printstore_print_batches (status);
CREATE INDEX IF NOT EXISTS idx_print_batches_printer_id
    ON public.printstore_print_batches (printer_id);

-- printstore_print_jobs
CREATE INDEX IF NOT EXISTS idx_print_jobs_status
    ON public.printstore_print_jobs (status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_order_id
    ON public.printstore_print_jobs (order_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_printer_id
    ON public.printstore_print_jobs (printer_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_batch_id
    ON public.printstore_print_jobs (batch_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_priority
    ON public.printstore_print_jobs (priority);


-- ========================================================
-- ROW LEVEL SECURITY
-- ========================================================

-- printstore_lab_printers
ALTER TABLE public.printstore_lab_printers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on printstore_lab_printers"
    ON public.printstore_lab_printers FOR SELECT USING (true);
CREATE POLICY "Allow public insert on printstore_lab_printers"
    ON public.printstore_lab_printers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on printstore_lab_printers"
    ON public.printstore_lab_printers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on printstore_lab_printers"
    ON public.printstore_lab_printers FOR DELETE USING (true);

-- printstore_print_batches
ALTER TABLE public.printstore_print_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on printstore_print_batches"
    ON public.printstore_print_batches FOR SELECT USING (true);
CREATE POLICY "Allow public insert on printstore_print_batches"
    ON public.printstore_print_batches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on printstore_print_batches"
    ON public.printstore_print_batches FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on printstore_print_batches"
    ON public.printstore_print_batches FOR DELETE USING (true);

-- printstore_print_jobs
ALTER TABLE public.printstore_print_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on printstore_print_jobs"
    ON public.printstore_print_jobs FOR SELECT USING (true);
CREATE POLICY "Allow public insert on printstore_print_jobs"
    ON public.printstore_print_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on printstore_print_jobs"
    ON public.printstore_print_jobs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on printstore_print_jobs"
    ON public.printstore_print_jobs FOR DELETE USING (true);


-- ========================================================
-- GRANTS
-- ========================================================

GRANT ALL ON public.printstore_lab_printers  TO anon;
GRANT ALL ON public.printstore_lab_printers  TO authenticated;
GRANT ALL ON public.printstore_print_batches TO anon;
GRANT ALL ON public.printstore_print_batches TO authenticated;
GRANT ALL ON public.printstore_print_jobs    TO anon;
GRANT ALL ON public.printstore_print_jobs    TO authenticated;

-- Grant usage on the batch_number sequence so inserts can auto-increment
GRANT USAGE, SELECT ON SEQUENCE public.printstore_print_batches_batch_number_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.printstore_print_batches_batch_number_seq TO authenticated;


-- ========================================================
-- SEED DATA — 5 Lab Printers (all idle, no operator)
-- ========================================================

INSERT INTO public.printstore_lab_printers
    (name, model, status, assigned_operator, current_job_id, location, max_width_cm, supported_papers)
VALUES
    ('Canon PRO-300 #1',
     'Canon PRO-300',
     'idle', NULL, NULL,
     'Bay 1', 33,
     ARRAY['matte', 'semi_gloss', 'luster', 'fine_art']),

    ('Canon imagePROGRAF PRO-1000 #1',
     'Canon imagePROGRAF PRO-1000',
     'idle', NULL, NULL,
     'Bay 2', 43,
     ARRAY['matte', 'semi_gloss', 'luster', 'fine_art', 'canvas']),

    ('Epson SureColor P900 #1',
     'Epson SureColor P900',
     'idle', NULL, NULL,
     'Bay 3', 43,
     ARRAY['matte', 'semi_gloss', 'luster', 'fine_art', 'canvas']),

    ('Epson SureColor P700 #1',
     'Epson SureColor P700',
     'idle', NULL, NULL,
     'Bay 4', 33,
     ARRAY['matte', 'semi_gloss', 'luster', 'fine_art']),

    ('HP DesignJet T230 #1',
     'HP DesignJet',
     'idle', NULL, NULL,
     'Bay 5', 61,
     ARRAY['matte', 'semi_gloss', 'luster', 'canvas']);
