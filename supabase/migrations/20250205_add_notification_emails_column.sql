DO $$ 
BEGIN
    -- Check if the column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'notification_preferences' 
        AND column_name = 'notification_emails'
    ) THEN
        -- Add notification_emails column as text array
        ALTER TABLE notification_preferences ADD COLUMN notification_emails TEXT[] DEFAULT '{}';
        
        -- Set default empty array for existing rows
        UPDATE notification_preferences SET notification_emails = '{}' WHERE notification_emails IS NULL;
        
        -- Make the column non-nullable
        ALTER TABLE notification_preferences ALTER COLUMN notification_emails SET NOT NULL;
    END IF;
END $$;
