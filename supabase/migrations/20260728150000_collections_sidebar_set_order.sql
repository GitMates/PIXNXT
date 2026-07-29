-- Persist dashboard sidebar set order, including the virtual Highlights entry.
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS sidebar_set_order text[] DEFAULT NULL;

COMMENT ON COLUMN public.collections.sidebar_set_order IS
  'Ordered list of set ids for the dashboard sidebar, including the virtual "highlights" id.';
