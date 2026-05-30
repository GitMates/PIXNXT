-- Toggle messenger-style comments panel on album preview footer.

ALTER TABLE public.smart_albums

  ADD COLUMN IF NOT EXISTS messages_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.smart_albums.messages_enabled IS 'When false, preview hides the Messages panel; clients use Comment only.';
