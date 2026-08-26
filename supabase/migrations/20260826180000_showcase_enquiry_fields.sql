-- Optional field config for the public Showcase enquiry form.

ALTER TABLE public.photographers
  ADD COLUMN IF NOT EXISTS showcase_enquiry_fields jsonb;

COMMENT ON COLUMN public.photographers.showcase_enquiry_fields IS
  'JSON map of which enquiry form fields are shown on Showcase (name/whatsapp always on).';
