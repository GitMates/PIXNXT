-- Prefer a real UNIQUE CONSTRAINT so PostgREST upsert ON CONFLICT works
DROP INDEX IF EXISTS store_packages_photographer_cat_count_uidx;

ALTER TABLE public.store_packages
  DROP CONSTRAINT IF EXISTS store_packages_photographer_cat_count_key;

ALTER TABLE public.store_packages
  ADD CONSTRAINT store_packages_photographer_cat_count_key
  UNIQUE (photographer_id, category_tag, photo_count);
