-- Create failed_transfers table
CREATE TABLE IF NOT EXISTS failed_transfers (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT,
  source TEXT,
  destination TEXT,
  total_bytes BIGINT,
  total_files INTEGER,
  error_message TEXT,
  failed_on TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, job_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS failed_transfers_user_id_idx ON failed_transfers(user_id);
CREATE INDEX IF NOT EXISTS failed_transfers_failed_on_idx ON failed_transfers(failed_on);

-- Set up RLS (Row Level Security)
ALTER TABLE failed_transfers ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policy to allow users to only see their own failed transfers
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can only access their own failed transfers" ON failed_transfers;
    DROP POLICY IF EXISTS "Users can view their own failed transfers" ON failed_transfers;
    
    CREATE POLICY "Users can only access their own failed transfers"
    ON failed_transfers
    FOR ALL
    USING (auth.uid() = user_id);
END $$;
