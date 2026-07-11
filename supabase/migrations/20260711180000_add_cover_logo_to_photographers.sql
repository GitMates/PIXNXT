-- Add cover_logo_url column to photographers table
ALTER TABLE public.photographers 
ADD COLUMN IF NOT EXISTS cover_logo_url TEXT;
