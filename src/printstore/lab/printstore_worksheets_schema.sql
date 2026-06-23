-- ========================================================
-- PRINT STORE LAB MANUFACTURING MODULE - WORKSHEET SCHEMA
-- ========================================================
-- Run these statements in your Supabase SQL Editor.

-- 1. Add printer column to printstore_orders if it does not exist
ALTER TABLE public.printstore_orders 
ADD COLUMN IF NOT EXISTS assigned_printer TEXT;

-- 2. Create the printstore_order_worksheets table for packing slips/labels
CREATE TABLE IF NOT EXISTS public.printstore_order_worksheets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.printstore_orders(id) ON DELETE CASCADE UNIQUE NOT NULL,
    shipping_service TEXT DEFAULT 'Standard' NOT NULL,
    seller_name TEXT DEFAULT 'PIXNXT' NOT NULL,
    weight_kg NUMERIC(6, 2) DEFAULT 0.00 NOT NULL,
    box_dimensions TEXT DEFAULT 'Standard Box' NOT NULL,
    tracking_number TEXT DEFAULT '' NOT NULL,
    carrier TEXT DEFAULT '' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on worksheets table
ALTER TABLE public.printstore_order_worksheets ENABLE ROW LEVEL SECURITY;

-- Policies for printstore_order_worksheets
CREATE POLICY "Allow public select on printstore_order_worksheets"
    ON public.printstore_order_worksheets FOR SELECT USING (true);

CREATE POLICY "Allow public insert on printstore_order_worksheets"
    ON public.printstore_order_worksheets FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on printstore_order_worksheets"
    ON public.printstore_order_worksheets FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete on printstore_order_worksheets"
    ON public.printstore_order_worksheets FOR DELETE USING (true);

-- Grant Permissions to anon and authenticated roles
GRANT ALL ON public.printstore_order_worksheets TO anon;
GRANT ALL ON public.printstore_order_worksheets TO authenticated;
