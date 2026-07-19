-- Cached people clusters per collection (computed once via Rekognition, read on every visit)
CREATE TABLE IF NOT EXISTS public.photo_ai_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  photographer_id uuid NOT NULL,
  cluster_key text NOT NULL,
  face_ids text[] NOT NULL DEFAULT '{}',
  photo_ids uuid[] NOT NULL DEFAULT '{}',
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  avatar_photo_id uuid REFERENCES public.photos(id) ON DELETE SET NULL,
  avatar_bounding_box jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, cluster_key)
);

CREATE INDEX IF NOT EXISTS photo_ai_people_collection_id_idx
  ON public.photo_ai_people(collection_id);

CREATE INDEX IF NOT EXISTS photo_ai_people_photo_ids_gin_idx
  ON public.photo_ai_people USING gin(photo_ids);

-- Tracks when clusters were last built vs indexed metadata (staleness check)
CREATE TABLE IF NOT EXISTS public.photo_ai_cluster_state (
  collection_id uuid PRIMARY KEY REFERENCES public.collections(id) ON DELETE CASCADE,
  photographer_id uuid NOT NULL,
  indexed_photo_count int NOT NULL DEFAULT 0,
  max_indexed_at timestamptz,
  clustered_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.photo_ai_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_ai_cluster_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY photo_ai_people_select_own ON public.photo_ai_people
  FOR SELECT USING (
    photographer_id = auth.uid()
    OR collection_id IN (
      SELECT c.id FROM public.collections c
      WHERE c.id = photo_ai_people.collection_id
        AND c.status = 'published'
    )
  );

CREATE POLICY photo_ai_people_insert_own ON public.photo_ai_people
  FOR INSERT WITH CHECK (photographer_id = auth.uid());

CREATE POLICY photo_ai_people_update_own ON public.photo_ai_people
  FOR UPDATE USING (photographer_id = auth.uid());

CREATE POLICY photo_ai_people_delete_own ON public.photo_ai_people
  FOR DELETE USING (photographer_id = auth.uid());

CREATE POLICY photo_ai_cluster_state_select_own ON public.photo_ai_cluster_state
  FOR SELECT USING (photographer_id = auth.uid());

CREATE POLICY photo_ai_cluster_state_insert_own ON public.photo_ai_cluster_state
  FOR INSERT WITH CHECK (photographer_id = auth.uid());

CREATE POLICY photo_ai_cluster_state_update_own ON public.photo_ai_cluster_state
  FOR UPDATE USING (photographer_id = auth.uid());

CREATE POLICY photo_ai_cluster_state_delete_own ON public.photo_ai_cluster_state
  FOR DELETE USING (photographer_id = auth.uid());

COMMENT ON TABLE public.photo_ai_people IS 'Grouped people per gallery collection; built once after face indexing.';
COMMENT ON TABLE public.photo_ai_cluster_state IS 'Staleness marker for when people clusters need rebuilding.';
