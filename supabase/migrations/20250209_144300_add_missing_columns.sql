-- Add missing columns to transfer_history table
ALTER TABLE transfer_history
ADD COLUMN IF NOT EXISTS completed_on TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_modified_on TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing rows to set last_modified_on
UPDATE transfer_history
SET last_modified_on = created_on
WHERE last_modified_on IS NULL;

-- Create index for faster sorting
CREATE INDEX IF NOT EXISTS transfer_history_last_modified_on_idx ON transfer_history(last_modified_on);

-- Add NOT NULL constraint after setting default values
ALTER TABLE transfer_history
ALTER COLUMN last_modified_on SET NOT NULL;

-- Update unique constraint to handle multiple updates for the same job
ALTER TABLE transfer_history
DROP CONSTRAINT IF EXISTS transfer_history_user_id_job_id_key;

ALTER TABLE transfer_history
ADD CONSTRAINT transfer_history_user_id_job_id_created_on_key 
UNIQUE (user_id, job_id, created_on);
