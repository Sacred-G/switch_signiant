import React, { useState, useEffect } from 'react';
import { getSigniantHeaders, pauseFolder, startFolder } from '../lib/signiant';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { withAuth } from '../lib/auth-utils';
import { Loader2, FolderOpen, PauseCircle, PlayCircle, AlertCircle } from 'lucide-react';
import { useToast } from '../components/ui/use-toast';

interface Folder {
  jobId: string;
  name?: string;
  paused: boolean;
  actions?: Array<{
    data?: {
      source?: {
        name: string;
        config?: {
          path: string;
        };
      };
      destination?: {
        name: string;
        config?: {
          path: string;
        };
      };
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
  const { toast } = useToast();

  const fetchFolders = async (): Promise<void> => {
    try {
      const headers = await getSigniantHeaders();
      const response = await fetch(`${import.meta.env.VITE_SIGNIANT_API_URL}/v1/jobs`, {
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
      toast({
        title: "Error",
        description: "Failed to load folders",
        variant: "destructive",
      });
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
      toast({
        title: "Success",
        description: "Folder monitoring paused",
      });
      await fetchFolders(); // Refresh the list
    } catch (err) {
      console.error('Error pausing folder:', err);
      toast({
        title: "Error",
        description: "Failed to pause folder monitoring",
        variant: "destructive",
      });
    }
  };

  const handleStartFolder = async (jobId: string): Promise<void> => {
    try {
      await startFolder(jobId);
      toast({
        title: "Success",
        description: "Folder monitoring started",
      });
      await fetchFolders(); // Refresh the list
    } catch (err) {
      console.error('Error starting folder:', err);
      toast({
        title: "Error",
        description: "Failed to start folder monitoring",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">File Monitor</h1>
          <p className="text-gray-500 mt-1">Monitor and manage your hot folders</p>
        </div>
        <Button onClick={fetchFolders} variant="outline" className="gap-2">
          <Loader2 className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg shadow-sm">
          <div className="flex items-center">
            <AlertCircle className="text-red-500 dark:text-red-400 mr-2" />
            <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {folders.map((folder) => (
          <Card key={folder.jobId} className="p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <FolderOpen className="h-5 w-5 text-blue-500 mr-2" />
                <h2 className="text-lg font-semibold">{folder.name || 'Unnamed Folder'}</h2>
              </div>
              <Badge variant={folder.paused ? "secondary" : "default"}>
                {folder.paused ? 'Paused' : 'Active'}
              </Badge>
            </div>

            <div className="space-y-2 mb-4">
              {folder.actions?.[0]?.data?.source?.name && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Source</p>
                  <p className="text-sm">{folder.actions[0].data.source.name}</p>
                </div>
              )}
              {folder.actions?.[0]?.data?.source?.config?.path && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Path</p>
                  <p className="text-sm break-all bg-gray-50 dark:bg-gray-800 p-2 rounded">
                    {folder.actions[0].data.source.config.path}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              {folder.paused ? (
                <Button
                  onClick={() => handleStartFolder(folder.jobId)}
                  variant="outline"
                  className="gap-2"
                >
                  <PlayCircle className="h-4 w-4 text-green-500" />
                  Start Monitoring
                </Button>
              ) : (
                <Button
                  onClick={() => handlePauseFolder(folder.jobId)}
                  variant="outline"
                  className="gap-2"
                >
                  <PauseCircle className="h-4 w-4 text-yellow-500" />
                  Pause Monitoring
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {folders.length === 0 && !error && (
        <Card className="p-6 text-center">
          <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No folders found</h3>
          <p className="text-gray-500 mt-1">
            No hot folders are currently configured for monitoring.
          </p>
        </Card>
      )}
    </div>
  );
};

export default withAuth(FileMonitor);
