-- Canonical R2 folder per photographer (email local-part under users/{r2_folder}/…).

ALTER TABLE public.photographers
  ADD COLUMN IF NOT EXISTS r2_folder text;

COMMENT ON COLUMN public.photographers.r2_folder IS
  'Sanitized email local-part; R2 prefix users/{r2_folder}/deliveries|album-proofer|guestdelivery|mobilegallery/…';

CREATE OR REPLACE FUNCTION public.compute_photographer_r2_folder(p_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT nullif(
    trim(both '-' from lower(regexp_replace(split_part(coalesce(p_email, ''), '@', 1), '[^a-z0-9]+', '-', 'g'))),
    ''
  );
$$;

UPDATE public.photographers
SET r2_folder = public.compute_photographer_r2_folder(email)
WHERE (r2_folder IS NULL OR r2_folder = '')
  AND email IS NOT NULL
  AND email <> '';

CREATE OR REPLACE FUNCTION public.set_photographer_r2_folder()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.r2_folder IS NULL OR NEW.r2_folder = '' THEN
    NEW.r2_folder := public.compute_photographer_r2_folder(NEW.email);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS photographers_set_r2_folder ON public.photographers;
CREATE TRIGGER photographers_set_r2_folder
  BEFORE INSERT OR UPDATE OF email, r2_folder ON public.photographers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_photographer_r2_folder();
