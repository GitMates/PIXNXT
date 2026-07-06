-- 1. Create function to recalculate photographer storage usage based on their photos
CREATE OR REPLACE FUNCTION public.calculate_photographer_storage_used(photographer_uuid UUID)
RETURNS BIGINT AS $$
DECLARE
  total_bytes BIGINT;
BEGIN
  -- Sum up size_bytes of all photos belonging to the photographer
  SELECT COALESCE(SUM(size_bytes), 0)
  INTO total_bytes
  FROM public.photos
  WHERE photographer_id = photographer_uuid;

  -- Update the storage_used_bytes value in the photographers table
  UPDATE public.photographers
  SET storage_used_bytes = total_bytes
  WHERE id = photographer_uuid;

  RETURN total_bytes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger function to automatically run calculations when photos are added or deleted
CREATE OR REPLACE FUNCTION public.trigger_recalculate_storage()
RETURNS TRIGGER AS $$
DECLARE
  target_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_id := OLD.photographer_id;
  ELSE
    target_id := NEW.photographer_id;
  END IF;

  IF target_id IS NOT NULL THEN
    PERFORM public.calculate_photographer_storage_used(target_id);
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Bind trigger to public.photos table
DROP TRIGGER IF EXISTS tr_recalculate_storage ON public.photos;
CREATE TRIGGER tr_recalculate_storage
AFTER INSERT OR UPDATE OR DELETE ON public.photos
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalculate_storage();

-- 4. Retroactively recalculate storage used for all existing photographers
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.photographers LOOP
    PERFORM public.calculate_photographer_storage_used(r.id);
  END LOOP;
END;
$$;
