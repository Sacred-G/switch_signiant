import fetch from 'node-fetch';

const supabaseUrl = 'https://zrkdvmcmmsnpbsclantd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpya2R2bWNtbXNucGJzY2xhbnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA4MjcyNDUsImV4cCI6MjA0NjQwMzI0NX0.bt8-l5kWheEBw-FM0cQRdrVkQlsKqozQlxZ7dxPBKNc';
const accessToken = 'sbp_f7cdb6e679026e6aafee220dc5c657ee12cb0ff1';

const sql = `
  ALTER TABLE transfer_history 
  ADD COLUMN IF NOT EXISTS completed_on TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_modified_on TIMESTAMP WITH TIME ZONE;
  
  CREATE INDEX IF NOT EXISTS transfer_history_completed_on_idx ON transfer_history(completed_on);
  CREATE INDEX IF NOT EXISTS transfer_history_last_modified_on_idx ON transfer_history(last_modified_on);
`;

async function updateTable() {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to update table:', error);
      process.exit(1);
    }

    console.log('Successfully updated transfer_history table');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateTable();
