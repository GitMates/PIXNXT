-- ========================================================
-- PRINT STORE PHOTOGRAPHER PRICING AUDIT LOGS
-- ========================================================
-- Run these statements in your Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.printstore_pricing_audit_logs (
    id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    photographer_id        TEXT NOT NULL,
    updated_products       JSONB NOT NULL,
    previous_profit_pct    NUMERIC(10, 2),
    new_profit_pct         NUMERIC(10, 2),
    previous_selling_price NUMERIC(10, 2),
    new_selling_price      NUMERIC(10, 2),
    updated_by             TEXT NOT NULL,
    created_at             TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.printstore_pricing_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Allow public select on printstore_pricing_audit_logs"
    ON public.printstore_pricing_audit_logs FOR SELECT USING (true);

CREATE POLICY "Allow public insert on printstore_pricing_audit_logs"
    ON public.printstore_pricing_audit_logs FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.printstore_pricing_audit_logs TO anon;
GRANT ALL ON public.printstore_pricing_audit_logs TO authenticated;
