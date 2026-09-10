-- Per-photographer Album & Delivery creation limits with live usage counts.
-- 0 / NULL = unlimited, -1 = disabled (cannot create new).
-- Run in Supabase Dashboard > SQL Editor.

ALTER TABLE public.photographers
  ADD COLUMN IF NOT EXISTS album_limit integer,
  ADD COLUMN IF NOT EXISTS album_used_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_limit integer,
  ADD COLUMN IF NOT EXISTS delivery_used_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.photographers.album_limit IS
  'Max albums (album_proofer_albums) this photographer can create. NULL or 0 = unlimited, -1 = disabled.';
COMMENT ON COLUMN public.photographers.album_used_count IS
  'Maintained count of album_proofer_albums for this photographer.';
COMMENT ON COLUMN public.photographers.delivery_limit IS
  'Max deliveries (deliveries table) this photographer can create. NULL or 0 = unlimited, -1 = disabled.';
COMMENT ON COLUMN public.photographers.delivery_used_count IS
  'Maintained count of deliveries for this photographer.';

CREATE OR REPLACE FUNCTION public.pixnxt_recount_creation_quotas(photographer_uuid uuid)
RETURNS void AS $$
DECLARE
  v_albums integer;
  v_deliveries integer;
BEGIN
  IF photographer_uuid IS NULL THEN
    RETURN;
  END IF;

  BEGIN
    SELECT COUNT(*)::integer INTO v_albums
    FROM public.album_proofer_albums a
    WHERE a.photographer_id = photographer_uuid;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    v_albums := 0;
  END;

  BEGIN
    SELECT COUNT(*)::integer INTO v_deliveries
    FROM public.deliveries d
    WHERE d.photographer_id = photographer_uuid;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    v_deliveries := 0;
  END;

  UPDATE public.photographers
  SET
    album_used_count = COALESCE(v_albums, 0),
    delivery_used_count = COALESCE(v_deliveries, 0)
  WHERE id = photographer_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.pixnxt_trigger_recount_creation_quota()
RETURNS trigger AS $$
DECLARE
  target_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_id := OLD.photographer_id;
  ELSE
    target_id := NEW.photographer_id;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.photographer_id IS DISTINCT FROM NEW.photographer_id THEN
    PERFORM public.pixnxt_recount_creation_quotas(OLD.photographer_id);
  END IF;

  PERFORM public.pixnxt_recount_creation_quotas(target_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_recount_creation_albums ON public.album_proofer_albums;
CREATE TRIGGER tr_recount_creation_albums
AFTER INSERT OR DELETE OR UPDATE OF photographer_id ON public.album_proofer_albums
FOR EACH ROW
EXECUTE FUNCTION public.pixnxt_trigger_recount_creation_quota();

DROP TRIGGER IF EXISTS tr_recount_creation_deliveries ON public.deliveries;
CREATE TRIGGER tr_recount_creation_deliveries
AFTER INSERT OR DELETE OR UPDATE OF photographer_id ON public.deliveries
FOR EACH ROW
EXECUTE FUNCTION public.pixnxt_trigger_recount_creation_quota();

-- Only admins can change creation limits.
CREATE OR REPLACE FUNCTION public.protect_creation_quota_limits()
RETURNS trigger AS $$
BEGIN
  IF NEW.album_limit IS DISTINCT FROM OLD.album_limit
     OR NEW.delivery_limit IS DISTINCT FROM OLD.delivery_limit
  THEN
    IF auth.uid() IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.admins a WHERE a.id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Only administrators can change account limits';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_protect_creation_quota_limits ON public.photographers;
CREATE TRIGGER tr_protect_creation_quota_limits
BEFORE UPDATE ON public.photographers
FOR EACH ROW
EXECUTE FUNCTION public.protect_creation_quota_limits();

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.photographers LOOP
    PERFORM public.pixnxt_recount_creation_quotas(r.id);
  END LOOP;
END;
$$;
