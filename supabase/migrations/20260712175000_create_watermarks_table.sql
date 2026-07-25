-- Create watermarks table
CREATE TABLE IF NOT EXISTS public.watermarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    photographer_id UUID REFERENCES public.photographers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text',
    text TEXT,
    url TEXT,
    font TEXT DEFAULT 'Times New Roman',
    color TEXT DEFAULT '#ffffff',
    scale INTEGER DEFAULT 50,
    opacity INTEGER DEFAULT 50,
    position TEXT DEFAULT 'center',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS policies
ALTER TABLE public.watermarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own watermarks"
    ON public.watermarks FOR SELECT
    USING (auth.uid() = photographer_id);

CREATE POLICY "Users can insert their own watermarks"
    ON public.watermarks FOR INSERT
    WITH CHECK (auth.uid() = photographer_id);

CREATE POLICY "Users can update their own watermarks"
    ON public.watermarks FOR UPDATE
    USING (auth.uid() = photographer_id);

CREATE POLICY "Users can delete their own watermarks"
    ON public.watermarks FOR DELETE
    USING (auth.uid() = photographer_id);

-- Create an index for performance
CREATE INDEX IF NOT EXISTS watermarks_photographer_id_idx ON public.watermarks(photographer_id);

-- Optional: Migrate existing watermarks from photographers table
INSERT INTO public.watermarks (photographer_id, name, type, text, url, font, color, scale, opacity, position)
SELECT 
    id, 
    COALESCE(watermark_name, 'My Watermark 1'),
    COALESCE(watermark_type, 'text'),
    watermark_text,
    watermark_url,
    COALESCE(watermark_font, 'Times New Roman'),
    COALESCE(watermark_color, '#ffffff'),
    COALESCE(watermark_scale, 50),
    COALESCE(watermark_opacity, 50),
    COALESCE(watermark_position, 'center')
FROM public.photographers
WHERE watermark_text IS NOT NULL OR watermark_url IS NOT NULL;
