import { createClient } from '@supabase/supabase-js';

export class SigniantApiAuth {
  constructor() {
    this.tokenUrl = `${import.meta.env.VITE_SIGNIANT_API_URL}/oauth/token`;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  static async isAuthenticated() {
    const instance = new SigniantApiAuth();
    try {
      await instance.getAccessToken();
      return true;
    } catch (error) {
      console.error('Authentication check failed:', error);
      return false;
    }
  }

  static async initialize() {
    const instance = new SigniantApiAuth();
    try {
      await instance.refreshToken();
      return true;
    } catch (error) {
      console.error('Failed to initialize SigniantApiAuth:', error);
      throw error;
    }
  }

  async getAccessToken() {
    if (!this.accessToken || !this.tokenExpiry || new Date() >= this.tokenExpiry) {
      await this.refreshToken();
    }
    return this.accessToken;
  }

  async refreshToken() {
    const formData = new URLSearchParams();
    formData.append('client_id', import.meta.env.VITE_SIGNIANT_CLIENT_ID);
    formData.append('client_secret', import.meta.env.VITE_SIGNIANT_CLIENT_SECRET);
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

  async getAuthHeader() {
    const token = await this.getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
}

// Create Supabase client for browser operations
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
