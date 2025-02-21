import { SigniantApiAuth } from '../lib/signiant';
import config from '../config';

const BASE_URL = config.SIGNIANT_API_URL;

/**
 * Routes Management
 */
export const getAllRoutes = async () => {
  try {
    const headers = await SigniantApiAuth.getAuthHeader();
    console.log('Fetching routes with headers:', headers);
    const response = await fetch(`${BASE_URL}/v1/routes`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Routes API error:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        error: errorText
      });
      throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
    }

    const data = await response.json();
    console.log('Routes API response:', data);
    return data.items || [];
  } catch (error) {
    console.error('Error fetching routes:', error);
    throw error;
  }
};

export const createRoute = async (routeConfig) => {
  try {
    const headers = await SigniantApiAuth.getAuthHeader();
    console.log('Creating route with headers:', headers);
    const response = await fetch(`${BASE_URL}/v1/routes`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(routeConfig)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Create Route API error:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        error: errorText
      });
      throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
    }

    console.log('Create Route API response:', await response.json());
    return await response.json();
  } catch (error) {
    console.error('Error creating route:', error);
    throw error;
  }
};

/**
 * Storage Profiles Management
 */
export const getStorageProfiles = async () => {
  try {
    const headers = await SigniantApiAuth.getAuthHeader();
    console.log('Fetching storage profiles with headers:', headers);
    const response = await fetch(`${BASE_URL}/v1/storageProfiles`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Storage Profiles API error:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        error: errorText
      });
      throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
    }

    const data = await response.json();
    console.log('Storage Profiles API response:', data);
    return data.items || [];
  } catch (error) {
    console.error('Error fetching storage profiles:', error);
    throw error;
  }
};

export const createStorageProfile = async (profileConfig) => {
  try {
    const headers = await SigniantApiAuth.getAuthHeader();
    console.log('Creating storage profile with headers:', headers);
    const response = await fetch(`${BASE_URL}/v1/storageProfiles`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(profileConfig)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Create Storage Profile API error:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        error: errorText
      });
      throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
    }

    console.log('Create Storage Profile API response:', await response.json());
    return await response.json();
  } catch (error) {
    console.error('Error creating storage profile:', error);
    throw error;
  }
};

/**
 * Users Management
 */
export const getAllUsers = async () => {
  try {
    const headers = await SigniantApiAuth.getAuthHeader();
    console.log('Fetching users with headers:', headers);
    const response = await fetch(`${BASE_URL}/v1/users`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Users API error:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        error: errorText
      });
      throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
    }

    const data = await response.json();
    console.log('Users API response:', data);
    return (data.items || []).map(user => ({
      ...user,
      roles: Array.isArray(user.roles) ? user.roles : []
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

export const assignUserRole = async (email, role) => {
  try {
    const headers = await SigniantApiAuth.getAuthHeader();
    console.log('Assigning user role with headers:', headers);
    const response = await fetch(`${BASE_URL}/v1/users/${encodeURIComponent(email)}/roles`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Assign User Role API error:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        error: errorText
      });
      throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
    }

    console.log('Assign User Role API response:', await response.json());
    return await response.json();
  } catch (error) {
    console.error('Error assigning user role:', error);
    throw error;
  }
};

export const removeUserRole = async (email, roleId) => {
  try {
    const headers = await SigniantApiAuth.getAuthHeader();
    console.log('Removing user role with headers:', headers);
    const response = await fetch(`${BASE_URL}/v1/users/${encodeURIComponent(email)}/roles/${roleId}`, {
      method: 'DELETE',
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Remove User Role API error:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        error: errorText
      });
      throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
    }

    console.log('Remove User Role API response:', true);
    return true;
  } catch (error) {
    console.error('Error removing user role:', error);
    throw error;
  }
};

/**
 * Endpoints Management
 */
export const getAllEndpoints = async () => {
  try {
    const headers = await SigniantApiAuth.getAuthHeader();
    console.log('Fetching endpoints with headers:', headers);
    const response = await fetch(`${BASE_URL}/v1/endpoints`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Endpoints API error:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        error: errorText
      });
      throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
    }

    const data = await response.json();
    console.log('Endpoints API response:', data);
    return data.items || [];
  } catch (error) {
    console.error('Error fetching endpoints:', error);
    throw error;
  }
};

export const getEndpointDetails = async (endpointId) => {
  try {
    const headers = await SigniantApiAuth.getAuthHeader();
    console.log('Fetching endpoint details with headers:', headers);
    const response = await fetch(`${BASE_URL}/v1/endpoints/${endpointId}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Endpoint Details API error:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        error: errorText
      });
      throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
    }

    console.log('Endpoint Details API response:', await response.json());
    return await response.json();
  } catch (error) {
    console.error('Error fetching endpoint details:', error);
    throw error;
  }
};

export const updateEndpoint = async (endpointId, updateConfig) => {
  try {
    const headers = await SigniantApiAuth.getAuthHeader();
    console.log('Updating endpoint with headers:', headers);
    const response = await fetch(`${BASE_URL}/v1/endpoints/${endpointId}`, {
      method: 'PATCH',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateConfig)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Update Endpoint API error:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        error: errorText
      });
      throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
    }

    console.log('Update Endpoint API response:', await response.json());
    return await response.json();
  } catch (error) {
    console.error('Error updating endpoint:', error);
    throw error;
  }
};

export const generateEndpointShareCode = async (endpointId) => {
  try {
    const headers = await SigniantApiAuth.getAuthHeader();
    console.log('Generating endpoint share code with headers:', headers);
    const response = await fetch(`${BASE_URL}/v1/endpoints/${endpointId}/codes`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Generate Endpoint Share Code API error:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        error: errorText
      });
      throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
    }

    console.log('Generate Endpoint Share Code API response:', await response.json());
    return await response.json();
  } catch (error) {
    console.error('Error generating endpoint share code:', error);
    throw error;
  }
};
