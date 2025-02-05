const STORAGE_KEY = 'transfer_history';

/**
 * Get all transfer history from localStorage
 */
export const getTransferHistory = async () => {
  try {
    const historyString = localStorage.getItem(STORAGE_KEY);
    const history = historyString ? JSON.parse(historyString) : [];
    console.log('Retrieved transfer history:', history);
    return history.sort((a, b) => new Date(b.created_on) - new Date(a.created_on));
  } catch (error) {
    console.error('Error fetching transfer history:', error);
    return [];
  }
};

/**
 * Save or update a transfer in localStorage
 */
export const clearTransferHistory = async () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('Cleared transfer history');
  } catch (error) {
    console.error('Error clearing transfer history:', error);
  }
};

export const saveTransferToHistory = async (transfer) => {
  try {
    console.log('Saving transfer to history:', transfer);
    
    // Get existing history
    const history = await getTransferHistory();
    
    // Find existing transfer index
    const existingIndex = history.findIndex(t => t.job_id === transfer.job_id);
    
    const historyEntry = {
      job_id: transfer.job_id,
      name: transfer.name,
      status: transfer.status,
      source: transfer.source,
      destination: transfer.destination,
      total_bytes: transfer.total_bytes,
      total_files: transfer.total_files || 0,
      created_on: transfer.created_on || new Date().toISOString(),
      last_modified_on: new Date().toISOString()
    };

    if (existingIndex !== -1) {
      // Update existing transfer
      history[existingIndex] = historyEntry;
    } else {
      // Add new transfer
      history.push(historyEntry);
    }

    // Save back to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    console.log('Saved transfer history:', history);
  } catch (error) {
    console.error('Error saving transfer to history:', error);
    throw error;
  }
};
