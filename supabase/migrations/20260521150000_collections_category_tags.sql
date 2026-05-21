-- Category tags for filtering collections on the dashboard (text array).
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS category_tags text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.collections.category_tags IS 'Labels e.g. wedding, outdoor — used for dashboard filters and search.';
