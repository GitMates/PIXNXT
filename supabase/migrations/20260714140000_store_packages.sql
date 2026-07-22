-- Category digital packages for store (Wedding / Portrait / Event offers)

CREATE TABLE IF NOT EXISTS public.store_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  category_tag text NOT NULL,
  name text NOT NULL,
  photo_count integer NOT NULL CHECK (photo_count > 0),
  price numeric(10, 2) NOT NULL CHECK (price >= 0),
  package_type text NOT NULL DEFAULT 'digital'
    CHECK (package_type IN ('digital', 'print', 'both')),
  description text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS store_packages_photographer_idx
  ON public.store_packages (photographer_id);

CREATE INDEX IF NOT EXISTS store_packages_photographer_category_idx
  ON public.store_packages (photographer_id, category_tag)
  WHERE is_active = true;

COMMENT ON TABLE public.store_packages IS
  'Category digital/print package offers (e.g. Wedding 40 photos). Matched to galleries via category_tags.';

ALTER TABLE public.store_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS store_packages_owner_select ON public.store_packages;
CREATE POLICY store_packages_owner_select
  ON public.store_packages
  FOR SELECT
  TO authenticated
  USING (photographer_id = auth.uid());

DROP POLICY IF EXISTS store_packages_owner_insert ON public.store_packages;
CREATE POLICY store_packages_owner_insert
  ON public.store_packages
  FOR INSERT
  TO authenticated
  WITH CHECK (photographer_id = auth.uid());

DROP POLICY IF EXISTS store_packages_owner_update ON public.store_packages;
CREATE POLICY store_packages_owner_update
  ON public.store_packages
  FOR UPDATE
  TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

DROP POLICY IF EXISTS store_packages_owner_delete ON public.store_packages;
CREATE POLICY store_packages_owner_delete
  ON public.store_packages
  FOR DELETE
  TO authenticated
  USING (photographer_id = auth.uid());

-- Clients (anon + authenticated) can read active packages for galleries they browse
DROP POLICY IF EXISTS store_packages_public_active_read ON public.store_packages;
CREATE POLICY store_packages_public_active_read
  ON public.store_packages
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);
