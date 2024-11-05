import { SigniantAuth } from '../services/auth';
import { getSigniantHeaders } from './signiant';

// Helper function to get combined headers for API calls
export const getAuthHeaders = async () => {
  try {
    // First check if user is logged in with Supabase
    const isAuthenticated = await SigniantAuth.isAuthenticated();
    if (!isAuthenticated) {
      throw new Error('User not authenticated');
    }

    // Then get Signiant API headers
    const headers = await getSigniantHeaders();
    if (!headers) {
      throw new Error('Failed to get Signiant API headers');
    }

    return headers;
  } catch (error) {
    console.error('Authentication error:', error);
    throw new Error(error.message || 'Authentication failed');
  }
};
