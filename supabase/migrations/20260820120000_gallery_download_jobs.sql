-- Async gallery download jobs with expiring download links.

CREATE TABLE IF NOT EXISTS public.gallery_download_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  photographer_id uuid REFERENCES public.photographers(id) ON DELETE SET NULL,
  visitor_email text NOT NULL,
  download_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'ready', 'failed', 'expired')),
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolution text NOT NULL DEFAULT 'full',
  photo_count integer NOT NULL DEFAULT 0,
  byte_size bigint NOT NULL DEFAULT 0,
  zip_filename text,
  storage_path text,
  error_message text,
  expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gallery_download_jobs_collection_id_idx
  ON public.gallery_download_jobs (collection_id);

CREATE INDEX IF NOT EXISTS gallery_download_jobs_token_idx
  ON public.gallery_download_jobs (download_token);

CREATE INDEX IF NOT EXISTS gallery_download_jobs_status_idx
  ON public.gallery_download_jobs (status);

CREATE INDEX IF NOT EXISTS gallery_download_jobs_expires_at_idx
  ON public.gallery_download_jobs (expires_at)
  WHERE status = 'ready';

COMMENT ON TABLE public.gallery_download_jobs IS
  'Server-side gallery zip downloads with expiring email links.';

COMMENT ON COLUMN public.gallery_download_jobs.scope IS
  'JSON: { whatScope, setKeys, photoIds, setNames, collectionName, collectionSlug }';

COMMENT ON COLUMN public.gallery_download_jobs.download_token IS
  'Opaque token for public /download/:token page and email links.';

ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS download_link_expiry_days integer NOT NULL DEFAULT 7;

COMMENT ON COLUMN public.deliveries.download_link_expiry_days IS
  'How many days a generated download link stays valid (default 7).';

-- Private bucket for generated zip files (served via signed URLs only).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gallery-downloads',
  'gallery-downloads',
  false,
  5368709120,
  ARRAY['application/zip', 'application/x-zip-compressed', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- Service role manages objects; anon can read via signed URLs from edge functions.
CREATE POLICY "Service role full access gallery downloads"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'gallery-downloads')
  WITH CHECK (bucket_id = 'gallery-downloads');

ALTER TABLE public.gallery_download_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers read own download jobs"
  ON public.gallery_download_jobs FOR SELECT
  TO authenticated
  USING (
    photographer_id = auth.uid()
    OR collection_id IN (
      SELECT id FROM public.deliveries WHERE photographer_id = auth.uid()
    )
  );

CREATE POLICY "Service role manages download jobs"
  ON public.gallery_download_jobs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
