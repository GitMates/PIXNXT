-- Add watermark editor columns to photographers table
ALTER TABLE public.photographers
ADD COLUMN IF NOT EXISTS watermark_type TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS watermark_text TEXT,
ADD COLUMN IF NOT EXISTS watermark_font TEXT DEFAULT 'Times New Roman',
ADD COLUMN IF NOT EXISTS watermark_color TEXT DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS watermark_scale INTEGER DEFAULT 70,
ADD COLUMN IF NOT EXISTS watermark_name TEXT DEFAULT 'My Watermark 1',
ADD COLUMN IF NOT EXISTS watermark_web_downloads BOOLEAN DEFAULT FALSE;
