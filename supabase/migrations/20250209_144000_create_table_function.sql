-- Create a function to create tables dynamically
CREATE OR REPLACE FUNCTION create_update_transfer_history_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create the table if it doesn't exist
    CREATE TABLE IF NOT EXISTS update_transfer_history (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        job_id TEXT NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        source TEXT,
        destination TEXT,
        total_bytes BIGINT DEFAULT 0,
        total_files INTEGER DEFAULT 0,
        created_on TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_on TIMESTAMP WITH TIME ZONE,
        last_modified_on TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        update_type TEXT NOT NULL,
        previous_status TEXT,
        update_details JSONB,
        UNIQUE(user_id, job_id, created_on)
    );

    -- Enable RLS
    ALTER TABLE update_transfer_history ENABLE ROW LEVEL SECURITY;

    -- Create policies if they don't exist
    DO $$ 
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'update_transfer_history' 
            AND policyname = 'Users can view their own update history'
        ) THEN
            CREATE POLICY "Users can view their own update history"
                ON update_transfer_history
                FOR SELECT
                USING (auth.uid() = user_id);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'update_transfer_history' 
            AND policyname = 'Users can insert their own update history'
        ) THEN
            CREATE POLICY "Users can insert their own update history"
                ON update_transfer_history
                FOR INSERT
                WITH CHECK (auth.uid() = user_id);
        END IF;
    END $$;

    -- Create indexes if they don't exist
    CREATE INDEX IF NOT EXISTS update_transfer_history_user_id_idx ON update_transfer_history(user_id);
    CREATE INDEX IF NOT EXISTS update_transfer_history_job_id_idx ON update_transfer_history(job_id);
    CREATE INDEX IF NOT EXISTS update_transfer_history_status_idx ON update_transfer_history(status);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_update_transfer_history_table() TO authenticated;
