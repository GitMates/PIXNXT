-- Vault purchases already live in public.buylink_plans.
-- No schema change required for Store Manager purchase tables.
-- Reference schema (ensure your project matches):

/*
CREATE TABLE IF NOT EXISTS public.buylink_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  customer_email text NOT NULL,
  customer_name text,
  amount_paid numeric NOT NULL,
  plan_type text NOT NULL,          -- '1month' | '1year' | 'lifetime'
  status text NOT NULL DEFAULT 'completed',
  payment_method text NOT NULL DEFAULT 'Credit Card',
  payment_intent_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS buylink_plans_collection_idx
  ON public.buylink_plans (collection_id);

CREATE INDEX IF NOT EXISTS buylink_plans_created_at_idx
  ON public.buylink_plans (created_at DESC);
*/

-- Digital download purchases use existing printstore_orders + printstore_order_items
-- with product_type in ('digital_download', 'digital_download_all', 'digital_package').

CREATE INDEX IF NOT EXISTS buylink_plans_collection_idx
  ON public.buylink_plans (collection_id);

CREATE INDEX IF NOT EXISTS buylink_plans_created_at_idx
  ON public.buylink_plans (created_at DESC);

CREATE INDEX IF NOT EXISTS printstore_order_items_product_type_idx
  ON public.printstore_order_items (product_type);
