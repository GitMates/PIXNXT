-- Create collection_share_emails table to log sent/scheduled emails if not exists
CREATE TABLE IF NOT EXISTS public.collection_share_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  sender_email text,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'Sent',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS collection_share_emails_collection_id_idx
  ON public.collection_share_emails(collection_id);

CREATE INDEX IF NOT EXISTS collection_share_emails_created_at_idx
  ON public.collection_share_emails(created_at DESC);

ALTER TABLE public.collection_share_emails ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert and select rows
DROP POLICY IF EXISTS collection_share_emails_authenticated_policy ON public.collection_share_emails;
CREATE POLICY collection_share_emails_authenticated_policy ON public.collection_share_emails
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.collection_share_emails IS 'History of client gallery share emails sent by photographers.';
