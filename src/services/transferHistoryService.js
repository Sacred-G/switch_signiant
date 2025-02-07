import { supabase } from '../lib/supabase';

/**
 * Migrate existing localStorage data to Supabase
 */
export const migrateLocalStorageToSupabase = async () => {
  try {
    const STORAGE_KEY = 'transfer_history';
    const historyString = localStorage.getItem(STORAGE_KEY);
    if (!historyString) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const localHistory = JSON.parse(historyString);
    
    // Transform and prepare data for Supabase
    const transferEntries = localHistory.map(transfer => ({
      user_id: user.id,
      job_id: transfer.job_id,
      name: transfer.name,
      status: transfer.status,
      source: transfer.source,
      destination: transfer.destination,
      total_bytes: transfer.total_bytes,
      total_files: transfer.total_files || 0,
      created_on: transfer.created_on || transfer.created || new Date().toISOString()
    }));

    // Check for existing entries first
    const { data: existingEntries, error: checkError } = await supabase
      .from('transfer_history')
      .select('job_id')
      .in('job_id', transferEntries.map(t => t.job_id));

    if (checkError) throw checkError;

    // Filter out entries that already exist
    const existingJobIds = new Set(existingEntries.map(e => e.job_id));
    const newEntries = transferEntries.filter(entry => !existingJobIds.has(entry.job_id));

    if (newEntries.length > 0) {
      // Only insert new entries
      const { error } = await supabase
        .from('transfer_history')
        .insert(newEntries);

      if (error) throw error;
      console.log(`Migrated ${newEntries.length} new entries to Supabase`);
    } else {
      console.log('No new entries to migrate');
    }

    // Clear localStorage after successful migration
    localStorage.removeItem(STORAGE_KEY);
    console.log('Successfully migrated local storage data to Supabase');
  } catch (error) {
    console.error('Error migrating data to Supabase:', error);
    throw error;
  }
};


/**
 * Get all transfer history from Supabase for the current user
 */
export const getTransferHistory = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('transfer_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_on', { ascending: false });

    if (error) throw error;

    console.log('Retrieved transfer history:', data);
    return data || [];
  } catch (error) {
    console.error('Error fetching transfer history:', error);
    return [];
  }
};

/**
 * Save or update a transfer in Supabase
 */
export const saveTransferToHistory = async (transfer) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    console.log('Saving transfer to history:', transfer);
    
    const transferEntry = {
      user_id: user.id,
      job_id: transfer.job_id,
      name: transfer.name,
      status: transfer.status,
      source: transfer.source,
      destination: transfer.destination,
      total_bytes: transfer.total_bytes,
      total_files: transfer.total_files || 0,
      created_on: transfer.created_on || transfer.created || new Date().toISOString()
    };

    // Upsert the transfer (insert if not exists, update if exists)
    const { error } = await supabase
      .from('transfer_history')
      .upsert(transferEntry, {
        onConflict: 'job_id',
        returning: 'minimal'
      });

    if (error) throw error;

    console.log('Saved transfer to history');
  } catch (error) {
    console.error('Error saving transfer to history:', error);
    throw error;
  }
};

/**
 * Clear all transfer history for the current user
 */
export const clearTransferHistory = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { error } = await supabase
      .from('transfer_history')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;

    console.log('Cleared transfer history');
  } catch (error) {
    console.error('Error clearing transfer history:', error);
    throw error;
  }
};
