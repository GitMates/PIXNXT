-- Master on/off switch for AI search (Photo Library + AI keywords).
-- When OFF, the Library nav is hidden and the /photos search UI is disabled.
-- Run in Supabase Dashboard > SQL Editor.

ALTER TABLE public.photographers
  ADD COLUMN IF NOT EXISTS ai_search_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.photographers.ai_search_enabled IS
  'Master switch for AI search in Photo Library. FALSE hides the Library nav and disables keyword search.';

-- Only admins can flip the switch (same pattern as face feature flags).
CREATE OR REPLACE FUNCTION public.protect_ai_search_flag()
RETURNS trigger AS $$
BEGIN
  IF NEW.ai_search_enabled IS DISTINCT FROM OLD.ai_search_enabled
  THEN
    IF auth.uid() IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.admins a WHERE a.id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Only administrators can change AI search access';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_protect_ai_search_flag ON public.photographers;
CREATE TRIGGER tr_protect_ai_search_flag
BEFORE UPDATE ON public.photographers
FOR EACH ROW
EXECUTE FUNCTION public.protect_ai_search_flag();
