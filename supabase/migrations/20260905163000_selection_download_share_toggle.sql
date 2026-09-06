-- Selections settings: let the photographer hide the Download and Share
-- buttons on client selection pages (sending the selection still works).

ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS selection_allow_download_share boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.deliveries.selection_allow_download_share IS 'Show the Download and Share buttons on selection pages. Off hides both; sending the selection to the studio still works.';

-- The compatibility view froze its column list when it was created, so recreate
-- it to expose the new column to anything still reading public.collections.
DROP VIEW IF EXISTS public.collections CASCADE;

CREATE VIEW public.collections AS
SELECT * FROM public.deliveries;

COMMENT ON VIEW public.collections IS
  'Compatibility alias for public.deliveries after the collections → deliveries rename.';

GRANT SELECT ON public.collections TO anon, authenticated, service_role;
