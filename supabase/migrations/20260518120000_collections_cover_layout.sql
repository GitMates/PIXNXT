-- Persist cover template (center, novel, etc.) separately from legacy cover_style enum (photo, text_only).
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS cover_layout text NOT NULL DEFAULT 'novel';

COMMENT ON COLUMN public.collections.cover_layout IS 'Cover template: center, left, novel, vintage, frame, stripe, divider, journal, stamp, outline, classic, none';
