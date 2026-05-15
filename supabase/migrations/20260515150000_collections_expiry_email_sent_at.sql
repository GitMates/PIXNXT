-- Add tracking for sent expiry reminder emails
ALTER TABLE collections 
ADD COLUMN IF NOT EXISTS last_expiry_email_sent_at TIMESTAMPTZ;

-- Comment for documentation
COMMENT ON COLUMN collections.last_expiry_email_sent_at IS 'Timestamp of when the last automated expiry reminder email was sent.';
