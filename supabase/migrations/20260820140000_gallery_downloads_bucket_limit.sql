-- Raise gallery-downloads bucket size limit (ON CONFLICT DO NOTHING in prior migration
-- leaves the default 50 MB cap if the bucket already existed).
UPDATE storage.buckets
SET file_size_limit = 5368709120
WHERE id = 'gallery-downloads';
