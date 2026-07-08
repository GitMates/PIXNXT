-- ========================================================
-- PRINT STORE ORDERS ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================
-- Run these statements in your Supabase SQL Editor to resolve:
-- "new row violates row-level security policy for table 'printstore_orders'"

-- 1. Ensure RLS is enabled
ALTER TABLE public.printstore_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.printstore_order_items ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public select on printstore_orders" ON public.printstore_orders;
DROP POLICY IF EXISTS "Allow public insert on printstore_orders" ON public.printstore_orders;
DROP POLICY IF EXISTS "Allow public update on printstore_orders" ON public.printstore_orders;
DROP POLICY IF EXISTS "Allow public delete on printstore_orders" ON public.printstore_orders;

DROP POLICY IF EXISTS "Allow public select on printstore_order_items" ON public.printstore_order_items;
DROP POLICY IF EXISTS "Allow public insert on printstore_order_items" ON public.printstore_order_items;
DROP POLICY IF EXISTS "Allow public update on printstore_order_items" ON public.printstore_order_items;
DROP POLICY IF EXISTS "Allow public delete on printstore_order_items" ON public.printstore_order_items;

-- 3. Create permissive policies for printstore_orders (Select, Insert, Update, Delete for storefront and lab)
CREATE POLICY "Allow public select on printstore_orders" ON public.printstore_orders
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert on printstore_orders" ON public.printstore_orders
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on printstore_orders" ON public.printstore_orders
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on printstore_orders" ON public.printstore_orders
    FOR DELETE USING (true);

-- 4. Create permissive policies for printstore_order_items
CREATE POLICY "Allow public select on printstore_order_items" ON public.printstore_order_items
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert on printstore_order_items" ON public.printstore_order_items
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on printstore_order_items" ON public.printstore_order_items
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on printstore_order_items" ON public.printstore_order_items
    FOR DELETE USING (true);
