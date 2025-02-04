-- Add job_id column to notification_preferences table
ALTER TABLE notification_preferences ADD COLUMN job_id TEXT;

-- Create a unique constraint for user_id and job_id combination
ALTER TABLE notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_user_id_job_id_key;
ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_user_id_job_id_key UNIQUE (user_id, job_id);

-- Update existing rows to have null job_id (for global preferences)
UPDATE notification_preferences SET job_id = NULL WHERE job_id IS NOT NULL;

-- Add an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id_job_id ON notification_preferences(user_id, job_id);
