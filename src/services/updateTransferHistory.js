import { supabase } from '../lib/supabase';

const ensureTableExists = async () => {
  try {
    // First check if table exists
    const { error: queryError } = await supabase
      .from('update_transfer_history')
      .select('id')
      .limit(1);

    // If we get a 404, table doesn't exist
    if (queryError && queryError.code === '42P01') {
      // First create the function if it doesn't exist
      const { error: functionError } = await supabase.rpc('create_function', {
        function_sql: `
          CREATE OR REPLACE FUNCTION create_table(table_sql text)
          RETURNS void
          LANGUAGE plpgsql
          SECURITY DEFINER
          SET search_path = public
          AS $$
          BEGIN
              EXECUTE table_sql;
          END;
          $$;

          GRANT EXECUTE ON FUNCTION create_table(text) TO authenticated;
        `
      });

      if (functionError) {
        console.error('Error creating function:', functionError);
        // Continue even if function creation fails, as it might already exist
      }

      // Now create the table
      const { error } = await supabase.rpc('create_table', {
        table_sql: `
          CREATE TABLE IF NOT EXISTS update_transfer_history (
            id BIGSERIAL PRIMARY KEY,
            user_id UUID NOT NULL,
            job_id TEXT NOT NULL,
            name TEXT NOT NULL,
            status TEXT NOT NULL,
            source TEXT,
            destination TEXT,
            total_bytes BIGINT DEFAULT 0,
            total_files INTEGER DEFAULT 0,
            created_on TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            completed_on TIMESTAMP WITH TIME ZONE,
            last_modified_on TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            update_type TEXT NOT NULL,
            previous_status TEXT,
            update_details JSONB,
            UNIQUE(user_id, job_id, created_on)
          );

          ALTER TABLE update_transfer_history ENABLE ROW LEVEL SECURITY;

          CREATE POLICY "Users can view their own update history"
            ON update_transfer_history
            FOR SELECT
            USING (auth.uid() = user_id);

          CREATE POLICY "Users can insert their own update history"
            ON update_transfer_history
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);

          CREATE INDEX IF NOT EXISTS update_transfer_history_user_id_idx ON update_transfer_history(user_id);
          CREATE INDEX IF NOT EXISTS update_transfer_history_job_id_idx ON update_transfer_history(job_id);
          CREATE INDEX IF NOT EXISTS update_transfer_history_status_idx ON update_transfer_history(status);
        `
      });

      if (error) {
        console.error('Error creating table:', error);
        throw error;
      }
    }
  } catch (error) {
    console.error('Error checking/creating table:', error);
    throw error;
  }
};

export const saveTransferUpdate = async (transfer, updateType, previousStatus = null, updateDetails = null) => {
  try {
    await ensureTableExists();
  } catch (error) {
    console.error('Error ensuring table exists:', error);
    // Continue even if table creation fails, as it might already exist
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Error getting user:', userError);
      throw userError;
    }
    
    if (!user) {
      console.error('No authenticated user found');
      throw new Error('No authenticated user');
    }

    const updateEntry = {
      user_id: user.id,
      job_id: transfer.job_id,
      name: transfer.name,
      status: transfer.status,
      source: transfer.source,
      destination: transfer.destination,
      total_bytes: transfer.total_bytes,
      total_files: transfer.total_files,
      created_on: new Date().toISOString(),
      completed_on: transfer.status === 'COMPLETED' ? new Date().toISOString() : null,
      last_modified_on: new Date().toISOString(),
      update_type: updateType,
      previous_status: previousStatus,
      update_details: updateDetails
    };

    const { error: insertError } = await supabase
      .from('update_transfer_history')
      .insert(updateEntry);

    if (insertError) {
      console.error('Error inserting transfer update:', insertError);
      throw insertError;
    }

    console.log('Successfully saved transfer update');
    return true;
  } catch (error) {
    console.error('Error saving transfer update:', error);
    return false;
  }
};

export const getTransferUpdates = async (jobId) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Error getting user:', userError);
      throw userError;
    }
    
    if (!user) {
      console.error('No authenticated user found');
      throw new Error('No authenticated user');
    }

    const { data, error } = await supabase
      .from('update_transfer_history')
      .select('*')
      .eq('user_id', user.id)
      .eq('job_id', jobId)
      .order('created_on', { ascending: false });

    if (error) {
      console.error('Error fetching transfer updates:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
};
