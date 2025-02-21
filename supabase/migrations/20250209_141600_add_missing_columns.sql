-- Add missing columns to transfer_history table
ALTER TABLE transfer_history 
ADD COLUMN IF NOT EXISTS completed_on TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_modified_on TIMESTAMP WITH TIME ZONE;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS transfer_history_completed_on_idx ON transfer_history(completed_on);
CREATE INDEX IF NOT EXISTS transfer_history_last_modified_on_idx ON transfer_history(last_modified_on);

-- Update existing rows to set last_modified_on to created_on if it's null
UPDATE transfer_history 
SET last_modified_on = created_on 
WHERE last_modified_on IS NULL;

-- Update existing completed transfers to set completed_on
UPDATE transfer_history 
SET completed_on = last_modified_on 
WHERE status = 'COMPLETED' AND completed_on IS NULL;
