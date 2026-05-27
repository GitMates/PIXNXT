-- Per-spread client feedback and photographer replies on album preview.
ALTER TABLE public.smart_albums
  ADD COLUMN IF NOT EXISTS comments_enabled boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.smart_album_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES public.smart_albums(id) ON DELETE CASCADE,
  spread_index integer NOT NULL CHECK (spread_index >= 0),
  parent_id uuid REFERENCES public.smart_album_comments(id) ON DELETE CASCADE,
  author_type text NOT NULL CHECK (author_type IN ('client', 'photographer')),
  author_name text NOT NULL DEFAULT '',
  author_email text,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS smart_album_comments_album_spread_idx
  ON public.smart_album_comments(album_id, spread_index, created_at);

CREATE INDEX IF NOT EXISTS smart_album_comments_parent_idx
  ON public.smart_album_comments(parent_id)
  WHERE parent_id IS NOT NULL;

ALTER TABLE public.smart_album_comments ENABLE ROW LEVEL SECURITY;

-- Photographers: full access on their albums
DROP POLICY IF EXISTS smart_album_comments_owner_all ON public.smart_album_comments;
CREATE POLICY smart_album_comments_owner_all ON public.smart_album_comments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.smart_albums a
      WHERE a.id = album_id AND a.photographer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.smart_albums a
      WHERE a.id = album_id AND a.photographer_id = auth.uid()
    )
  );

-- Read comments when album has comments enabled (published or owner session)
DROP POLICY IF EXISTS smart_album_comments_select_enabled ON public.smart_album_comments;
CREATE POLICY smart_album_comments_select_enabled ON public.smart_album_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.smart_albums a
      WHERE a.id = album_id
        AND a.comments_enabled
        AND (a.status = 'published' OR a.photographer_id = auth.uid())
    )
  );

-- Clients (including anon) may post top-level feedback on enabled albums
DROP POLICY IF EXISTS smart_album_comments_insert_client ON public.smart_album_comments;
CREATE POLICY smart_album_comments_insert_client ON public.smart_album_comments
  FOR INSERT
  WITH CHECK (
    author_type = 'client'
    AND parent_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.smart_albums a
      WHERE a.id = album_id AND a.comments_enabled AND a.status = 'published'
    )
  );

-- Clients may update their own top-level comments (auto-save)
DROP POLICY IF EXISTS smart_album_comments_update_client ON public.smart_album_comments;
CREATE POLICY smart_album_comments_update_client ON public.smart_album_comments
  FOR UPDATE
  USING (
    author_type = 'client'
    AND parent_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.smart_albums a
      WHERE a.id = album_id AND a.comments_enabled AND a.status = 'published'
    )
  );

-- NOTE: We do NOT modify smart_albums RLS policies here.
-- The app already requires published album rows for preview via existing policies.

COMMENT ON TABLE public.smart_album_comments IS 'Per-spread proofing comments from clients with photographer replies.';
