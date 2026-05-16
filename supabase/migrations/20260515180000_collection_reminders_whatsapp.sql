
-- Add WhatsApp support to collection_reminders table
ALTER TABLE collection_reminders 
ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_body TEXT,
ADD COLUMN IF NOT EXISTS to_whatsapp TEXT;

-- Comment on columns for clarity
COMMENT ON COLUMN collection_reminders.whatsapp_enabled IS 'Whether to send a WhatsApp notification';
COMMENT ON COLUMN collection_reminders.whatsapp_body IS 'The content of the WhatsApp message';
COMMENT ON COLUMN collection_reminders.to_whatsapp IS 'Direct phone number for WhatsApp notification (comma separated)';
