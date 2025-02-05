-- Add notification_emails column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'notification_preferences' 
        AND column_name = 'notification_emails'
    ) THEN
        ALTER TABLE notification_preferences 
        ADD COLUMN notification_emails TEXT[] DEFAULT '{}' NOT NULL;
    END IF;
END
$$;
