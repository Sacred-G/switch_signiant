import React, { useState, useEffect } from 'react';
import { getSigniantHeaders, pauseFolder, startFolder } from '../lib/signiant';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { withAuth } from '../lib/auth-utils';

interface Folder {
  jobId: string;
  name?: string;
  paused: boolean;
  actions?: Array<{
    data?: {
      source?: string;
    };
  }>;
}

interface FolderResponse {
  items: Folder[];
}

const FileMonitor: React.FC = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFolders = async (): Promise<void> => {
    try {
      const headers = await getSigniantHeaders();
      const response = await fetch('https://platform-api-service.services.cloud.signiant.com/v1/jobs', {
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to fetch folders');
      }

      const data: FolderResponse = await response.json();
      setFolders(data.items || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching folders:', err);
      setError('Failed to load folders. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
    // Set up polling interval
    const interval = setInterval(fetchFolders, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handlePauseFolder = async (jobId: string): Promise<void> => {
    try {
      await pauseFolder(jobId);
      await fetchFolders(); // Refresh the list
    } catch (err) {
      console.error('Error pausing folder:', err);
      setError('Failed to pause folder. Please try again.');
    }
  };

  const handleStartFolder = async (jobId: string): Promise<void> => {
    try {
      await startFolder(jobId);
      await fetchFolders(); // Refresh the list
    } catch (err) {
      console.error('Error starting folder:', err);
      setError('Failed to start folder. Please try again.');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading folders...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        <p>{error}</p>
        <Button onClick={fetchFolders} className="mt-2">Retry</Button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">File Monitor</h1>
      <div className="grid gap-4">
        {folders.map((folder) => (
          <Card key={folder.jobId} className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">{folder.name || 'Unnamed Folder'}</h2>
                <p className="text-sm text-gray-500">
                  Status: {folder.paused ? 'Paused' : 'Active'}
                </p>
                {folder.actions?.[0]?.data?.source && (
                  <p className="text-sm text-gray-500">
                    Source: {folder.actions[0].data.source}
                  </p>
                )}
              </div>
              <div>
                {folder.paused ? (
                  <Button
                    onClick={() => handleStartFolder(folder.jobId)}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    Start Monitoring
                  </Button>
                ) : (
                  <Button
                    onClick={() => handlePauseFolder(folder.jobId)}
                    className="bg-yellow-500 hover:bg-yellow-600"
                  >
                    Pause Monitoring
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
        {folders.length === 0 && (
          <p className="text-center text-gray-500">No folders found</p>
        )}
      </div>
    </div>
  );
};

export default withAuth(FileMonitor);
