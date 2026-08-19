-- Allow Small thumbnail density on the existing enum (optional; design_options is source of truth).
ALTER TYPE public.thumbnail_size ADD VALUE IF NOT EXISTS 'small';
