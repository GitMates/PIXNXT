-- Settings cards (Access, Downloads, Selections, Print Lab): the decisions each
-- card shows now persist per delivery instead of living only in the UI.

ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS share_include_password boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS share_include_pin boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS password_reprompt_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS download_price_web numeric,
  ADD COLUMN IF NOT EXISTS download_price_full numeric,
  ADD COLUMN IF NOT EXISTS download_price_bundle numeric,
  ADD COLUMN IF NOT EXISTS large_download_contact boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS video_download_resolution text NOT NULL DEFAULT '1080p',
  ADD COLUMN IF NOT EXISTS selection_notify_on_submit boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS selection_lock_on_submit boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS selection_chase_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS guest_prints_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS print_markup_percent numeric NOT NULL DEFAULT 40;

COMMENT ON COLUMN public.deliveries.share_include_password IS 'Include the view password in the generated share message.';
COMMENT ON COLUMN public.deliveries.share_include_pin IS 'Include the download PIN in the generated share message.';
COMMENT ON COLUMN public.deliveries.password_reprompt_days IS 'Days before a visitor must type the password again. 0 = never ask again.';
COMMENT ON COLUMN public.deliveries.download_price_web IS 'Price for a web-size download. NULL or 0 means free.';
COMMENT ON COLUMN public.deliveries.download_price_full IS 'Price for a full-resolution download. NULL or 0 means free.';
COMMENT ON COLUMN public.deliveries.download_price_bundle IS 'Per-photo price when a whole set is taken at once.';
COMMENT ON COLUMN public.deliveries.large_download_contact IS 'Ask for an email address before a whole gallery or set is downloaded.';
COMMENT ON COLUMN public.deliveries.video_download_resolution IS 'Resolution films are offered at: original, 1080p or 720p.';
COMMENT ON COLUMN public.deliveries.selection_notify_on_submit IS 'Notify the photographer when a selection list is submitted.';
COMMENT ON COLUMN public.deliveries.selection_lock_on_submit IS 'Lock a selection list once the client presses "I am finished".';
COMMENT ON COLUMN public.deliveries.selection_chase_enabled IS 'Send one automatic reminder after seven days of silence on a sent list.';
COMMENT ON COLUMN public.deliveries.guest_prints_enabled IS 'Offer Print Lab products to guests on their own photographs.';
COMMENT ON COLUMN public.deliveries.print_markup_percent IS 'Margin above lab cost applied to the studio default price list.';

-- The compatibility view froze its column list when it was created, so recreate
-- it to expose the new columns to anything still reading public.collections.
DROP VIEW IF EXISTS public.collections CASCADE;

CREATE VIEW public.collections AS
SELECT * FROM public.deliveries;

COMMENT ON VIEW public.collections IS
  'Compatibility alias for public.deliveries after the collections → deliveries rename.';

GRANT SELECT ON public.collections TO anon, authenticated, service_role;
