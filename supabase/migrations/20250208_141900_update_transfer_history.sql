-- Add new timestamp columns if they don't exist
ALTER TABLE transfer_history 
ADD COLUMN IF NOT EXISTS last_modified_on TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_on TIMESTAMP WITH TIME ZONE;

-- Add indexes for new timestamp columns
CREATE INDEX IF NOT EXISTS transfer_history_last_modified_idx ON transfer_history(last_modified_on);
CREATE INDEX IF NOT EXISTS transfer_history_completed_on_idx ON transfer_history(completed_on);

-- Update existing rows to have completed_on set to created_on for COMPLETED status
UPDATE transfer_history 
SET completed_on = created_on,
    last_modified_on = created_on
WHERE status = 'COMPLETED' AND completed_on IS NULL;

-- Add trigger to automatically update last_modified_on
CREATE OR REPLACE FUNCTION update_transfer_history_last_modified()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_modified_on = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_transfer_history_last_modified_trigger ON transfer_history;
CREATE TRIGGER update_transfer_history_last_modified_trigger
    BEFORE UPDATE ON transfer_history
    FOR EACH ROW
    EXECUTE FUNCTION update_transfer_history_last_modified();
