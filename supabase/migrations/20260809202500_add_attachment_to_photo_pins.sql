-- Migration: Add attachment columns to album_proofer_photo_pins table
ALTER TABLE IF EXISTS public.album_proofer_photo_pins
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_type text,
  ADD COLUMN IF NOT EXISTS attachment_name text;
