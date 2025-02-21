import { SigniantApiAuth } from '../lib/signiant';
import config from '../config';
import { saveToTestingHistory, saveTransferToHistory } from './transferHistoryService';
import { saveTransferUpdate } from './updateTransferHistory';

const BASE_URL = config.SIGNIANT_API_URL;

export const getAllJobs = async (params = {}) => {
  try {
    const headers = await SigniantApiAuth.getAuthHeader();
    console.log('Using Signiant API headers:', headers);
    
    const requestBody = {
      query: params.query ? { text: params.query } : undefined,
      sortBy: params.sortBy || 'lastActivity',
      sortOrder: params.sortOrder || 'desc',
      offset: params.offset || 0,
      limit: params.limit || 100,
      filters: {
        showPartnerJobs: true,
        lastActivity: {},
        status: params.status || undefined
      },
      include: ['source', 'destination', 'sourceProfile', 'destinationProfile', 'actions', 'files', 'transfers']
    };

    // Add date filters if provided
    if (params.startDate || params.endDate) {
      if (params.startDate) {
        requestBody.filters.lastActivity.after = new Date(params.startDate).toISOString();
      }
      if (params.endDate) {
        // Add one day to end date to include the entire day
        const endDateTime = new Date(params.endDate);
        endDateTime.setDate(endDateTime.getDate() + 1);
        requestBody.filters.lastActivity.before = endDateTime.toISOString();
      }
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      requestBody.filters.lastActivity.after = thirtyDaysAgo.toISOString();
      requestBody.filters.lastActivity.before = new Date().toISOString();
    }

    console.log('Searching jobs with request:', JSON.stringify(requestBody, null, 2));
    console.log('Making request to jobs/search with headers:', {
      ...headers,
      Authorization: headers.Authorization ? '[REDACTED]' : undefined
    });
    const response = await fetch(`${BASE_URL}/v1/jobs/search`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from jobs/search:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
    }

    const responseText = await response.text();
    console.log('Raw jobs response:', responseText);

    if (!responseText) {
      console.error('Empty response from jobs/search');
      return [];
    }
    
    let jobsData;
    try {
      jobsData = JSON.parse(responseText);
      console.log('Successfully parsed jobs data:', jobsData);
    } catch (error) {
      console.error('Error parsing jobs response:', error);
      return [];
    }

    // Handle different response structures and ensure we have valid jobs
    let jobs = [];
    console.log('Raw jobsData structure:', {
      hasItems: !!jobsData.items,
      isArray: Array.isArray(jobsData),
      type: typeof jobsData,
      keys: Object.keys(jobsData),
      itemsType: jobsData.items ? typeof jobsData.items : 'undefined',
      itemsLength: jobsData.items?.length
    });

    if (jobsData.items && Array.isArray(jobsData.items)) {
      jobs = jobsData.items;
      console.log('Using items array from jobsData');
    } else if (Array.isArray(jobsData)) {
      jobs = jobsData;
      console.log('Using jobsData as array directly');
    } else if (jobsData && typeof jobsData === 'object') {
      jobs = [jobsData];
      console.log('Using jobsData as single job object');
    }

    if (jobs.length === 0) {
      console.log('No jobs found in response');
      return [];
    }

    // Log each job's structure before validation
    jobs.forEach((job, index) => {
      console.log(`Job ${index} structure:`, {
        hasJobId: !!job.jobId,
        hasName: !!job.name,
        hasJobName: !!job.jobName,
        hasSource: !!job.source,
        sourceType: typeof job.source,
        hasDestination: !!job.destination,
        destinationType: typeof job.destination,
        hasActions: !!job.actions,
        actionsLength: job.actions?.length,
        hasStorageProfileIds: !!job.storageProfileIds,
        storageProfileIdsLength: job.storageProfileIds?.length
      });
    });

    // Validate job data structure
    jobs = jobs.filter(job => {
      const isValid = job && job.jobId && (job.name || job.jobName);
      if (!isValid) {
        console.error('Invalid job data structure:', job);
      }
      return isValid;
    });

    console.log(`Found ${jobs.length} valid jobs`);

    console.log(`Processing ${jobs.length} jobs:`, jobs);

    // Process each job to get its transfers and files
    const processedJobs = await Promise.all(jobs.map(async (job) => {
      try {
        console.log(`Processing job ${job.jobId}`);
        
        // Get in-progress transfers with error handling
        let activeTransfers = [];
        try {
          activeTransfers = await getJobTransfers(job.jobId);
          console.log(`Active transfers for job ${job.jobId}:`, activeTransfers);
        } catch (error) {
          console.error(`Error fetching transfers for job ${job.jobId}:`, error);
        }

        // Get both in-progress and completed files with error handling
        let inProgressFiles = [], completedFiles = [];
        try {
          [inProgressFiles, completedFiles] = await Promise.all([
            getJobFiles(job.jobId, 'IN_PROGRESS'),
            getJobFiles(job.jobId, 'TRANSFERRED')
          ]);
          console.log(`In-progress files for job ${job.jobId}:`, inProgressFiles);
          console.log(`Completed files for job ${job.jobId}:`, completedFiles);
        } catch (error) {
          console.error(`Error fetching files for job ${job.jobId}:`, error);
        }

        // Get storage profile details
        let sourceProfile = null;
        let destinationProfile = null;
        
        try {
          if (job.storageProfileIds?.[0]) {
            const sourceResponse = await fetch(`${BASE_URL}/v1/storage-profiles/${job.storageProfileIds[0]}`, {
              method: 'GET',
              headers
            });
            const sourceResponseText = await sourceResponse.text();
            console.log(`Raw source profile response for ${job.storageProfileIds[0]}:`, sourceResponseText);
            
            if (sourceResponse.ok) {
              try {
                sourceProfile = JSON.parse(sourceResponseText);
                console.log('Source profile structure:', {
                  hasName: !!sourceProfile.name,
                  hasType: !!sourceProfile.type,
                  type: sourceProfile.type,
                  name: sourceProfile.name
                });
              } catch (parseError) {
                console.error(`Error parsing source profile for ${job.storageProfileIds[0]}:`, parseError);
              }
            } else {
              console.error(`Failed to fetch source profile ${job.storageProfileIds[0]}: ${sourceResponse.status}, response: ${sourceResponseText}`);
            }
          }
        } catch (error) {
          console.error(`Error fetching source profile: ${error}`);
        }

        try {
          if (job.storageProfileIds?.[1]) {
            const destResponse = await fetch(`${BASE_URL}/v1/storage-profiles/${job.storageProfileIds[1]}`, {
              method: 'GET',
              headers
            });
            const destResponseText = await destResponse.text();
            console.log(`Raw destination profile response for ${job.storageProfileIds[1]}:`, destResponseText);
            
            if (destResponse.ok) {
              try {
                destinationProfile = JSON.parse(destResponseText);
                console.log('Destination profile structure:', {
                  hasName: !!destinationProfile.name,
                  hasType: !!destinationProfile.type,
                  type: destinationProfile.type,
                  name: destinationProfile.name
                });
              } catch (parseError) {
                console.error(`Error parsing destination profile for ${job.storageProfileIds[1]}:`, parseError);
              }
            } else {
              console.error(`Failed to fetch destination profile ${job.storageProfileIds[1]}: ${destResponse.status}, response: ${destResponseText}`);
            }
          }
        } catch (error) {
          console.error(`Error fetching destination profile: ${error}`);
        }

        // Log raw data for debugging
        console.log('Raw job data for processing:', {
          jobId: job.jobId,
          name: job.name,
          sourceProfile,
          destinationProfile,
          source: job.source,
          destination: job.destination,
          activeTransfers: activeTransfers[0],
          status: job.status
        });

        // Get the job details first
        let jobDetails = {};
        try {
          console.log('Fetching job details for:', job.jobId);
          const jobDetailsResponse = await fetch(`${BASE_URL}/v1/jobs/${job.jobId}`, {
            method: 'GET',
            headers
          });

          if (!jobDetailsResponse.ok) {
            const errorText = await jobDetailsResponse.text();
            console.error(`Failed to fetch job details for ${job.jobId}:`, errorText);
          } else {
            const responseText = await jobDetailsResponse.text();
            console.log(`Raw job details response for ${job.jobId}:`, responseText);
            
            try {
              jobDetails = JSON.parse(responseText);
              console.log('Job details structure:', {
                hasSource: !!jobDetails.source,
                hasDestination: !!jobDetails.destination,
                sourceType: jobDetails.source ? typeof jobDetails.source : 'undefined',
                destinationType: jobDetails.destination ? typeof jobDetails.destination : 'undefined',
                hasStorageProfileIds: !!jobDetails.storageProfileIds,
                hasActions: !!jobDetails.actions,
                sourceValue: jobDetails.source,
                destinationValue: jobDetails.destination,
                actions: jobDetails.actions
              });

              // If source/destination are objects, log their structure
              if (jobDetails.source && typeof jobDetails.source === 'object') {
                console.log('Source object structure:', jobDetails.source);
              }
              if (jobDetails.destination && typeof jobDetails.destination === 'object') {
                console.log('Destination object structure:', jobDetails.destination);
              }

              // If we have actions, log their structure
              if (jobDetails.actions && jobDetails.actions.length > 0) {
                console.log('Actions structure:', jobDetails.actions.map(action => ({
                  type: action.type,
                  hasData: !!action.data,
                  dataStructure: action.data ? Object.keys(action.data) : []
                })));
              }
            } catch (parseError) {
              console.error(`Error parsing job details for ${job.jobId}:`, parseError);
            }
          }
        } catch (error) {
          console.error('Error fetching job details:', error);
        }

        // Extract source and destination names with detailed logging
        let sourceName = '';
        let destinationName = '';

        // Log all possible sources for debugging
        console.log('Source name candidates:', {
          fromSourceProfile: sourceProfile?.name,
          fromJobDetails: jobDetails.source?.name,
          fromJob: typeof job.source === 'string' ? job.source : job.source?.name,
          fromTransfer: activeTransfers[0]?.source?.name
        });

        console.log('Destination name candidates:', {
          fromDestProfile: destinationProfile?.name,
          fromJobDetails: jobDetails.destination?.name,
          fromJob: typeof job.destination === 'string' ? job.destination : job.destination?.name,
          fromTransfer: activeTransfers[0]?.destination?.name
        });

        // Try all possible sources for the names in order of preference
        sourceName = sourceProfile?.name || 
                    (jobDetails.source?.name || jobDetails.source?.path || jobDetails.source) || 
                    (job.source?.name || job.source?.path || job.source) || 
                    (activeTransfers[0]?.source?.name || activeTransfers[0]?.source?.path || activeTransfers[0]?.source) || 
                    '';

        destinationName = destinationProfile?.name || 
                         (jobDetails.destination?.name || jobDetails.destination?.path || jobDetails.destination) || 
                         (job.destination?.name || job.destination?.path || job.destination) || 
                         (activeTransfers[0]?.destination?.name || activeTransfers[0]?.destination?.path || activeTransfers[0]?.destination) || 
                         '';

        // Clean up the names if they're objects
        if (typeof sourceName === 'object') {
            sourceName = sourceName.name || sourceName.path || '';
        }
        if (typeof destinationName === 'object') {
            destinationName = destinationName.name || destinationName.path || '';
        }

        console.log('Selected names:', {
          sourceName,
          destinationName,
          sourceType: typeof sourceName,
          destType: typeof destinationName
        });

        // Try to get from storage profiles if still not set
        if ((!sourceName || !destinationName) && jobDetails.storageProfileIds) {
          for (const profileId of jobDetails.storageProfileIds) {
            try {
              const profileResponse = await fetch(`${BASE_URL}/v1/storage-profiles/${profileId}`, {
                method: 'GET',
                headers
              });
              
              if (profileResponse.ok) {
                const profile = await profileResponse.json();
                console.log('Storage profile:', profile);
                if (!sourceName && profile.type === 'SOURCE') {
                  sourceName = profile.name;
                }
                if (!destinationName && profile.type === 'DESTINATION') {
                  destinationName = profile.name;
                }
              }
            } catch (error) {
              console.error('Error fetching storage profile:', error);
            }
          }
        }

        console.log('Final extracted names:', {
          sourceName,
          destinationName
        });

        // Save completed files to history
        for (const file of completedFiles) {
          const completedTransfer = {
            job_id: job.jobId,
            name: job.jobName || job.name || job.jobId?.toString() || 'Unknown Job',
            status: 'COMPLETED',
            source: sourceName,
            destination: destinationName,
            total_bytes: file.sizeInBytes || 0,
            total_files: 1,
            createdOn: job.createdOn,
            completedOn: file.lastModifiedOn,
            lastModifiedOn: file.lastModifiedOn
          };
          
          try {
            await Promise.all([
              saveToTestingHistory(completedTransfer),
              saveTransferToHistory(completedTransfer),
              saveTransferUpdate(completedTransfer, 'status_change', 'IN_PROGRESS', {
                file_size: file.sizeInBytes,
                file_type: file.fileType,
                completed_time: file.lastModifiedOn
              })
            ]);
          } catch (error) {
            console.error('Error saving completed file to history:', error);
          }
        }

        // Save in-progress transfers and ready jobs
        if (activeTransfers.length > 0) {
          for (const transfer of activeTransfers) {
            const activeTransfer = {
              job_id: job.jobId,
              name: job.jobName || job.name || job.jobId?.toString() || 'Unknown Job',
              status: 'IN_PROGRESS',
              source: sourceName,
              destination: destinationName,
              total_bytes: transfer.objectsManifest?.summary?.bytes || 0,
              total_files: transfer.objectsManifest?.summary?.count || 0,
              createdOn: transfer.createdOn,
              completedOn: null,
              lastModifiedOn: job.lastModifiedOn
            };

            try {
              await Promise.all([
                saveToTestingHistory(activeTransfer),
                saveTransferToHistory(activeTransfer),
                saveTransferUpdate(activeTransfer, 'progress_update', null, {
                  bytes_transferred: transfer.transferProgress?.transferred?.bytes || 0,
                  files_transferred: transfer.transferProgress?.transferred?.count || 0,
                  bytes_remaining: transfer.transferProgress?.remaining?.bytes || 0,
                  files_remaining: transfer.transferProgress?.remaining?.count || 0
                })
              ]);
            } catch (error) {
              console.error('Error saving active transfer to history:', error);
            }
          }
        }
        
        // Save ready jobs to history
        if (job.status === 'READY') {
          const readyTransfer = {
            job_id: job.jobId,
            name: job.jobName || job.name || job.jobId?.toString() || 'Unknown Job',
            status: 'READY',
            source: sourceName,
            destination: destinationName,
            total_bytes: 0, // Will be updated when transfer starts
            total_files: 0, // Will be updated when transfer starts
            createdOn: job.createdOn || new Date().toISOString(),
            completedOn: null,
            lastModifiedOn: job.lastModifiedOn || new Date().toISOString()
          };

          try {
            await Promise.all([
              saveToTestingHistory(readyTransfer),
              saveTransferToHistory(readyTransfer),
              saveTransferUpdate(readyTransfer, 'status_change', null, {
                previous_status: null,
                new_status: 'READY',
                timestamp: new Date().toISOString()
              })
            ]);
          } catch (error) {
            console.error('Error saving ready job to history:', error);
          }
        }
        

        // Prepare the processed job with all necessary fields
        const processedJob = {
          ...job,
          jobId: job.jobId,
          jobName: job.name,
          name: job.jobName || job.name || job.jobId?.toString() || 'Unknown Job',
          status: job.status, // Preserve original status (READY, IN_PROGRESS, etc.)
          actions: jobDetails.actions || [],
            source: sourceName,
            destination: destinationName,
          activeTransfers,
          files: {
            inProgress: inProgressFiles,
            completed: completedFiles
          },
          total_bytes: activeTransfers.reduce((sum, t) => sum + (t.objectsManifest?.summary?.bytes || 0), 0),
          total_files: activeTransfers.reduce((sum, t) => sum + (t.objectsManifest?.summary?.count || 0), 0),
          createdOn: job.createdOn,
          lastModifiedOn: job.lastModifiedOn
        };

        return processedJob;
      } catch (error) {
        console.error(`Error processing job ${job.jobId}:`, error);
        // Even in error case, ensure we return a properly structured job
        return {
          ...job,
          jobId: job.jobId,
          jobName: job.name,
          name: job.jobName || job.name || job.jobId?.toString() || 'Unknown Job',
          status: job.status || 'UNKNOWN',
          source: '',
          destination: '',
          activeTransfers: [],
          files: {
            inProgress: [],
            completed: []
          },
          total_bytes: 0,
          total_files: 0,
          createdOn: job.createdOn || new Date().toISOString(),
          lastModifiedOn: job.lastModifiedOn || new Date().toISOString()
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

export const searchFiles = async (searchTerm, filters = {}) => {
  try {
    const headers = await SigniantApiAuth.getAuthHeader();
    
    const requestBody = {
      query: {
        path: searchTerm
      },
      filters: {
        state: filters.state || 'TRANSFERRED'
      }
    };

    // Add jobId filter if provided
    if (filters.jobId) {
      requestBody.filters.jobId = filters.jobId;
    }

    console.log('Searching files with request:', requestBody);
    const response = await fetch(`${BASE_URL}/v1/files/search`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
    }

    const data = await response.json();
    console.log('File search response:', data);
    return data;
  } catch (error) {
    console.error('Error searching files:', error);
    throw error;
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
