import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';
import { Pause, Play, RefreshCw, Search, Loader2, Flame } from 'lucide-react'; // Import the Flame icon
import { useToast } from '../components/ui/use-toast';
import { getAuthHeaders } from '../lib/auth-utils';
import DashboardLayout from '../components/layout/DashboardLayout';

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
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [sources, setSources] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const { toast } = useToast();

  const fileNameWithWildcard = `**/${fileName}`;

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const headers = await getAuthHeaders();
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
          .sort((a, b) => a.name.localeCompare(b.name)); // Sort sources alphabetically

        const destinationProfiles = data.items
          .filter(profile =>
            profile.storageProfileId &&
            profile.storageProfileType === 'AWS_S3'
          )
          .sort((a, b) => a.name.localeCompare(b.name)); // Sort destinations alphabetically

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
      const headers = await getAuthHeaders();
      
      const [jobsResponse, profilesResponse] = await Promise.all([
        fetch('https://platform-api-service.services.cloud.signiant.com/v1/jobs', { headers }),
        fetch('https://platform-api-service.services.cloud.signiant.com/v1/storageProfiles', { headers })
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

  const handleJobAction = async (jobId, action) => {
    try {
      const headers = await getAuthHeaders();
      await fetch(
        `https://platform-api-service.services.cloud.signiant.com/v1/jobs/${jobId}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ status: action })
        }
      );
      
      toast({
        title: "Success",
        description: `Job ${action.toLowerCase()} successfully`
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);

    if (!fileName.endsWith('.mxf')) {
      toast({
        title: "Validation Error",
        description: "File must have .mxf extension",
        variant: "destructive",
      });
      setIsUploading(false);
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const jobBody = {
        name: fileName,
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
                inclusions: [fileNameWithWildcard],
                type: "GLOB"
              }
            }
          },
          triggers: [{
            type: "HOT_FOLDER",
            data: {
              source: {
                storageProfileId: selectedSource
              }
            }
          }]
        }]
      };

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

      setFileName('');
      setSelectedSource('');
      setSelectedDestination('');
      
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

  const content = (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Transfer Manager</h1>
        <Button onClick={fetchData} size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Create Transfer Job</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Source Profile (On-Premise)
              </label>
              <Select
                value={selectedSource}
                onValueChange={setSelectedSource}
              >
                <SelectTrigger className="bg-blue-50 border-blue-200 hover:border-blue-300 focus:ring-blue-500">
                  <SelectValue placeholder="Select source profile" />
                </SelectTrigger>
                <SelectContent className="bg-white border-blue-200">
                  <div className="py-2 px-2 text-sm font-medium text-blue-600 bg-blue-50">
                    On-Premise Storage
                  </div>
                  {sources.map(profile => (
                    <SelectItem
                      key={profile.storageProfileId}
                      value={profile.storageProfileId}
                      className="hover:bg-blue-50 focus:bg-blue-100"
                    >
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Destination Profile (AWS S3)
              </label>
              <Select
                value={selectedDestination}
                onValueChange={setSelectedDestination}
              >
                <SelectTrigger className="bg-green-50 border-green-200 hover:border-green-300 focus:ring-green-500">
                  <SelectValue placeholder="Select destination profile" />
                </SelectTrigger>
                <SelectContent className="bg-white border-green-200">
                  <div className="py-2 px-2 text-sm font-medium text-green-600 bg-green-50">
                    AWS S3 Storage
                  </div>
                  {destinations.map(profile => (
                    <SelectItem
                      key={profile.storageProfileId}
                      value={profile.storageProfileId}
                      className="hover:bg-green-50 focus:bg-green-100"
                    >
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                MXF File Name
              </label>
              <Input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Enter filename (e.g., DELETETEST_10242024_01d.mxf)"
                required
              />
              <p className="text-sm text-gray-500">
                File must have .mxf extension
              </p>
            </div>

            <Button
              type="submit"
              disabled={isUploading}
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
            className="w-full"
            prefix={<Search className="h-4 w-4" />}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-gray-50 border-gray-200 hover:border-gray-300 focus:ring-gray-500">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            <div className="py-2 px-2 text-sm font-medium text-gray-600 bg-gray-50">
              Filter by Status
            </div>
            <SelectItem value="all" className="hover:bg-gray-50 focus:bg-gray-100">
              All Statuses
            </SelectItem>
            <SelectItem value="READY" className="hover:bg-green-50 focus:bg-green-100">
              Ready
            </SelectItem>
            <SelectItem value="IN_PROGRESS" className="hover:bg-blue-50 focus:bg-blue-100">
              In Progress
            </SelectItem>
            <SelectItem value="COMPLETED" className="hover:bg-emerald-50 focus:bg-emerald-100">
              Completed
            </SelectItem>
            <SelectItem value="ERROR" className="hover:bg-red-50 focus:bg-red-100">
              Error
            </SelectItem>
            <SelectItem value="PAUSED" className="hover:bg-yellow-50 focus:bg-yellow-100">
              Paused
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filteredTransfers.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              No transfers found
            </CardContent>
          </Card>
        ) : (
          filteredTransfers.map(transfer => (
            <Card key={transfer.jobId} className="relative">
              {transfer.triggers?.some(trigger => trigger.type === "HOT_FOLDER") && (
                <Flame className="absolute top-2 right-2 h-6 w-6 text-red-500" />
              )}
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">
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
                      onClick={() => handleJobAction(transfer.jobId, "PAUSE")}
                      className="h-8 w-8 p-0"
                    >
                      <Pause className="h-4 w-4" />
                    </Button>
                  )}
                  {transfer.status === "PAUSED" && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleJobAction(transfer.jobId, "RESUME")}
                      className="h-8 w-8 p-0"
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
                      <p className="text-sm font-medium text-gray-700">Source</p>
                      <p className="text-sm text-gray-500">
                        {transfer.sourceProfile?.name || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Destination</p>
                      <p className="text-sm text-gray-500">
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
                      <div className="flex justify-between text-sm text-gray-500">
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

                  <div className="flex justify-between text-xs text-gray-500 pt-2">
                    <span>Job Name: {transfer.name}</span>
                    <span>
                      Last Activity: {new Date(transfer.lastModifiedOn).toLocaleString()}
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

  return <DashboardLayout>{content}</DashboardLayout>;
};

export default TransferManager;
