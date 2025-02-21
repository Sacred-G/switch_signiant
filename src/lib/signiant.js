import config from '../config';

const CLIENT_ID = config.SIGNIANT_CLIENT_ID;
const CLIENT_SECRET = config.SIGNIANT_CLIENT_SECRET;
const BASE_URL = config.SIGNIANT_API_URL;

export class SigniantApiAuth {
  static _instance = null;

  constructor() {
    if (SigniantApiAuth._instance) {
      return SigniantApiAuth._instance;
    }
    SigniantApiAuth._instance = this;
    this.tokenUrl = `${BASE_URL}/oauth/token`;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  static getInstance() {
    if (!SigniantApiAuth._instance) {
      SigniantApiAuth._instance = new SigniantApiAuth();
    }
    return SigniantApiAuth._instance;
  }

  async getAccessToken() {
    if (!this.accessToken || !this.tokenExpiry || new Date() >= this.tokenExpiry) {
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
      this.tokenExpiry = new Date(Date.now() + (data.expires_in - 300) * 1000);
    } catch (error) {
      console.error('Signiant token refresh error:', error);
      throw new Error(`Failed to obtain Signiant access token: ${error instanceof Error ? error.message : String(error)}`);
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

export const getSigniantHeaders = async () => {
  return await SigniantApiAuth.getAuthHeader();
};

export const startManualJob = async (jobId, isDirectory = true, relativePath = "/") => {
  try {
    const headers = await getSigniantHeaders();
    const response = await fetch(`${BASE_URL}/v1/jobs/${jobId}/deliveries`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        objects: [
          {
            relativePath,
            isDirectory
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to start job: ${errorText}`);
    }

    return true;
  } catch (error) {
    console.error('Error starting manual job:', error);
    throw error;
  }
};

export const pauseJob = async (jobId) => {
  try {
    const headers = await getSigniantHeaders();
    const response = await fetch(`${BASE_URL}/v1/jobs/${jobId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        paused: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to pause job: ${errorText}`);
    }

    return true;
  } catch (error) {
    console.error('Error pausing job:', error);
    throw error;
  }
};

export const resumeJob = async (jobId) => {
  try {
    const headers = await getSigniantHeaders();
    const response = await fetch(`${BASE_URL}/v1/jobs/${jobId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        paused: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to resume job: ${errorText}`);
    }

    return true;
  } catch (error) {
    console.error('Error resuming job:', error);
    throw error;
  }
};

export const deleteJob = async (jobId, confirmationText) => {
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

export const updateJobTrigger = async (jobId) => {
  try {
    const headers = await getSigniantHeaders();
    const getResponse = await fetch(`${BASE_URL}/v1/jobs/${jobId}`, {
      headers
    });

    if (!getResponse.ok) {
      throw new Error('Failed to fetch job details');
    }

    const job = await getResponse.json();
    
    const response = await fetch(`${BASE_URL}/v1/jobs/${jobId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        paused: job.paused,
        actions: job.actions,
        triggers: [{
          type: "HOT_FOLDER",
          events: [
            "hotFolder.files.discovered",
            "hotFolder.files.created",
            "hotFolder.files.modified",
            "hotFolder.signature.changed"
          ],
          data: {
            source: job.actions[0].data.source
          }
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update job trigger: ${errorText}`);
    }

    return true;
  } catch (error) {
    console.error('Error updating job trigger:', error);
    throw error;
  }
};

export const getTransferDetails = async (jobId) => {
  try {
    const headers = await getSigniantHeaders();
    const response = await fetch(`${BASE_URL}/v1/jobs/${jobId}/transfers?state=IN_PROGRESS`, {
      headers
    });

    if (!response.ok) {
      throw new Error('Failed to fetch transfer details');
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      return null;
    }

    const transfer = data.items[0];
    const progress = transfer.transferProgress;
    const totalCount = progress.transferred.count + progress.remaining.count;

    return {
      transferId: transfer.transferId,
      state: transfer.state,
      currentRateBitsPerSecond: transfer.currentRateBitsPerSecond,
      startTime: transfer.createdOn,
      bytesTransferred: progress.transferred.bytes,
      filesRemaining: progress.remaining.count,
      totalResultCount: totalCount,
      percentComplete: totalCount > 0 ? (progress.transferred.count / totalCount) * 100 : 0,
      objectsManifest: transfer.objectsManifest,
      transferProgress: progress
    };
  } catch (error) {
    console.error('Error fetching transfer details:', error);
    return null;
  }
};

export const pauseFolder = async (jobId) => {
  try {
    const headers = await getSigniantHeaders();
    const response = await fetch(`${BASE_URL}/v1/jobs/${jobId}`, {
      method: 'PATCH',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        paused: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to pause folder: ${errorText}`);
    }

    return true;
  } catch (error) {
    console.error('Error pausing folder:', error);
    throw error;
  }
};

export const startFolder = async (jobId) => {
  try {
    const headers = await getSigniantHeaders();
    const response = await fetch(`${BASE_URL}/v1/jobs/${jobId}`, {
      method: 'PATCH',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        paused: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to start folder: ${errorText}`);
    }

    return true;
  } catch (error) {
    console.error('Error starting folder:', error);
    throw error;
  }
};
