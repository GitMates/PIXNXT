-- Persist album proofing feedback in the database (comments attachments, swaps, pins, seen).
-- Client link and photographer share the same rows — no localStorage source of truth.

-- ---------------------------------------------------------------------------
-- Comment attachments (image / audio)
-- ---------------------------------------------------------------------------
ALTER TABLE public.smart_album_comments
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_type text
    CHECK (attachment_type IS NULL OR attachment_type IN ('image', 'audio'));

COMMENT ON COLUMN public.smart_album_comments.attachment_url IS
  'Public URL for an attached image or voice message (R2 / CDN).';
COMMENT ON COLUMN public.smart_album_comments.attachment_type IS
  'Attachment kind: image or audio.';

-- ---------------------------------------------------------------------------
-- Swap marks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.smart_album_swap_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES public.smart_albums(id) ON DELETE CASCADE,
  slot_a text NOT NULL,
  slot_b text NOT NULL,
  label_a text NOT NULL DEFAULT '',
  label_b text NOT NULL DEFAULT '',
  locked boolean NOT NULL DEFAULT true,
  point_a jsonb,
  point_b jsonb,
  author_name text,
  author_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS smart_album_swap_marks_album_idx
  ON public.smart_album_swap_marks(album_id, created_at);

ALTER TABLE public.smart_album_swap_marks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS smart_album_swap_marks_owner_all ON public.smart_album_swap_marks;
CREATE POLICY smart_album_swap_marks_owner_all ON public.smart_album_swap_marks
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

DROP POLICY IF EXISTS smart_album_swap_marks_select_public ON public.smart_album_swap_marks;
CREATE POLICY smart_album_swap_marks_select_public ON public.smart_album_swap_marks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.smart_albums a
      WHERE a.id = album_id
        AND (
          a.photographer_id = auth.uid()
          OR (a.status = 'published' AND COALESCE(a.share_link_enabled, true))
        )
    )
  );

DROP POLICY IF EXISTS smart_album_swap_marks_insert_client ON public.smart_album_swap_marks;
CREATE POLICY smart_album_swap_marks_insert_client ON public.smart_album_swap_marks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.smart_albums a
      WHERE a.id = album_id
        AND a.status = 'published'
        AND COALESCE(a.share_link_enabled, true)
    )
  );

DROP POLICY IF EXISTS smart_album_swap_marks_update_client ON public.smart_album_swap_marks;
CREATE POLICY smart_album_swap_marks_update_client ON public.smart_album_swap_marks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.smart_albums a
      WHERE a.id = album_id
        AND a.status = 'published'
        AND COALESCE(a.share_link_enabled, true)
    )
  );

DROP POLICY IF EXISTS smart_album_swap_marks_delete_client ON public.smart_album_swap_marks;
CREATE POLICY smart_album_swap_marks_delete_client ON public.smart_album_swap_marks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.smart_albums a
      WHERE a.id = album_id
        AND a.status = 'published'
        AND COALESCE(a.share_link_enabled, true)
    )
  );

COMMENT ON TABLE public.smart_album_swap_marks IS
  'Client swap requests between album photo slots (shared by client link and photographer).';

-- ---------------------------------------------------------------------------
-- Photo comment pins
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.smart_album_photo_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES public.smart_albums(id) ON DELETE CASCADE,
  page_num integer NOT NULL,
  cell_id integer NOT NULL DEFAULT 0,
  x_pct double precision NOT NULL,
  y_pct double precision NOT NULL,
  message text NOT NULL DEFAULT '',
  label text,
  pin_type text NOT NULL DEFAULT 'comment',
  author_name text,
  author_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS smart_album_photo_pins_album_idx
  ON public.smart_album_photo_pins(album_id, created_at);

ALTER TABLE public.smart_album_photo_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS smart_album_photo_pins_owner_all ON public.smart_album_photo_pins;
CREATE POLICY smart_album_photo_pins_owner_all ON public.smart_album_photo_pins
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

DROP POLICY IF EXISTS smart_album_photo_pins_select_public ON public.smart_album_photo_pins;
CREATE POLICY smart_album_photo_pins_select_public ON public.smart_album_photo_pins
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.smart_albums a
      WHERE a.id = album_id
        AND (
          a.photographer_id = auth.uid()
          OR (a.status = 'published' AND COALESCE(a.share_link_enabled, true))
        )
    )
  );

DROP POLICY IF EXISTS smart_album_photo_pins_insert_client ON public.smart_album_photo_pins;
CREATE POLICY smart_album_photo_pins_insert_client ON public.smart_album_photo_pins
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.smart_albums a
      WHERE a.id = album_id
        AND a.status = 'published'
        AND COALESCE(a.share_link_enabled, true)
        AND a.comments_enabled
    )
  );

