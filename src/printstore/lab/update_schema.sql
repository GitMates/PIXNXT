-- ========================================================
-- PRINT STORE LAB MANUFACTURING MODULE - WORKFLOW MIGRATION
-- ========================================================
-- Run these statements in your Supabase SQL Editor to update the database schema.

-- 1. Drop the existing printstore_orders status check constraint
ALTER TABLE public.printstore_orders DROP CONSTRAINT IF EXISTS printstore_orders_status_check;

-- 2. Add the updated check constraint containing 'printed' status and removing 'framing' if wanted,
-- but keeping standard fallback statuses just in case.
ALTER TABLE public.printstore_orders ADD CONSTRAINT printstore_orders_status_check
    CHECK (status IN ('pending', 'printing', 'printed', 'packaging', 'ready_to_ship', 'shipped', 'completed', 'reprint', 'cancelled'));

-- 3. Update the trigger function log_printstore_order_status_change to log and track the new status
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
    ELSIF NEW.status = 'printed' THEN
        status_label := 'Printed (QC)';
        status_desc := 'Your prints are completed and are currently undergoing manual Quality Control.';
    ELSIF NEW.status = 'packaging' THEN
        status_label := 'Packaging';
        status_desc := 'Your order is being packaged securely at the Noida Hub.';
    ELSIF NEW.status = 'ready_to_ship' THEN
        status_label := 'Ready to Deliver';
        status_desc := 'Your package is packaged and ready to be delivered.';
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
