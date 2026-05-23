-- Smart Albums: photographer-owned album projects
CREATE TABLE IF NOT EXISTS public.smart_albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  name text NOT NULL,
  event_date date,
  slug text,
  page_count integer NOT NULL DEFAULT 21,
  cover_image_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS smart_albums_photographer_id_idx ON public.smart_albums(photographer_id);
CREATE INDEX IF NOT EXISTS smart_albums_created_at_idx ON public.smart_albums(created_at DESC);

ALTER TABLE public.smart_albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY smart_albums_select_own ON public.smart_albums
  FOR SELECT USING (photographer_id = auth.uid());

CREATE POLICY smart_albums_insert_own ON public.smart_albums
  FOR INSERT WITH CHECK (photographer_id = auth.uid());

CREATE POLICY smart_albums_update_own ON public.smart_albums
  FOR UPDATE USING (photographer_id = auth.uid());

CREATE POLICY smart_albums_delete_own ON public.smart_albums
  FOR DELETE USING (photographer_id = auth.uid());

COMMENT ON TABLE public.smart_albums IS 'Smart Albums projects (layout albums for clients).';
