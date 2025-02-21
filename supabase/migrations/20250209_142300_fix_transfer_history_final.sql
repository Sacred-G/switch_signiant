-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transfer_history' 
        AND column_name = 'completed_on'
    ) THEN
        ALTER TABLE transfer_history 
        ADD COLUMN completed_on TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transfer_history' 
        AND column_name = 'last_modified_on'
    ) THEN
        ALTER TABLE transfer_history 
        ADD COLUMN last_modified_on TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Create indexes if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'transfer_history' 
        AND indexname = 'transfer_history_completed_on_idx'
    ) THEN
        CREATE INDEX transfer_history_completed_on_idx ON transfer_history(completed_on);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'transfer_history' 
        AND indexname = 'transfer_history_last_modified_on_idx'
    ) THEN
        CREATE INDEX transfer_history_last_modified_on_idx ON transfer_history(last_modified_on);
    END IF;

    -- Update existing rows
    UPDATE transfer_history 
    SET last_modified_on = created_on 
    WHERE last_modified_on IS NULL;

    UPDATE transfer_history 
    SET completed_on = last_modified_on 
    WHERE status = 'COMPLETED' AND completed_on IS NULL;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can only access their own transfers" ON transfer_history;
    DROP POLICY IF EXISTS "Users can view their own transfers" ON transfer_history;
    DROP POLICY IF EXISTS "Users can insert their own transfers" ON transfer_history;
    DROP POLICY IF EXISTS "Users can update their own transfers" ON transfer_history;

    -- Create new policies
    CREATE POLICY "Users can view their own transfers"
    ON transfer_history
    FOR SELECT
    USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own transfers"
    ON transfer_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own transfers"
    ON transfer_history
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
END $$;
