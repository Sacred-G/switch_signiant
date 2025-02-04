import { supabase } from '../lib/supabase';

/**
 * Get all transfer history from Supabase for the current user
 */
export const getTransferHistory = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const { data, error } = await supabase
      .from('transfer_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_on', { ascending: false });

    if (error) {
      console.error('Supabase error in getTransferHistory:', error);
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error fetching transfer history:', error);
    throw error;
  }
};

/**
 * Save or update a transfer in the transfer_history table
 */
export const saveTransferToHistory = async (transfer) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    // Check if transfer already exists
    const { data: existing } = await supabase
      .from('transfer_history')
      .select('id')
      .eq('job_id', transfer.jobId)
      .single();

    const historyEntry = {
      user_id: user.id,
      job_id: transfer.jobId,
      name: transfer.name,
      status: transfer.status,
      source: transfer.source,
      destination: transfer.destination,
      total_bytes: transfer.size,
      total_files: transfer.fileCount || 0,
      created_on: transfer.created_at || new Date().toISOString(),
      last_modified_on: new Date().toISOString()
    };

    if (existing) {
      // Update existing entry
      const { error: updateError } = await supabase
      .from('transfer_history')
      .update(historyEntry)
      .eq('job_id', transfer.jobId);

      if (updateError) {
        console.error('Supabase error in updateTransfer:', updateError);
        throw updateError;
      }
    } else {
      // Insert new entry
      const { error: insertError } = await supabase
      .from('transfer_history')
        .insert([historyEntry]);

      if (insertError) {
        console.error('Supabase error in insertTransfer:', insertError);
        throw insertError;
      }
    }
  } catch (error) {
    console.error('Error saving transfer to history:', error);
    throw error;
  }
};
