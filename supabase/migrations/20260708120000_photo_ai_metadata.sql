-- AI metadata for client gallery photos (Rekognition labels + faces)
CREATE TABLE IF NOT EXISTS public.photo_ai_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  photographer_id uuid NOT NULL,
  labels text[] NOT NULL DEFAULT '{}',
  faces jsonb NOT NULL DEFAULT '[]'::jsonb,
  indexed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (photo_id)
);

CREATE INDEX IF NOT EXISTS photo_ai_metadata_collection_id_idx
  ON public.photo_ai_metadata(collection_id);

CREATE INDEX IF NOT EXISTS photo_ai_metadata_labels_gin_idx
  ON public.photo_ai_metadata USING gin(labels);

ALTER TABLE public.photo_ai_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY photo_ai_metadata_select_own ON public.photo_ai_metadata
  FOR SELECT USING (
    photographer_id = auth.uid()
    OR collection_id IN (
      SELECT c.id FROM public.collections c
      WHERE c.id = photo_ai_metadata.collection_id
        AND c.status = 'published'
    )
  );

CREATE POLICY photo_ai_metadata_insert_own ON public.photo_ai_metadata
  FOR INSERT WITH CHECK (photographer_id = auth.uid());

CREATE POLICY photo_ai_metadata_update_own ON public.photo_ai_metadata
  FOR UPDATE USING (photographer_id = auth.uid());

CREATE POLICY photo_ai_metadata_delete_own ON public.photo_ai_metadata
  FOR DELETE USING (photographer_id = auth.uid());

COMMENT ON TABLE public.photo_ai_metadata IS 'Rekognition labels and face data indexed once per photo at upload.';
