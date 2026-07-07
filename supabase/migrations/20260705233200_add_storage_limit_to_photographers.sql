-- Add storage_limit_bytes column to photographers table
ALTER TABLE public.photographers ADD COLUMN IF NOT EXISTS storage_limit_bytes BIGINT;
