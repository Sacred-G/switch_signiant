-- Drop existing unique constraints
ALTER TABLE transfer_history 
DROP CONSTRAINT IF EXISTS transfer_history_user_id_job_id_key;

ALTER TABLE failed_transfers
DROP CONSTRAINT IF EXISTS failed_transfers_user_id_job_id_key;

-- Recreate unique constraints with both columns
ALTER TABLE transfer_history
ADD CONSTRAINT transfer_history_user_id_job_id_key 
UNIQUE (user_id, job_id);

ALTER TABLE failed_transfers
ADD CONSTRAINT failed_transfers_user_id_job_id_key 
UNIQUE (user_id, job_id);
