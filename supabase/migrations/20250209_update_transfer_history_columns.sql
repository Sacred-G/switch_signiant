DO $$ 
BEGIN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'transfer_history' 
                  AND column_name = 'completed_on') THEN
        ALTER TABLE transfer_history 
        ADD COLUMN completed_on TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'transfer_history' 
                  AND column_name = 'last_modified_on') THEN
        ALTER TABLE transfer_history 
        ADD COLUMN last_modified_on TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Create indexes if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                  WHERE tablename = 'transfer_history' 
                  AND indexname = 'transfer_history_completed_on_idx') THEN
        CREATE INDEX transfer_history_completed_on_idx ON transfer_history(completed_on);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                  WHERE tablename = 'transfer_history' 
                  AND indexname = 'transfer_history_last_modified_on_idx') THEN
        CREATE INDEX transfer_history_last_modified_on_idx ON transfer_history(last_modified_on);
    END IF;
END $$;
