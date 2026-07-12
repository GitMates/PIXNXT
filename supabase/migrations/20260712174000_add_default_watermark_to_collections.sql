-- Add default_watermark column to collections table
ALTER TABLE collections ADD COLUMN IF NOT EXISTS default_watermark TEXT DEFAULT 'No watermark';
