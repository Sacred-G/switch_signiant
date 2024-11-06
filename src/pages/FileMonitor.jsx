import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Input } from '../components/ui/input';
import { Search, FileText, Loader2 } from 'lucide-react';
import { useToast } from '../components/ui/use-toast';
import { getAuthHeaders } from '../lib/auth-utils';


  /**
   * The FileMonitor component fetches a list of files being transferred from the Signiant Platform API and displays them in a table.
   * The table displays the file path, size, status, last activity time, and type.
   * The component also displays a set of stats cards above the table, which show the total number of files, the number of files in each state, and the total size of all files.
   * The component also includes a search bar which allows the user to filter the files by file path.
   * The component is refreshed every 30 seconds.
   */

const FileMonitor = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchFiles = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('https://platform-api-service.services.cloud.signiant.com/v1/jobs/files', {
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }

      const data = await response.json();
      setFiles(data.items || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch file data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
    // Refresh every 30 seconds
    const interval = setInterval(fetchFiles, 30000);
    return () => clearInterval(interval);
  }, []);


  /**
   * Converts a number of bytes to a human-readable string (e.g. '3.2 KB')
   * @param {number} bytes - The number of bytes to format
   * @returns {string} A string representation of the number of bytes
   */

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (state) => {
    switch (state) {
      case 'COMPLETED':
        return 'bg-green-500 text-white';
      case 'IN_PROGRESS':
        return 'bg-blue-500 text-white';
      case 'FAILED':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const filteredFiles = files.filter(file => 
    file.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: files.length,
    completed: files.filter(f => f.state === 'COMPLETED').length,
    inProgress: files.filter(f => f.state === 'IN_PROGRESS').length,
    failed: files.filter(f => f.state === 'FAILED').length,
    totalSize: files.reduce((acc, file) => acc + (file.sizeInBytes || 0), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Files</p>
                <h2 className="text-2xl font-bold text-blue-700">{stats.total}</h2>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-green-600 font-medium">Completed</p>
                <h2 className="text-2xl font-bold text-green-700">{stats.completed}</h2>
              </div>
              <div className="text-green-500">{Math.round((stats.completed / stats.total) * 100)}%</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-purple-600 font-medium">In Progress</p>
                <h2 className="text-2xl font-bold text-purple-700">{stats.inProgress}</h2>
              </div>
              <Progress value={(stats.inProgress / stats.total) * 100} className="w-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-orange-600 font-medium">Total Size</p>
                <h2 className="text-xl font-bold text-orange-700">{formatBytes(stats.totalSize)}</h2>
              </div>
              <div className="p-2 bg-orange-100 rounded-full">
                <span className="text-orange-500">📊</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search files..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Files Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer Files</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Path</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFiles.map((file, index) => (
                <TableRow key={`${file.jobId}-${index}`} className="hover:bg-gray-50">
                  <TableCell className="font-medium max-w-md truncate">
                    {file.url.replace('file://', '')}
                  </TableCell>
                  <TableCell>{formatBytes(file.sizeInBytes)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(file.state)}>{file.state}</Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(file.lastEventTime).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{file.fileType}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default FileMonitor;
