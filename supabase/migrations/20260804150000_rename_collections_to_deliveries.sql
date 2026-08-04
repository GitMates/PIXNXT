-- Rename Client Gallery Collections → Deliveries (keeps data & FKs).
-- collection_id columns on child tables stay for compatibility (FK still valid after table rename).
-- Safe to re-run: IF EXISTS / IF EXISTS renames.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.collections RENAME TO deliveries;
ALTER TABLE IF EXISTS public.collection_reminders RENAME TO delivery_reminders;
ALTER TABLE IF EXISTS public.collection_share_emails RENAME TO delivery_share_emails;
ALTER TABLE IF EXISTS public.collection_contacts RENAME TO delivery_contacts;

-- Enum type (status values unchanged)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'collection_status'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'delivery_status'
  ) THEN
    ALTER TYPE public.collection_status RENAME TO delivery_status;
  END IF;
END $$;

-- Public gallery view (if present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views
    WHERE schemaname = 'public' AND viewname = 'collections_public'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_views
    WHERE schemaname = 'public' AND viewname = 'deliveries_public'
  ) THEN
    ALTER VIEW public.collections_public RENAME TO deliveries_public;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------------
COMMENT ON TABLE public.deliveries IS
  'Client Gallery deliveries (shared photo galleries for clients).';

COMMENT ON TABLE public.delivery_reminders IS
  'Scheduled reminder emails/WhatsApp for a delivery.';

COMMENT ON TABLE public.delivery_share_emails IS
  'Log of share emails sent for a delivery.';

COMMENT ON TABLE public.delivery_contacts IS
  'Contacts linked to a delivery.';
