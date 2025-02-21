DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can only access their own transfers" ON transfer_history;
    DROP POLICY IF EXISTS "Users can view their own transfers" ON transfer_history;
    DROP POLICY IF EXISTS "Users can insert their own transfers" ON transfer_history;
    DROP POLICY IF EXISTS "Users can update their own transfers" ON transfer_history;

    -- Create new policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'transfer_history' 
        AND policyname = 'Users can view their own transfers'
    ) THEN
        CREATE POLICY "Users can view their own transfers"
        ON transfer_history
        FOR SELECT
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'transfer_history' 
        AND policyname = 'Users can insert their own transfers'
    ) THEN
        CREATE POLICY "Users can insert their own transfers"
        ON transfer_history
        FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'transfer_history' 
        AND policyname = 'Users can update their own transfers'
    ) THEN
        CREATE POLICY "Users can update their own transfers"
        ON transfer_history
        FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
