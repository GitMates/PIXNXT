-- ========================================================
-- PRINT STORE LAB MANUFACTURING MODULE - DATABASE SCHEMA
-- ========================================================
-- Run these statements in your Supabase SQL Editor.
-- This script safely drops existing check constraints before updating statuses.

-- 1. Drop existing check constraints on status (standard name and dynamic search)
ALTER TABLE public.printstore_orders DROP CONSTRAINT IF EXISTS printstore_orders_status_check;

DO $$
DECLARE
    constraint_name_var TEXT;
BEGIN
    SELECT conname INTO constraint_name_var
    FROM pg_constraint con
    INNER JOIN pg_class rel ON rel.oid = con.conrelid
    INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'printstore_orders'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%status%';
      
    IF constraint_name_var IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.printstore_orders DROP CONSTRAINT ' || constraint_name_var;
    END IF;
END $$;

-- 2. Migrate existing row data to new status values now that constraints are dropped
UPDATE public.printstore_orders 
SET status = 'pending' 
WHERE status = 'sent_to_lab';

UPDATE public.printstore_orders 
SET status = 'printing' 
WHERE status = 'processing';

UPDATE public.printstore_orders 
SET status = 'packaging' 
WHERE status = 'packed';

UPDATE public.printstore_orders 
SET status = 'ready_to_ship' 
WHERE status IN ('dispatching', 'arrived');

-- 3. Apply the new check constraint to support all choices
ALTER TABLE public.printstore_orders ADD CONSTRAINT printstore_orders_status_check
    CHECK (status IN ('pending', 'printing', 'framing', 'qc', 'packaging', 'ready_to_ship', 'shipped', 'completed', 'reprint', 'cancelled'));

