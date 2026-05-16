-- Client Exclusive Access (Pixieset-style privacy)
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS client_exclusive_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_clients_mark_private boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS client_only_highlights boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.collections.client_exclusive_enabled IS 'Enables client password, client-only sets, and private photo marking';
COMMENT ON COLUMN public.collections.allow_clients_mark_private IS 'Clients may mark individual photos private';
COMMENT ON COLUMN public.collections.client_only_highlights IS 'Highlights tab visible to clients only';
-- sets.is_private already exists: client-only photo set when client_exclusive_enabled
