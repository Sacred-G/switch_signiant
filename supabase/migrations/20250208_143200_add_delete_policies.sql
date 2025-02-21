-- Add DELETE policies for transfer_history
CREATE POLICY "Users can delete their own transfers"
ON transfer_history
FOR DELETE
USING (auth.uid() = user_id);

-- Add DELETE policies for failed_transfers
CREATE POLICY "Users can delete their own failed transfers"
ON failed_transfers
FOR DELETE
USING (auth.uid() = user_id);
