-- ========================================================
-- PRINT STORE LAB MANUFACTURING - ARTWORK REVIEW CENTER
-- ========================================================
-- Copy and run these SQL statements in your Supabase SQL Editor.

-- 1. Create printstore_artwork_reviews Table
CREATE TABLE IF NOT EXISTS public.printstore_artwork_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.printstore_orders(id) ON DELETE CASCADE NOT NULL,
    order_item_id UUID REFERENCES public.printstore_order_items(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID,
    photographer_id UUID,
    review_status TEXT CHECK (review_status IN ('Pending Review', 'Waiting Customer', 'Customer Approved', 'New Image Uploaded', 'Ready For Print')) DEFAULT 'Pending Review' NOT NULL,
    issue_types JSONB DEFAULT '[]'::jsonb,
    reviewer_notes TEXT,
    customer_message TEXT,
    customer_response TEXT,
    original_image TEXT,
    suggested_image TEXT,
    annotation_json JSONB DEFAULT '[]'::jsonb,
    revision_number INTEGER DEFAULT 1 NOT NULL,
    approved_by TEXT,
    reviewed_by TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2. Enable RLS on printstore_artwork_reviews
ALTER TABLE public.printstore_artwork_reviews ENABLE ROW LEVEL SECURITY;

-- 3. Create Public Permissive Policies
CREATE POLICY "Allow public select on printstore_artwork_reviews"
    ON public.printstore_artwork_reviews FOR SELECT USING (true);

CREATE POLICY "Allow public insert on printstore_artwork_reviews"
    ON public.printstore_artwork_reviews FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on printstore_artwork_reviews"
    ON public.printstore_artwork_reviews FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete on printstore_artwork_reviews"
    ON public.printstore_artwork_reviews FOR DELETE USING (true);

-- 4. Enable status column constraint updates in printstore_orders to support artwork review stages
ALTER TABLE public.printstore_orders DROP CONSTRAINT IF EXISTS printstore_orders_status_check;

ALTER TABLE public.printstore_orders ADD CONSTRAINT printstore_orders_status_check
    CHECK (status IN ('pending', 'artwork_review', 'printing', 'printed', 'qc', 'packaging', 'ready_to_ship', 'shipped', 'completed', 'reprint', 'cancelled'));

-- 5. Create artwork review revision history table to store previous versions
CREATE TABLE IF NOT EXISTS public.printstore_artwork_review_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    review_id UUID REFERENCES public.printstore_artwork_reviews(id) ON DELETE CASCADE NOT NULL,
    revision_number INTEGER NOT NULL,
    uploaded_by TEXT NOT NULL,
    image_url TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.printstore_artwork_review_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on printstore_artwork_review_history"
    ON public.printstore_artwork_review_history FOR SELECT USING (true);

CREATE POLICY "Allow public insert on public.printstore_artwork_review_history"
    ON public.printstore_artwork_review_history FOR INSERT WITH CHECK (true);
