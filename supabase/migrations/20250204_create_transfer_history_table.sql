-- Create transfer_history table
CREATE TABLE IF NOT EXISTS transfer_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    job_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT,
    source TEXT,
    destination TEXT,
    total_bytes BIGINT DEFAULT 0,
    total_files INTEGER DEFAULT 0,
    created_on TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_modified_on TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, job_id)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transfer_history_user_id ON transfer_history(user_id);
CREATE INDEX IF NOT EXISTS idx_transfer_history_job_id ON transfer_history(job_id);
CREATE INDEX IF NOT EXISTS idx_transfer_history_created_on ON transfer_history(created_on);

-- Add RLS policies
ALTER TABLE transfer_history ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see only their own transfers
CREATE POLICY "Users can view their own transfers"
    ON transfer_history
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Policy to allow users to insert their own transfers
CREATE POLICY "Users can insert their own transfers"
    ON transfer_history
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own transfers
CREATE POLICY "Users can update their own transfers"
    ON transfer_history
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
