
-- Create collection_reminders table to support multiple reminders per collection
CREATE TABLE IF NOT EXISTS collection_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    timing TEXT NOT NULL,
    to_email TEXT,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    include_pin BOOLEAN DEFAULT false,
    send_copy BOOLEAN DEFAULT true,
    activity_lists TEXT[] DEFAULT '{}',
    last_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE collection_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reminders for their own collections"
    ON collection_reminders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM collections
            WHERE collections.id = collection_reminders.collection_id
            AND collections.photographer_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert reminders for their own collections"
    ON collection_reminders FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM collections
            WHERE collections.id = collection_reminders.collection_id
            AND collections.photographer_id = auth.uid()
        )
    );

CREATE POLICY "Users can update reminders for their own collections"
    ON collection_reminders FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM collections
            WHERE collections.id = collection_reminders.collection_id
            AND collections.photographer_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete reminders for their own collections"
    ON collection_reminders FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM collections
            WHERE collections.id = collection_reminders.collection_id
            AND collections.photographer_id = auth.uid()
        )
    );

-- Migrate existing reminder data from collections table if it exists
DO $$
BEGIN
    INSERT INTO collection_reminders (
        collection_id,
        timing,
        to_email,
        subject,
        body,
        include_pin,
        send_copy,
        activity_lists
    )
    SELECT 
        id,
        expiry_email_timing,
        expiry_email_to,
        expiry_email_subject,
        expiry_email_body,
        expiry_email_include_pin,
        expiry_email_send_copy,
        expiry_email_lists
    FROM collections
    WHERE expiry_email_timing IS NOT NULL;
EXCEPTION
    WHEN undefined_column THEN
        -- Handle case where columns don't exist yet
        NULL;
END $$;