DROP POLICY IF EXISTS smart_album_photo_pins_update_client ON public.smart_album_photo_pins;
CREATE POLICY smart_album_photo_pins_update_client ON public.smart_album_photo_pins
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.smart_albums a
      WHERE a.id = album_id
        AND a.status = 'published'
        AND COALESCE(a.share_link_enabled, true)
        AND a.comments_enabled
    )
  );

DROP POLICY IF EXISTS smart_album_photo_pins_delete_client ON public.smart_album_photo_pins;
CREATE POLICY smart_album_photo_pins_delete_client ON public.smart_album_photo_pins
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.smart_albums a
      WHERE a.id = album_id
        AND a.status = 'published'
        AND COALESCE(a.share_link_enabled, true)
        AND a.comments_enabled
    )
  );

COMMENT ON TABLE public.smart_album_photo_pins IS
  'Pinned photo comments on album pages (shared by client link and photographer).';

-- ---------------------------------------------------------------------------
-- Proof replies (to pins, swaps, or messages)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.smart_album_proof_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES public.smart_albums(id) ON DELETE CASCADE,
  parent_key text NOT NULL,
  body text NOT NULL DEFAULT '',
  author_type text NOT NULL CHECK (author_type IN ('client', 'photographer')),
  author_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS smart_album_proof_replies_album_parent_idx
  ON public.smart_album_proof_replies(album_id, parent_key, created_at);

ALTER TABLE public.smart_album_proof_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS smart_album_proof_replies_owner_all ON public.smart_album_proof_replies;
CREATE POLICY smart_album_proof_replies_owner_all ON public.smart_album_proof_replies
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

DROP POLICY IF EXISTS smart_album_proof_replies_select_public ON public.smart_album_proof_replies;
CREATE POLICY smart_album_proof_replies_select_public ON public.smart_album_proof_replies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.smart_albums a
      WHERE a.id = album_id
        AND (
          a.photographer_id = auth.uid()
          OR (a.status = 'published' AND COALESCE(a.share_link_enabled, true))
        )
    )
  );

DROP POLICY IF EXISTS smart_album_proof_replies_insert_client ON public.smart_album_proof_replies;
CREATE POLICY smart_album_proof_replies_insert_client ON public.smart_album_proof_replies
  FOR INSERT
  WITH CHECK (
    author_type = 'client'
    AND EXISTS (
      SELECT 1 FROM public.smart_albums a
      WHERE a.id = album_id
        AND a.status = 'published'
        AND COALESCE(a.share_link_enabled, true)
    )
  );

COMMENT ON TABLE public.smart_album_proof_replies IS
  'Threaded replies on pins, swaps, and feedback items.';

-- ---------------------------------------------------------------------------
-- Seen / unread (photographer + client)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.smart_album_feedback_seen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES public.smart_albums(id) ON DELETE CASCADE,
  viewer_role text NOT NULL CHECK (viewer_role IN ('photographer', 'client')),
  viewer_key text NOT NULL DEFAULT 'default',
  item_kind text NOT NULL CHECK (item_kind IN ('comment', 'swap', 'pin')),
  item_id text NOT NULL,
  seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (album_id, viewer_role, viewer_key, item_kind, item_id)
);

CREATE INDEX IF NOT EXISTS smart_album_feedback_seen_album_viewer_idx
  ON public.smart_album_feedback_seen(album_id, viewer_role, viewer_key);

ALTER TABLE public.smart_album_feedback_seen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS smart_album_feedback_seen_owner_all ON public.smart_album_feedback_seen;
CREATE POLICY smart_album_feedback_seen_owner_all ON public.smart_album_feedback_seen
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

DROP POLICY IF EXISTS smart_album_feedback_seen_client_all ON public.smart_album_feedback_seen;
CREATE POLICY smart_album_feedback_seen_client_all ON public.smart_album_feedback_seen
  FOR ALL
  USING (
    viewer_role = 'client'
    AND EXISTS (
      SELECT 1 FROM public.smart_albums a
      WHERE a.id = album_id
        AND a.status = 'published'
        AND COALESCE(a.share_link_enabled, true)
    )
  )
  WITH CHECK (
    viewer_role = 'client'
    AND EXISTS (
      SELECT 1 FROM public.smart_albums a
      WHERE a.id = album_id
        AND a.status = 'published'
        AND COALESCE(a.share_link_enabled, true)
    )
  );

COMMENT ON TABLE public.smart_album_feedback_seen IS
  'Per-viewer seen timestamps for comments, swaps, and pins.';
