import { SigniantApiAuth } from '../lib/signiant';
import config from '../config';

const BASE_URL = config.SIGNIANT_API_URL;

export const getAllJobs = async () => {
  try {
    const headers = await SigniantApiAuth.getAuthHeader();
    
    const response = await fetch(`${BASE_URL}/v1/jobs`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
    }

    const responseText = await response.text();
    console.log('Raw jobs response:', responseText);

    const jobsData = JSON.parse(responseText);
    console.log('Parsed jobs data:', jobsData);

    // Handle different response structures
    let jobs = [];
    if (jobsData.items) {
      jobs = jobsData.items;
    } else if (Array.isArray(jobsData)) {
      jobs = jobsData;
    } else {
      jobs = [jobsData];
    }

    console.log('Processing jobs:', jobs);

    // Process each job to get its transfers and files
    const processedJobs = await Promise.all(jobs.map(async (job) => {
      try {
        console.log(`Processing job ${job.jobId}`);
        
        // Get in-progress transfers
        const activeTransfers = await getJobTransfers(job.jobId);
        console.log(`Active transfers for job ${job.jobId}:`, activeTransfers);

        // Get both in-progress and completed files
        const [inProgressFiles, completedFiles] = await Promise.all([
          getJobFiles(job.jobId, 'IN_PROGRESS'),
          getJobFiles(job.jobId, 'TRANSFERRED')
        ]);

        console.log(`In-progress files for job ${job.jobId}:`, inProgressFiles);
        console.log(`Completed files for job ${job.jobId}:`, completedFiles);
        
        return {
          ...job,
          activeTransfers,
          files: {
            inProgress: inProgressFiles,
            completed: completedFiles
          }
        };
      } catch (error) {
        console.error(`Error processing job ${job.jobId}:`, error);
        return { 
          ...job, 
          activeTransfers: [], 
          files: {
            inProgress: [],
            completed: []
          }
        };
      }
    }));

    console.log('Final processed jobs:', processedJobs);
    return processedJobs;
  } catch (error) {
    console.error('Error in getAllJobs:', error);
    throw error;
  }
};

export const getJobTransfers = async (jobId) => {
  try {
    const headers = await SigniantApiAuth.getAuthHeader();
    
    console.log(`Fetching transfers for job ${jobId}`);
    const response = await fetch(`${BASE_URL}/v1/jobs/${jobId}/transfers?state=IN_PROGRESS`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`No transfers found for job ${jobId}`);
        return [];
      }
      const errorText = await response.text();
      console.error(`Failed to fetch transfers for job ${jobId}:`, errorText);
      return [];
    }

    const responseText = await response.text();
    console.log(`Raw transfers response for job ${jobId}:`, responseText);

    const data = JSON.parse(responseText);
    console.log(`Parsed transfers data for job ${jobId}:`, data);

    const transfers = data.items || [];
    console.log(`Final transfers for job ${jobId}:`, transfers);

    return transfers;
  } catch (error) {
    console.error(`Error fetching transfers for job ${jobId}:`, error);
    return [];
  }
};

export const getJobFiles = async (jobId, state = 'IN_PROGRESS') => {
  try {
    const headers = await SigniantApiAuth.getAuthHeader();
    
    console.log(`Fetching ${state} files for job ${jobId}`);
    const response = await fetch(`${BASE_URL}/v1/jobs/${jobId}/files?state=${state}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`No ${state} files found for job ${jobId}`);
        return [];
      }
      const errorText = await response.text();
      console.error(`Failed to fetch ${state} files for job ${jobId}:`, errorText);
      return [];
    }

    const responseText = await response.text();
    console.log(`Raw ${state} files response for job ${jobId}:`, responseText);

    const data = JSON.parse(responseText);
    console.log(`Parsed ${state} files data for job ${jobId}:`, data);

    const files = data.items || [];
    console.log(`Final ${state} files for job ${jobId}:`, files);

    return files;
  } catch (error) {
    console.error(`Error fetching ${state} files for job ${jobId}:`, error);
    return [];
  }
};
