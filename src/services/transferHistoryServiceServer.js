import { supabase } from '../lib/supabaseServer.js';

/**
 * Get all testing transfer history from Supabase for the current user
 */
export const getTestingTransferHistory = async () => {
  try {
    console.log('Getting current user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Error getting user:', userError);
      throw userError;
    }
    
    if (!user) {
      console.error('No authenticated user found');
      throw new Error('No authenticated user');
    }
    
    console.log('Found user:', user.id);

    console.log('Querying testing_transfer_history table...');
    const { data, error, count } = await supabase
      .from('testing_transfer_history')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('completed_on', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    console.log(`Retrieved ${count} testing transfer history records:`, data);
    
    if (!data || data.length === 0) {
      console.log('No testing transfer history found for user');
    }

    return data || [];
  } catch (error) {
    console.error('Error in getTestingTransferHistory:', error);
    if (error.message?.includes('JWT')) {
      console.error('JWT/Authentication error detected');
    }
    return [];
  }
};

/**
 * Save transfer to testing history table in Supabase
 */
export const saveToTestingHistory = async (transfer) => {
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
    
    console.log('Saving transfer to testing history:', JSON.stringify(transfer, null, 2));
    
    const transferEntry = {
      user_id: user.id,
      job_id: transfer.job_id,
      name: transfer.name,
      status: transfer.status,
      source: transfer.source,
      destination: transfer.destination,
      total_bytes: transfer.total_bytes,
      total_files: transfer.total_files || 0,
      created_on: transfer.createdOn || new Date().toISOString(),
      completed_on: transfer.status === 'COMPLETED' ? 
                   (transfer.completedOn || transfer.lastModifiedOn || new Date().toISOString()) : 
                   null,
      last_modified_on: transfer.lastModifiedOn || transfer.modified || new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('testing_transfer_history')
      .upsert(transferEntry, {
        onConflict: 'user_id,job_id',
        returning: 'representation'
      });

    if (error) {
      console.error('Supabase upsert error:', error);
      throw error;
    }

    console.log('Successfully saved transfer to testing history:', data);
    return data;
  } catch (error) {
    console.error('Error in saveToTestingHistory:', error);
    if (error.message?.includes('JWT')) {
      console.error('JWT/Authentication error detected');
    }
    throw error;
  }
};

/**
 * Get all failed transfers from Supabase for the current user
 */
export const getFailedTransfers = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('failed_transfers')
      .select('*')
      .eq('user_id', user.id)
      .order('failed_on', { ascending: false });

    if (error) throw error;

    console.log('Retrieved failed transfers:', data);
    return data || [];
  } catch (error) {
    console.error('Error fetching failed transfers:', error);
    return [];
  }
};

/**
 * Save a failed transfer to Supabase
 */
export const saveFailedTransfer = async (transfer) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    console.log('Saving failed transfer:', transfer);
    
    const transferEntry = {
      user_id: user.id,
      job_id: transfer.job_id,
      name: transfer.name,
      status: transfer.status,
      source: transfer.source,
      destination: transfer.destination,
      total_bytes: transfer.total_bytes,
      total_files: transfer.total_files || 0,
      error_message: transfer.error_message,
      failed_on: transfer.failed_on || new Date().toISOString()
    };

    const { error } = await supabase
      .from('failed_transfers')
      .upsert(transferEntry, {
        onConflict: 'user_id,job_id',
        returning: 'minimal'
      });

    if (error) throw error;

    console.log('Saved failed transfer');
  } catch (error) {
    console.error('Error saving failed transfer:', error);
    throw error;
  }
};

/**
 * Clear all failed transfers for the current user
 */
export const clearFailedTransfers = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { error } = await supabase
      .from('failed_transfers')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;

    console.log('Cleared failed transfers');
  } catch (error) {
    console.error('Error clearing failed transfers:', error);
    throw error;
  }
};

/**
 * Get all transfer history from Supabase for the current user
 */
export const getTransferHistory = async () => {
  try {
    console.log('Getting current user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Error getting user:', userError);
      throw userError;
    }
    
    if (!user) {
      console.error('No authenticated user found');
      throw new Error('No authenticated user');
    }
    
    console.log('Found user:', user.id);

    console.log('Querying transfer_history table...');
    const { data, error, count } = await supabase
      .from('transfer_history')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_on', { ascending: false }); // Order by creation time to show all transfers

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    console.log(`Retrieved ${count} transfer history records:`, data);
    
    if (!data || data.length === 0) {
      console.log('No transfer history found for user');
    }

    return data || [];
  } catch (error) {
    console.error('Error in getTransferHistory:', error);
    if (error.message?.includes('JWT')) {
      console.error('JWT/Authentication error detected');
    }
    return [];
  }
};

/**
 * Save or update a transfer in Supabase
 */
export const saveTransferToHistory = async (transfer) => {
  try {
    console.log('Getting current user for saving transfer...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Error getting user:', userError);
      throw userError;
    }
    
    if (!user) {
      console.error('No authenticated user found');
      throw new Error('No authenticated user');
    }
    
    console.log('Found user:', user.id);
    console.log('Saving transfer to history:', JSON.stringify(transfer, null, 2));
    
    const transferEntry = {
      user_id: user.id,
      job_id: transfer.job_id,
      name: transfer.name,
      status: transfer.status,
      source: transfer.source,
      destination: transfer.destination,
      total_bytes: transfer.total_bytes,
      total_files: transfer.total_files || 0,
      created_on: transfer.createdOn || new Date().toISOString(),
      completed_on: transfer.status === 'COMPLETED' ? 
                   (transfer.completedOn || transfer.lastModifiedOn || new Date().toISOString()) : 
                   null,
      last_modified_on: transfer.lastModifiedOn || transfer.modified || new Date().toISOString()
    };

    console.log('Prepared transfer entry:', JSON.stringify(transferEntry, null, 2));

    // Upsert the transfer (insert if not exists, update if exists)
    const { data, error } = await supabase
      .from('transfer_history')
      .upsert(transferEntry, {
        onConflict: 'user_id,job_id',
        returning: 'representation'
      });

    if (error) {
      console.error('Supabase upsert error:', error);
      throw error;
    }

    console.log('Successfully saved transfer to history:', data);
    return data;
  } catch (error) {
    console.error('Error in saveTransferToHistory:', error);
    if (error.message?.includes('JWT')) {
      console.error('JWT/Authentication error detected');
    }
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
