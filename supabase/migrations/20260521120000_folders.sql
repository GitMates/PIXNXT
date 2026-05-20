-- Studio folders for grouping collections (move-to picker).
CREATE TABLE IF NOT EXISTS public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  cover_url text,
  position integer NOT NULL DEFAULT 0,
  show_on_homepage boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (photographer_id, slug)
);

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS collections_folder_id_idx ON public.collections(folder_id);
CREATE INDEX IF NOT EXISTS folders_photographer_id_idx ON public.folders(photographer_id);

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS folders_select_own ON public.folders;
CREATE POLICY folders_select_own ON public.folders
  FOR SELECT USING (photographer_id = auth.uid());

DROP POLICY IF EXISTS folders_insert_own ON public.folders;
CREATE POLICY folders_insert_own ON public.folders
  FOR INSERT WITH CHECK (photographer_id = auth.uid());

DROP POLICY IF EXISTS folders_update_own ON public.folders;
CREATE POLICY folders_update_own ON public.folders
  FOR UPDATE USING (photographer_id = auth.uid());

DROP POLICY IF EXISTS folders_delete_own ON public.folders;
CREATE POLICY folders_delete_own ON public.folders
  FOR DELETE USING (photographer_id = auth.uid());
