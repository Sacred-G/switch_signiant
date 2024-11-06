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

// Function to update job trigger to HOT_FOLDER
export const updateJobTrigger = async (jobId) => {
  try {
    const headers = await getSigniantHeaders();
    
    // First get the current job to preserve other settings
    const getResponse = await fetch(`${BASE_URL}/v1/jobs/${jobId}`, {
      headers
    });

    if (!getResponse.ok) {
      throw new Error('Failed to fetch job details');
    }

    const job = await getResponse.json();
    
    // Get the existing trigger or create a new one
    const existingTrigger = job.triggers?.[0] || {};
    const source = job.actions?.[0]?.data?.source;
    
    // Create the HOT_FOLDER trigger with all required properties
    const hotFolderTrigger = {
      ...existingTrigger,
      type: "HOT_FOLDER",
      events: [
        "hotFolder.files.discovered",
        "hotFolder.files.created",
        "hotFolder.files.modified",
        "hotFolder.signature.changed"
      ],
      metadata: {
        ...existingTrigger.metadata,
        monitorId: existingTrigger.metadata?.monitorId || `${jobId}-monitor`
      },
      monitor: {
        ...existingTrigger.monitor,
        monitorId: existingTrigger.monitor?.monitorId || `${jobId}-monitor`,
        accountId: source?.accountId,
        serviceId: source?.endpoint?.devices?.[0]?.serviceId,
        deviceId: source?.endpoint?.devices?.[0]?.deviceId,
        deviceStatus: "OK",
        initializationStatus: "OK",
        url: source?.url,
        status: { state: "OK" }
      },
      data: {
        ...existingTrigger.data,
        source: source
      }
    };

    // Update the job with the new trigger
    const updatedJob = {
      ...job,
      triggers: [hotFolderTrigger]
    };

    const updateResponse = await fetch(`${BASE_URL}/v1/jobs/${jobId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updatedJob)
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update job trigger: ${errorText}`);
    }

    return true;
  } catch (error) {
    console.error('Error updating job trigger:', error);
    throw error;
  }
};