-- 4. Inventory Table
CREATE TABLE IF NOT EXISTS public.printstore_inventory (
    sku TEXT PRIMARY KEY,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Photo Paper', 'Frame Material', 'Glass Sheets', 'Mount Boards', 'Packaging Materials')),
    available_qty NUMERIC(10, 2) DEFAULT 0.00 NOT NULL CHECK (available_qty >= 0),
    minimum_qty NUMERIC(10, 2) DEFAULT 0.00 NOT NULL CHECK (minimum_qty >= 0),
    supplier TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on printstore_inventory
ALTER TABLE public.printstore_inventory ENABLE ROW LEVEL SECURITY;

-- Policies for printstore_inventory
CREATE POLICY "Allow public select on printstore_inventory"
    ON public.printstore_inventory FOR SELECT USING (true);

CREATE POLICY "Allow public insert on printstore_inventory"
    ON public.printstore_inventory FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on printstore_inventory"
    ON public.printstore_inventory FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete on printstore_inventory"
    ON public.printstore_inventory FOR DELETE USING (true);

-- 5. Lab Employees Table
CREATE TABLE IF NOT EXISTS public.printstore_lab_employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL,
    department TEXT NOT NULL CHECK (department IN ('Printing', 'Framing', 'Quality Control', 'Packaging', 'Shipping')),
    status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'inactive')),
    orders_completed INTEGER DEFAULT 0 NOT NULL CHECK (orders_completed >= 0),
    orders_pending INTEGER DEFAULT 0 NOT NULL CHECK (orders_pending >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on printstore_lab_employees
ALTER TABLE public.printstore_lab_employees ENABLE ROW LEVEL SECURITY;

-- Policies for printstore_lab_employees
CREATE POLICY "Allow public select on printstore_lab_employees"
    ON public.printstore_lab_employees FOR SELECT USING (true);

CREATE POLICY "Allow public insert on printstore_lab_employees"
    ON public.printstore_lab_employees FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on printstore_lab_employees"
    ON public.printstore_lab_employees FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete on printstore_lab_employees"
    ON public.printstore_lab_employees FOR DELETE USING (true);

-- 6. Quality Checks logs Table
CREATE TABLE IF NOT EXISTS public.printstore_lab_quality_checks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.printstore_orders(id) ON DELETE CASCADE NOT NULL,
    checked_by TEXT NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('pass', 'fail')),
    failure_reason TEXT CHECK (failure_reason IN ('Print Defect', 'Color Error', 'Frame Damage', 'Glass Damage', 'Dust Contamination', 'Packaging Damage')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on printstore_lab_quality_checks
ALTER TABLE public.printstore_lab_quality_checks ENABLE ROW LEVEL SECURITY;

-- Policies for printstore_lab_quality_checks
CREATE POLICY "Allow public select on printstore_lab_quality_checks"
    ON public.printstore_lab_quality_checks FOR SELECT USING (true);

CREATE POLICY "Allow public insert on printstore_lab_quality_checks"
    ON public.printstore_lab_quality_checks FOR INSERT WITH CHECK (true);

-- 7. Packaging Logs Table
CREATE TABLE IF NOT EXISTS public.printstore_lab_packaging_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.printstore_orders(id) ON DELETE CASCADE NOT NULL,
    packed_by TEXT NOT NULL,
    packaging_type TEXT NOT NULL,
    bubble_wrap BOOLEAN DEFAULT false NOT NULL,
    corner_protectors BOOLEAN DEFAULT false NOT NULL,
    foam_sheet BOOLEAN DEFAULT false NOT NULL,
    protective_sleeve BOOLEAN DEFAULT false NOT NULL,
    shipping_box BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on printstore_lab_packaging_logs
ALTER TABLE public.printstore_lab_packaging_logs ENABLE ROW LEVEL SECURITY;

-- Policies for printstore_lab_packaging_logs
CREATE POLICY "Allow public select on printstore_lab_packaging_logs"
    ON public.printstore_lab_packaging_logs FOR SELECT USING (true);

CREATE POLICY "Allow public insert on printstore_lab_packaging_logs"
    ON public.printstore_lab_packaging_logs FOR INSERT WITH CHECK (true);

-- 8. Add trigger handling status sync timelines for new options
CREATE OR REPLACE FUNCTION log_printstore_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
    status_label TEXT;
    status_desc TEXT;
BEGIN
    IF NEW.status = 'pending' THEN
        status_label := 'Order placed';
        status_desc := 'Your order has been successfully placed.';
    ELSIF NEW.status = 'printing' THEN
        status_label := 'Printing Started';
        status_desc := 'The lab has started printing your high-resolution images.';
    ELSIF NEW.status = 'framing' THEN
        status_label := 'Framing Started';
        status_desc := 'Your prints are being framed with miter cut wood and optical glass.';
    ELSIF NEW.status = 'qc' THEN
        status_label := 'Quality Inspection';
        status_desc := 'We are validating alignment, sharpness, dust control, and joints.';
    ELSIF NEW.status = 'packaging' THEN
        status_label := 'Packaging';
        status_desc := 'Your framed orders are being bubble-wrapped and boxed.';
    ELSIF NEW.status = 'ready_to_ship' THEN
        status_label := 'Ready To Ship';
        status_desc := 'Your package is sealed and waiting for courier pickup.';
    ELSIF NEW.status = 'shipped' THEN
        status_label := 'Dispatched';
        status_desc := 'Your package has been dispatched from Noida Hub.';
    ELSIF NEW.status = 'completed' THEN
        status_label := 'Delivered';
        status_desc := 'Your prints have been successfully delivered.';
    ELSIF NEW.status = 'reprint' THEN
        status_label := 'Reprint Required';
        status_desc := 'A QC check triggered a reprint run for perfection.';
    ELSIF NEW.status = 'cancelled' THEN
        status_label := 'Cancelled';
        status_desc := 'This order has been cancelled.';
    ELSE
        status_label := NEW.status;
        status_desc := 'Status updated to ' || NEW.status;
    END IF;

    IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.printstore_order_tracking (order_id, status, label, description)
        VALUES (NEW.id, NEW.status, status_label, status_desc);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Grant Permissions to all tables
GRANT ALL ON public.printstore_inventory TO anon;
GRANT ALL ON public.printstore_inventory TO authenticated;
GRANT ALL ON public.printstore_lab_employees TO anon;
GRANT ALL ON public.printstore_lab_employees TO authenticated;
GRANT ALL ON public.printstore_lab_quality_checks TO anon;
GRANT ALL ON public.printstore_lab_quality_checks TO authenticated;
GRANT ALL ON public.printstore_lab_packaging_logs TO anon;
GRANT ALL ON public.printstore_lab_packaging_logs TO authenticated;
