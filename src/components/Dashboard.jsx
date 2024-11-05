import React, { useState, useEffect } from 'react';
import DashboardLayout from './layout/DashboardLayout';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue, 
} from "./ui/select";
import { useToast } from "./ui/use-toast";
import { Loader2 } from 'lucide-react';
import { getAuthHeaders } from '../lib/auth-utils';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('');
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [sources, setSources] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const { toast } = useToast();

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
        
        // Filter for sources (only on-premise profiles)
        const sourceProfiles = data.items
          .filter(profile => 
            profile.storageProfileId && 
            profile.storageProfileType === 'ON_PREMISE_FILE_STORAGE'
          )
          .map(profile => ({
            id: profile.storageProfileId,
            name: profile.name,
            display: profile.name
          }));

        // Filter for destinations (_2024 profiles)
        const destinationProfiles = data.items
          .filter(profile =>
            profile.storageProfileId &&
            profile.storageProfileType === 'AWS_S3'
          )
          .map(profile => ({
            id: profile.storageProfileId,
            name: profile.name,
            display: profile.name
          }));

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
                inclusions: [fileName],
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

      // Reset form
      setFileName('');
      setSelectedSource('');
      setSelectedDestination('');
      
      // Show success message
      toast({
        title: "Success",
        description: `Job created successfully! Job ID: ${data.jobId}`,
      });
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

  return (
    <DashboardLayout>
      <div className="flex-1 p-8">
        <Card className="max-w-2xl mx-auto">
          <div className="p-6">
            <h1 className="text-2xl font-semibold mb-6">Create Transfer Job</h1>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Source Profile */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Source Profile (On-Premise)
                </label>
                <Select
                  value={selectedSource}
                  onValueChange={setSelectedSource}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map(profile => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.display}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Destination Profile */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Destination Profile (AWS S3)
                </label>
                <Select
                  value={selectedDestination}
                  onValueChange={setSelectedDestination}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinations.map(profile => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.display}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* MXF File Name */}
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

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isUploading}
                className="w-full"
              >
                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isUploading ? 'Creating...' : 'Create Transfer Job'}
              </Button>
            </form>
          </div>
        </Card>
        <div className="mt-6">
          <Link to="/transferfile" className="text-blue-500 hover:underline">
            Transfer File
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
