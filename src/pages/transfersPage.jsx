import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';
import { Pause, Play, RefreshCw, Search, Loader2, Flame, X } from 'lucide-react';
import { useToast } from '../components/ui/use-toast';
import { getSigniantHeaders, startManualJob, pauseJob, resumeJob } from '../lib/signiant';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};

const TransferManager = () => {
  const [transfers, setTransfers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('');
  const [fileNames, setFileNames] = useState([]);
  const [currentFileName, setCurrentFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [sources, setSources] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [triggerType, setTriggerType] = useState('MANUAL');
  const [isGrowingObjects, setIsGrowingObjects] = useState(false);
  const [postTransferAction, setPostTransferAction] = useState('none');
  const [moveDestinationId, setMoveDestinationId] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const headers = await getSigniantHeaders();
        const response = await fetch(
          "https://platform-api-service.services.cloud.signiant.com/v1/storageProfiles",
          {
            method: 'GET',
            headers: headers
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch profiles');
        }

        const data = await response.json();
        
        const sourceProfiles = data.items
          .filter(profile => 
            profile.storageProfileId && 
            profile.storageProfileType === 'ON_PREMISE_FILE_STORAGE'
          )
          .sort((a, b) => a.name.localeCompare(b.name));

        const destinationProfiles = data.items
          .filter(profile =>
            profile.storageProfileId &&
            profile.storageProfileType === 'AWS_S3'
          )
          .sort((a, b) => a.name.localeCompare(b.name));

        setSources(sourceProfiles);
        setDestinations(destinationProfiles);
      } catch (error) {
        console.error('Failed to fetch profiles:', error);
        toast({
          title: "Error",
          description: "Failed to fetch profiles. Please try again.",
          variant: "destructive",
        });
      }
    };

    fetchProfiles();
  }, []);

  const fetchData = async () => {
    try {
      const headers = await getSigniantHeaders();
      
      const [jobsResponse, profilesResponse] = await Promise.all([
        fetch('https://platform-api-service.services.cloud.signiant.com/v1/jobs', {
          headers
        }),
        fetch('https://platform-api-service.services.cloud.signiant.com/v1/storageProfiles', {
          headers
        })
      ]);

      const [jobsData, profilesData] = await Promise.all([
        jobsResponse.json(),
        profilesResponse.json()
      ]);

      const enrichedTransfers = jobsData.items.map(job => ({
        ...job,
        sourceProfile: profilesData.items.find(p => p.storageProfileId === job.actions?.[0]?.data?.source?.storageProfileId),
        destinationProfile: profilesData.items.find(p => p.storageProfileId === job.actions?.[0]?.data?.destination?.storageProfileId)
      }));

      setTransfers(enrichedTransfers);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleJobAction = async (jobId, action, triggers) => {
    try {
      if (action === "START") {
        await startManualJob(jobId);
      } else if (action === "PAUSE") {
        await pauseJob(jobId);
      } else if (action === "RESUME") {
        await resumeJob(jobId);
      }
      
      toast({
        title: "Success",
        description: `Job ${action.toLowerCase()}ed successfully`
      });
      
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action.toLowerCase()} job: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const handleAddFile = (e) => {
    e.preventDefault();
    if (!currentFileName) return;
    
    if (!currentFileName.endsWith('.mxf')) {
      toast({
        title: "Validation Error",
        description: "File must have .mxf extension",
        variant: "destructive",
      });
      return;
    }

    setFileNames([...fileNames, currentFileName]);
    setCurrentFileName('');
  };

  const handleRemoveFile = (index) => {
    setFileNames(fileNames.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (fileNames.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const headers = await getSigniantHeaders();
      const apiTriggerType = triggerType === 'HOT_FOLDER' ? 'HOTFOLDER' : triggerType;
      
      const jobBody = {
        name: fileNames.join(', '),
        triggerTypes: [apiTriggerType],
        actions: [{
          type: "TRANSFER",
          data: {
            source: {
              storageProfileId: selectedSource
            },
            destination: {
              storageProfileId: selectedDestination
            },
            transferOptions: {
              objectPatterns: {
                inclusions: fileNames.map(file => `**/${file}`),
                type: "GLOB"
              },
              areGrowingObjects: isGrowingObjects,
              ...(isGrowingObjects && {
                growingObjects: {
                  growingIdleTimeoutInSeconds: 5
                }
              })
            },
            postTransfer: postTransferAction !== 'none' ? {
              ...(postTransferAction === 'delete' && {
                deleteTransferredSourceFiles: {
                  enabled: true
                }
              }),
              ...(postTransferAction === 'move' && {
                moveTransferredSourceFiles: {
                  enabled: true,
                  destination: {
                    storageProfileId: moveDestinationId
                  }
                }
              })
            } : undefined
          }
        }],
        triggers: [{
          type: triggerType,
          data: {
            source: {
              storageProfileId: selectedSource
            }
          },
          ...(triggerType === "HOT_FOLDER" && {
            events: [
              "hotFolder.files.discovered",
              "hotFolder.files.created",
              "hotFolder.files.modified",
              "hotFolder.signature.changed"
            ]
          })
        }]
      };

      console.log('Creating job with body:', jobBody);

      const response = await fetch(
        "https://platform-api-service.services.cloud.signiant.com/v1/jobs",
        {
          method: 'POST',
          headers,
          body: JSON.stringify(jobBody)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create job');
      }

      const data = await response.json();

      setFileNames([]);
      setCurrentFileName('');
      setSelectedSource('');
      setSelectedDestination('');
      setTriggerType('MANUAL');
      setIsGrowingObjects(false);
      setPostTransferAction('none');
      setMoveDestinationId('');
      
      toast({
        title: "Success",
        description: `Job created successfully! Job ID: ${data.jobId}`,
      });

      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const filteredTransfers = transfers
    .filter(transfer => {
      const matchesSearch = transfer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          transfer.jobId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || transfer.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">Transfer Manager</h1>
        <Button onClick={fetchData} size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Create New Transfer Job</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium dark:text-gray-200">
                  Trigger Type
                </label>
                <Select
                  value={triggerType}
                  onValueChange={setTriggerType}
                >
                  <SelectTrigger className="bg-purple-50 border-purple-200 hover:border-purple-300 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                    <SelectValue placeholder="Select trigger type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-purple-200 dark:bg-gray-800 dark:border-gray-700">
                    <div className="py-2 px-2 text-sm font-medium text-purple-600 bg-purple-50 dark:bg-gray-700 dark:text-purple-400">
                      Trigger Types
                    </div>
                    <SelectItem 
                      value="MANUAL" 
                      className="hover:bg-purple-50 focus:bg-purple-100 dark:hover:bg-gray-700 dark:focus:bg-gray-600 dark:text-gray-200"
                    >
                      Manual Trigger
                    </SelectItem>
                    <SelectItem 
                      value="HOT_FOLDER" 
                      className="hover:bg-purple-50 focus:bg-purple-100 dark:hover:bg-gray-700 dark:focus:bg-gray-600 dark:text-gray-200"
                    >
                      Hot Folder
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 flex items-center">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isGrowingObjects}
                    onChange={(e) => setIsGrowingObjects(e.target.checked)}
                    className="form-checkbox h-4 w-4 text-purple-600 transition duration-150 ease-in-out"
                  />
                  <span className="text-sm font-medium dark:text-gray-200">
                    Growing Objects
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium dark:text-gray-200">
                Source Profile (Select Ingest)
              </label>
              <Select
                value={selectedSource}
                onValueChange={setSelectedSource}
              >
                <SelectTrigger className="bg-blue-50 border-blue-200 hover:border-blue-300 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                  <SelectValue placeholder="Select source profile" />
                </SelectTrigger>
                <SelectContent className="bg-white border-blue-200 dark:bg-gray-800 dark:border-gray-700">
                  <div className="py-2 px-2 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-gray-700 dark:text-blue-400">
                    On-Premise Storage
                  </div>
                  {sources.map(profile => (
                    <SelectItem
                      key={profile.storageProfileId}
                      value={profile.storageProfileId}
                      className="hover:bg-blue-50 focus:bg-blue-100 dark:hover:bg-gray-700 dark:focus:bg-gray-600 dark:text-gray-200"
                    >
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium dark:text-gray-200">
                Destination Profile (Select AWS S3 Folder)
              </label>
              <Select
                value={selectedDestination}
                onValueChange={setSelectedDestination}
              >
                <SelectTrigger className="bg-green-50 border-green-200 hover:border-green-300 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                  <SelectValue placeholder="Select destination profile" />
                </SelectTrigger>
                <SelectContent className="bg-white border-green-200 dark:bg-gray-800 dark:border-gray-700">
                  <div className="py-2 px-2 text-sm font-medium text-green-600 bg-green-50 dark:bg-gray-700 dark:text-green-400">
                    AWS S3 Storage
                  </div>
                  {destinations.map(profile => (
                    <SelectItem
                      key={profile.storageProfileId}
                      value={profile.storageProfileId}
                      className="hover:bg-green-50 focus:bg-green-100 dark:hover:bg-gray-700 dark:focus:bg-gray-600 dark:text-gray-200"
                    >
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium dark:text-gray-200">
                Post-Transfer Action
              </label>
              <Select
                value={postTransferAction}
                onValueChange={setPostTransferAction}
              >
                <SelectTrigger className="bg-orange-50 border-orange-200 hover:border-orange-300 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                  <SelectValue placeholder="Select post-transfer action" />
                </SelectTrigger>
                <SelectContent className="bg-white border-orange-200 dark:bg-gray-800 dark:border-gray-700">
                  <div className="py-2 px-2 text-sm font-medium text-orange-600 bg-orange-50 dark:bg-gray-700 dark:text-orange-400">
                    Post-Transfer Actions
                  </div>
                  <SelectItem 
                    value="none" 
                    className="hover:bg-orange-50 focus:bg-orange-100 dark:hover:bg-gray-700 dark:focus:bg-gray-600 dark:text-gray-200"
                  >
                    No Action
                  </SelectItem>
                  <SelectItem 
                    value="delete" 
                    className="hover:bg-orange-50 focus:bg-orange-100 dark:hover:bg-gray-700 dark:focus:bg-gray-600 dark:text-gray-200"
                  >
                    Delete Source Files
                  </SelectItem>
                  <SelectItem 
                    value="move" 
                    className="hover:bg-orange-50 focus:bg-orange-100 dark:hover:bg-gray-700 dark:focus:bg-gray-600 dark:text-gray-200"
                  >
                    Move Source Files
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {postTransferAction === 'move' && (
              <div className="space-y-2">
                <label className="text-sm font-medium dark:text-gray-200">
                  Move Destination Profile
                </label>
                <Select
                  value={moveDestinationId}
                  onValueChange={setMoveDestinationId}
                >
                  <SelectTrigger className="bg-orange-50 border-orange-200 hover:border-orange-300 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                    <SelectValue placeholder="Select move destination" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-orange-200 dark:bg-gray-800 dark:border-gray-700">
                    <div className="py-2 px-2 text-sm font-medium text-orange-600 bg-orange-50 dark:bg-gray-700 dark:text-orange-400">
                      Move Destinations
                    </div>
                    {sources.map(profile => (
                      <SelectItem
                        key={profile.storageProfileId}
                        value={profile.storageProfileId}
                        className="hover:bg-orange-50 focus:bg-orange-100 dark:hover:bg-gray-700 dark:focus:bg-gray-600 dark:text-gray-200"
                      >
                        {profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium dark:text-gray-200">
                MXF Files
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={currentFileName}
                  onChange={(e) => setCurrentFileName(e.target.value)}
                  placeholder="Enter filename (e.g., DELETETEST_10242024_01d.mxf)"
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400"
                />
                <Button 
                  type="button"
                  onClick={handleAddFile}
                  variant="outline"
                >
                  Add File
                </Button>
              </div>
              <div className="space-y-2 mt-2">
                {fileNames.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    <span className="text-sm dark:text-gray-200">{file}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(index)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Files must have .mxf extension
              </p>
            </div>

            <Button
              type="submit"
              disabled={isUploading || fileNames.length === 0 || (postTransferAction === 'move' && !moveDestinationId)}
              className="w-full"
            >
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isUploading ? 'Creating...' : 'Create Transfer Job'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex gap-4 items-center mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search transfers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400"
            prefix={<Search className="h-4 w-4 dark:text-gray-400" />}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-gray-50 border-gray-200 hover:border-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <div className="py-2 px-2 text-sm font-medium text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
              Filter by Status
            </div>
            <SelectItem value="all" className="hover:bg-gray-50 focus:bg-gray-100 dark:hover:bg-gray-700 dark:focus:bg-gray-600 dark:text-gray-200">
              All Statuses
            </SelectItem>
            <SelectItem value="READY" className="hover:bg-green-50 focus:bg-green-100 dark:hover:bg-gray-700 dark:focus:bg-gray-600 dark:text-gray-200">
              Ready
            </SelectItem>
            <SelectItem value="IN_PROGRESS" className="hover:bg-blue-50 focus:bg-blue-100 dark:hover:bg-gray-700 dark:focus:bg-gray-600 dark:text-gray-200">
              In Progress
            </SelectItem>
            <SelectItem value="COMPLETED" className="hover:bg-emerald-50 focus:bg-emerald-100 dark:hover:bg-gray-700 dark:focus:bg-gray-600 dark:text-gray-200">
              Completed
            </SelectItem>
            <SelectItem value="ERROR" className="hover:bg-red-50 focus:bg-red-100 dark:hover:bg-gray-700 dark:focus:bg-gray-600 dark:text-gray-200">
              Error
            </SelectItem>
            <SelectItem value="PAUSED" className="hover:bg-yellow-50 focus:bg-yellow-100 dark:hover:bg-gray-700 dark:focus:bg-gray-600 dark:text-gray-200">
              Paused
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-4">
        {filteredTransfers.length === 0 ? (
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-6 text-center text-gray-500 dark:text-gray-400">
              No transfers found
            </CardContent>
          </Card>
        ) : (
          filteredTransfers.map(transfer => (
            <Card key={transfer.jobId} className="relative dark:bg-gray-800 dark:border-gray-700">
              {transfer.triggers?.some(trigger => trigger.type === "HOT_FOLDER") && (
                <Flame className="absolute top-2 right-2 h-6 w-6 text-red-500" />
              )}
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg dark:text-white">
                  {transfer.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    transfer.status === "COMPLETED" ? "success" :
                    transfer.status === "ERROR" ? "destructive" :
                    transfer.status === "IN_PROGRESS" ? "default" :
                    transfer.status === "PAUSED" ? "warning" :
                    "secondary"
                  }>
                    {transfer.status}
                  </Badge>
                  {transfer.status === "IN_PROGRESS" && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleJobAction(transfer.jobId, "PAUSE", transfer.triggers)}
                      className="h-8 w-8 p-0 dark:border-gray-600 dark:hover:bg-gray-700"
                    >
                      <Pause className="h-4 w-4" />
                    </Button>
                  )}
                  {(transfer.status === "PAUSED" || transfer.status === "READY") && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleJobAction(
                        transfer.jobId, 
                        transfer.status === "READY" ? "START" : "RESUME",
                        transfer.triggers
                      )}
                      className="h-8 w-8 p-0 dark:border-gray-600 dark:hover:bg-gray-700"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Source</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {transfer.sourceProfile?.name || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Destination</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {transfer.destinationProfile?.name || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  
                  {transfer.status === "IN_PROGRESS" && (
                    <div className="space-y-2">
                      <Progress 
                        value={
                          (transfer.filesRemaining && transfer.totalResultCount) ?
                          ((transfer.totalResultCount - transfer.filesRemaining) / transfer.totalResultCount) * 100 :
                          0
                        } 
                        className="h-2"
                      />
                      <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                        <span>
                          {transfer.filesRemaining} files remaining
                        </span>
                        <span>
                          {transfer.currentRateBitsPerSecond ? 
                            `${(transfer.currentRateBitsPerSecond / 1000000).toFixed(2)} Mbps` : 
                            'Calculating...'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 pt-2">
                    <span>Job ID: {transfer.jobId}</span>
                    <span>
                      Last Activity: {formatDate(transfer.lastModifiedOn)}
                    </span>
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

export default TransferManager;
