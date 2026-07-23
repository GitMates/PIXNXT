-- ========================================================
-- LAB ORDER STATUS MACHINE (single source of truth)
-- ========================================================
-- Run in Supabase SQL Editor.
-- Aligns printstore_orders.status with the lab app status machine
-- in src/printstore/lab/labOrderStatus.js
-- ========================================================

-- 1) Unified status check constraint
ALTER TABLE public.printstore_orders
  DROP CONSTRAINT IF EXISTS printstore_orders_status_check;

ALTER TABLE public.printstore_orders
  ADD CONSTRAINT printstore_orders_status_check
  CHECK (status IN (
    'pending',
    'artwork_review',
    'printing',
    'printed',
    'framing',
    'packaging',
    'ready_to_ship',
    'shipped',
    'completed',
    'reprint',
    'cancelled'
  ));

-- 2) Ensure tracking table exists (idempotent)
CREATE TABLE IF NOT EXISTS public.printstore_order_tracking (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id    UUID NOT NULL REFERENCES public.printstore_orders(id) ON DELETE CASCADE,
  status      TEXT NOT NULL,
  label       TEXT,
  description TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_printstore_order_tracking_order_id
  ON public.printstore_order_tracking (order_id);

CREATE INDEX IF NOT EXISTS idx_printstore_orders_status
  ON public.printstore_orders (status);

-- 3) Status change → tracking log
CREATE OR REPLACE FUNCTION log_printstore_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  status_label TEXT;
  status_desc  TEXT;
BEGIN
  IF NEW.status = 'pending' THEN
    status_label := 'Order placed';
    status_desc  := 'Your order has been successfully placed.';
  ELSIF NEW.status = 'artwork_review' THEN
    status_label := 'Artwork review';
    status_desc  := 'The lab is reviewing crop, resolution, and print readiness.';
  ELSIF NEW.status = 'printing' THEN
    status_label := 'Printing started';
    status_desc  := 'The lab has started printing your high-resolution images.';
  ELSIF NEW.status = 'printed' THEN
    status_label := 'Printed (QC)';
    status_desc  := 'Prints are complete and undergoing quality control.';
  ELSIF NEW.status = 'framing' THEN
    status_label := 'Frame workshop';
    status_desc  := 'Your print is being matted and framed in the workshop.';
  ELSIF NEW.status = 'packaging' THEN
    status_label := 'Packaging';
    status_desc  := 'Your order is being packaged securely.';
  ELSIF NEW.status = 'ready_to_ship' THEN
    status_label := 'Ready to deliver';
    status_desc  := 'Your package is ready for dispatch.';
  ELSIF NEW.status = 'shipped' THEN
    status_label := 'Dispatched';
    status_desc  := 'Your package has been dispatched.';
  ELSIF NEW.status = 'completed' THEN
    status_label := 'Delivered';
    status_desc  := 'Your order has been successfully delivered.';
  ELSIF NEW.status = 'reprint' THEN
    status_label := 'Reprint required';
    status_desc  := 'A QC check triggered a reprint for perfection.';
  ELSIF NEW.status = 'cancelled' THEN
    status_label := 'Cancelled';
    status_desc  := 'This order has been cancelled.';
  ELSE
    status_label := NEW.status;
    status_desc  := 'Status updated to ' || NEW.status;
  END IF;

  IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.printstore_order_tracking (order_id, status, label, description)
    VALUES (NEW.id, NEW.status, status_label, status_desc);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_printstore_order_status_change ON public.printstore_orders;

CREATE TRIGGER trg_log_printstore_order_status_change
  AFTER INSERT OR UPDATE OF status ON public.printstore_orders
  FOR EACH ROW
  EXECUTE FUNCTION log_printstore_order_status_change();

COMMENT ON CONSTRAINT printstore_orders_status_check ON public.printstore_orders IS
  'Lab production status machine — keep in sync with src/printstore/lab/labOrderStatus.js';
