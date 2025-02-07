-- Create transfer_history table
CREATE TABLE IF NOT EXISTS transfer_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT,
  source TEXT,
  destination TEXT,
  total_bytes BIGINT,
  total_files INTEGER,
  created_on TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS transfer_history_user_id_idx ON transfer_history(user_id);
CREATE INDEX IF NOT EXISTS transfer_history_created_on_idx ON transfer_history(created_on);

-- Set up RLS (Row Level Security)
ALTER TABLE transfer_history ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own transfers
CREATE POLICY "Users can only access their own transfers"
  ON transfer_history
  FOR ALL
  USING (auth.uid() = user_id);
