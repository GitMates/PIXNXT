-- Add favicon_url and hide_branding columns to photographers table
ALTER TABLE public.photographers 
ADD COLUMN IF NOT EXISTS favicon_url TEXT,
ADD COLUMN IF NOT EXISTS hide_branding BOOLEAN DEFAULT FALSE;
