
-- Add columns for Expiry Reminder Email feature
ALTER TABLE collections
ADD COLUMN IF NOT EXISTS expiry_email_timing TEXT,
ADD COLUMN IF NOT EXISTS expiry_email_to TEXT,
ADD COLUMN IF NOT EXISTS expiry_email_subject TEXT,
ADD COLUMN IF NOT EXISTS expiry_email_body TEXT,
ADD COLUMN IF NOT EXISTS expiry_email_include_pin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS expiry_email_send_copy BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS expiry_email_lists TEXT[] DEFAULT '{}';
