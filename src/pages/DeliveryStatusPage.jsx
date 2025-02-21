import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { getAllJobs } from '../services/deliveryService';

const DeliveryStatusPage = () => {
  const [jobsData, setJobsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const calculateProgress = (progress) => {
    if (!progress) return 0;
    const total = progress.transferred.bytes + progress.remaining.bytes;
    return total > 0 ? (progress.transferred.bytes / total) * 100 : 0;
  };

  const getStateVariant = (state) => {
    if (!state) return 'secondary';
    
    switch (state.toUpperCase()) {
      case 'TRANSFERRED':
      case 'COMPLETED':
        return 'success';
      case 'IN_PROGRESS':
      case 'TRANSFERRING':
        return 'warning';
      case 'CANCELLED':
        return 'secondary';
      case 'ERROR':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Fetching jobs data...');
        const jobs = await getAllJobs({
          // Include completed jobs from the last 30 days
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        });
        console.log('Fetched jobs data:', jobs);

        if (!jobs || jobs.length === 0) {
          console.log('No jobs data returned');
          setJobsData([]);
          return;
        }

        // Filter jobs to show only those with transfers or files
        const jobsWithTransfers = jobs.filter(job => 
          (job.activeTransfers && job.activeTransfers.length > 0) || 
          (job.files?.inProgress && job.files.inProgress.length > 0) ||
          (job.files?.completed && job.files.completed.length > 0)
        );

        console.log('Jobs with transfers:', jobsWithTransfers);
        setJobsData(jobsWithTransfers);
      } catch (err) {
        console.error('Error in main data fetch:', err);
        setError(err.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Refresh data every 30 seconds
    const intervalId = setInterval(() => {
      console.log('Running scheduled data refresh...');
      fetchData();
    }, 30000);

    return () => {
      console.log('Cleaning up interval');
      clearInterval(intervalId);
    };
  }, []);

  if (loading) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">Loading transfers...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-red-600">
              Error loading data: {error}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Transfer Status</h1>
      <div className="grid gap-4">
        {jobsData.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-gray-500 text-center">
                No active transfers found. Any ongoing or completed transfers will appear here.
              </div>
            </CardContent>
          </Card>
        ) : (
          jobsData.map((job) => (
            <Card key={job.jobId}>
            <CardHeader>
              <CardTitle className="flex flex-col gap-1">
                <div className="text-lg font-bold">
                  {job.jobName || job.name || 'Unnamed Job'}
                </div>
                <div className="text-sm text-gray-500">
                  Job ID: {job.jobId}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Active Transfers Section */}
                {job.activeTransfers && job.activeTransfers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Active Transfers</h3>
                    {job.activeTransfers.map((transfer) => (
                      <div key={transfer.transferId} className="bg-gray-50 p-3 rounded-lg mb-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Transfer ID: {transfer.transferId}</span>
                          <Badge variant="warning">IN PROGRESS</Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <Progress 
                            value={calculateProgress(transfer.transferProgress)} 
                            className="h-2"
                          />
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-500">Transferred: </span>
                              {formatBytes(transfer.transferProgress.transferred.bytes)} 
                              ({transfer.transferProgress.transferred.count} files)
                            </div>
                            <div>
                              <span className="text-gray-500">Remaining: </span>
                              {formatBytes(transfer.transferProgress.remaining.bytes)}
                              ({transfer.transferProgress.remaining.count} files)
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 text-sm">
                          <div className="text-gray-500">
                            Total Size: {formatBytes(transfer.objectsManifest.summary.bytes)}
                            ({transfer.objectsManifest.summary.count} files)
                          </div>
                        </div>

                        <div className="mt-2 text-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-gray-500">Source: </span>
                              {transfer.source.name}
                            </div>
                            <div>
                              <span className="text-gray-500">Destination: </span>
                              {transfer.destination.name}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Files Section */}
                <div className="space-y-4">
                  {/* In Progress Files */}
                  {job.files?.inProgress && job.files.inProgress.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">Files In Progress</h3>
                      <div className="space-y-2">
                        {job.files.inProgress.map((file) => (
                          <div key={`${file.url}-${file.transferId}`} className="bg-white border rounded p-2 text-sm">
                            <div className="flex justify-between items-center">
                              <div className="truncate flex-1">
                                <span className="font-medium">{file.url.split('/').pop()}</span>
                              </div>
                              <Badge variant={getStateVariant(file.state)} className="ml-2">
                                {file.state}
                              </Badge>
                            </div>
                            <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-gray-500">
                              <div>Size: {formatBytes(file.sizeInBytes)}</div>
                              <div>Type: {file.fileType}</div>
                              <div>Last Updated: {new Date(file.lastModifiedOn).toLocaleString()}</div>
                              <div>Transfer ID: {file.transferId}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Completed Files */}
                  {job.files?.completed && job.files.completed.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">Completed Transfers</h3>
                      <div className="space-y-2">
                        {job.files.completed.map((file) => (
                          <div key={`${file.url}-${file.transferId}`} className="bg-white border rounded p-2 text-sm">
                            <div className="flex justify-between items-center">
                              <div className="truncate flex-1">
                                <span className="font-medium">{file.url.split('/').pop()}</span>
                              </div>
                              <Badge variant={getStateVariant(file.state)} className="ml-2">
                                TRANSFERRED
                              </Badge>
                            </div>
                            <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-gray-500">
                              <div>Size: {formatBytes(file.sizeInBytes)}</div>
                              <div>Type: {file.fileType}</div>
                              <div>Completed: {new Date(file.lastModifiedOn).toLocaleString()}</div>
                              <div>Transfer ID: {file.transferId}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default DeliveryStatusPage;
