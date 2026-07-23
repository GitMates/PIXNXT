-- Ensure one package row per photographer + category + photo count (for fast upserts)
CREATE UNIQUE INDEX IF NOT EXISTS store_packages_photographer_cat_count_uidx
  ON public.store_packages (photographer_id, category_tag, photo_count);
