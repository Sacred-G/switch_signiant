-- Drop existing policy
DROP POLICY IF EXISTS "Users can only access their own failed transfers" ON failed_transfers;

-- Create separate policies for SELECT and INSERT/UPDATE
CREATE POLICY "Users can view their own failed transfers"
ON failed_transfers
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own failed transfers"
ON failed_transfers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own failed transfers"
ON failed_transfers
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
