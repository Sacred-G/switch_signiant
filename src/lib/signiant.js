const CLIENT_ID = import.meta.env.VITE_SIGNIANT_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_SIGNIANT_CLIENT_SECRET;
const BASE_URL = import.meta.env.VITE_SIGNIANT_API_URL;

export class SigniantApiAuth {
  constructor() {
    if (SigniantApiAuth._instance) {
      return SigniantApiAuth._instance;
    }
    
    this.tokenUrl = `${BASE_URL}/oauth/token`;
    this.accessToken = null;
    this.tokenExpiry = null;
    
    SigniantApiAuth._instance = this;
  }

  static getInstance() {
    return new SigniantApiAuth();
  }

  async getAccessToken() {
    if (!this.accessToken || new Date() >= this.tokenExpiry) {
      await this.refreshToken();
    }
    return this.accessToken;
  }

  async refreshToken() {
    const formData = new URLSearchParams();
    formData.append('client_id', CLIENT_ID);
    formData.append('client_secret', CLIENT_SECRET);
    formData.append('grant_type', 'client_credentials');

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    };

    try {
      console.log('Requesting new Signiant access token...');
      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers,
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Successfully obtained Signiant access token');
      this.accessToken = data.access_token;
      // Set expiry to 5 minutes before actual expiry to ensure token refreshes
      this.tokenExpiry = new Date(Date.now() + (data.expires_in - 300) * 1000);
    } catch (error) {
      console.error('Signiant token refresh error:', error);
      throw new Error(`Failed to obtain Signiant access token: ${error.message}`);
    }
  }

  static async getAuthHeader() {
    const instance = SigniantApiAuth.getInstance();
    const token = await instance.getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
}

// Initialize the singleton instance
SigniantApiAuth._instance = null;

// Helper function to get combined headers for API calls
export const getSigniantHeaders = async () => {
  const headers = await SigniantApiAuth.getAuthHeader();
  return headers;
};

// Function to delete a job with required confirmation
export const deleteJob = async (jobId, confirmationText) => {
  // Require explicit confirmation text "DELETE" to proceed
  if (confirmationText !== "DELETE") {
    throw new Error("Deletion not confirmed. Please type 'DELETE' to confirm.");
  }

  try {
    const headers = await getSigniantHeaders();
    const response = await fetch(`${BASE_URL}/v1/jobs/${jobId}`, {
      method: 'DELETE',
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete job: ${errorText}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting job:', error);
    throw error;
  }
};
