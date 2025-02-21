import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Search, Loader2, AlertTriangle, RefreshCw, X, Download } from 'lucide-react';
import { getAllJobs, searchFiles } from '../services/deliveryService';

const JobSearchPage = () => {
  // Initialize with last 30 days
  const getDefaultDates = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  const [searchParams, setSearchParams] = useState({
    query: '',
    ...getDefaultDates(),
    fileQuery: '',
    sortBy: 'lastActivity',
    sortOrder: 'desc',
    status: 'ALL'
  });
  const [fileSearchResults, setFileSearchResults] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJobs, setSelectedJobs] = useState(new Set());
  const ITEMS_PER_PAGE = 10;

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSelectedJobs(new Set());
    setPage(1);

    console.log('Starting job search with params:', searchParams);
    try {
      console.log('Calling getAllJobs with params:', {
        query: searchParams.query,
        startDate: searchParams.startDate,
        endDate: searchParams.endDate,
        sortBy: searchParams.sortBy,
        sortOrder: searchParams.sortOrder,
        status: searchParams.status === 'ALL' ? undefined : searchParams.status
      });
      const jobs = await getAllJobs({
        query: searchParams.query,
        startDate: searchParams.startDate,
        endDate: searchParams.endDate,
        sortBy: searchParams.sortBy,
        sortOrder: searchParams.sortOrder,
        status: searchParams.status === 'ALL' ? undefined : searchParams.status
      });
      console.log('Received jobs:', jobs);
      setSearchResults(jobs);
    } catch (error) {
      console.error('Error searching jobs:', error);
      setError('Failed to search jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Perform initial search on component mount
  React.useEffect(() => {
    handleSearch({ preventDefault: () => {} });
  }, []);

  const handleFileSearch = async () => {
    if (!searchParams.fileQuery) return;
    setLoading(true);
    try {
      const selectedJob = searchResults?.find(job => selectedJobs.has(job.jobId));
      const filters = {
        state: 'TRANSFERRED'
      };
      if (selectedJob) {
        filters.jobId = selectedJob.jobId;
      }
      const results = await searchFiles(searchParams.fileQuery, filters);
      setFileSearchResults(results);
    } catch (error) {
      console.error('Error searching files:', error);
      setError('Failed to search files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const refreshJobs = async () => {
    if (searchResults.length === 0) return;
    setRefreshing(true);
    try {
      const updatedJobs = await getAllJobs({
        query: searchParams.query,
        startDate: searchParams.startDate,
        endDate: searchParams.endDate,
        sortBy: searchParams.sortBy,
        sortOrder: searchParams.sortOrder,
        status: searchParams.status === 'ALL' ? undefined : searchParams.status
      });
      setSearchResults(updatedJobs);
    } catch (error) {
      console.error('Error refreshing jobs:', error);
      setError('Failed to refresh jobs. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Job ID',
      'Job Name',
      'Status',
      'Last Activity',
      'Files Remaining',
      'Current Rate',
      'Est. Completion',
      'Error Code'
    ];

    const csvContent = searchResults.map(job => [
      job.jobId,
      job.jobName || 'Unnamed Job',
      job.status,
      formatDate(job.lastActivity),
      job.filesRemaining || '0',
      formatBitRate(job.currentRateBitsPerSecond),
      formatTimeRemaining(job.estimatedCompletionSeconds),
      job.errorCode || ''
    ]);

    const csv = [
      headers.join(','),
      ...csvContent.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `job_search_results_${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatBitRate = (bitsPerSecond) => {
    if (!bitsPerSecond || bitsPerSecond === 0) return '0 bps';
    const k = 1024;
    const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps'];
    const i = Math.floor(Math.log(bitsPerSecond) / Math.log(k));
    return parseFloat((bitsPerSecond / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimeRemaining = (seconds) => {
    if (!seconds || seconds === 0) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);

    return parts.join(' ');
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Job Search</h1>
        {searchResults.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={exportToCSV}
            >
              <Download className="h-4 w-4" />
              <span className="ml-2">Export</span>
            </Button>
            <Button
              variant="outline"
              onClick={refreshJobs}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="ml-2">Refresh</span>
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Job Search Section */}
            <div>
              <h3 className="text-lg font-medium mb-4">Search Jobs</h3>
              <div className="flex gap-4 flex-wrap mb-4 items-end">
                <div className="flex gap-2">
                  <Select
                    value={searchParams.status}
                    onValueChange={(value) => setSearchParams(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                      <SelectItem value="PAUSED">Paused</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={searchParams.sortBy}
                    onValueChange={(value) => setSearchParams(prev => ({ ...prev, sortBy: value }))}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lastActivity">Last Activity</SelectItem>
                      <SelectItem value="jobName">Job Name</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={searchParams.sortOrder}
                    onValueChange={(value) => setSearchParams(prev => ({ ...prev, sortOrder: value }))}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Descending</SelectItem>
                      <SelectItem value="asc">Ascending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-4 flex-wrap">
                <Input
                  placeholder="Search by name or job ID..."
                  value={searchParams.query}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, query: e.target.value }))}
                  className="flex-1 min-w-[200px]"
                />
                <div className="flex flex-col">
                  <label className="text-sm mb-1">Start Date</label>
                  <Input
                    type="date"
                    value={searchParams.startDate}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-48"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm mb-1">End Date</label>
                  <Input
                    type="date"
                    value={searchParams.endDate}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-48"
                  />
                </div>
                <div className="flex gap-2 self-end">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSearchParams({
                        query: '',
                        ...getDefaultDates(),
                        fileQuery: '',
                        sortBy: 'lastActivity',
                        sortOrder: 'desc',
                        status: 'ALL'
                      });
                      setSearchResults([]);
                      setFileSearchResults(null);
                      setSelectedJobs(new Set());
                    }}
                  >
                    <X className="h-4 w-4" />
                    <span className="ml-2">Clear</span>
                  </Button>
                  <Button 
                    type="button" 
                    disabled={loading} 
                    onClick={handleSearch}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    <span className="ml-2">Search Jobs</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* File Search Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Search Files</h3>
              <div className="flex gap-4 flex-wrap">
                <Input
                  placeholder="Search files by name or path..."
                  value={searchParams.fileQuery}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, fileQuery: e.target.value }))}
                  className="flex-1 min-w-[200px]"
                />
                <Button 
                  type="button"
                  disabled={loading}
                  className="self-end"
                  onClick={handleFileSearch}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span className="ml-2">Search Files</span>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="text-red-500 p-4 rounded bg-red-50 dark:bg-red-900/20">
          {error}
        </div>
      )}

      {/* Job Search Results */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                Job Search Results ({searchResults.length})
                {selectedJobs.size > 0 && ` - Selected: ${selectedJobs.size}`}
              </CardTitle>
              {searchResults.length > 0 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedJobs.size === searchResults.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedJobs(new Set(searchResults.map(job => job.jobId)));
                      } else {
                        setSelectedJobs(new Set());
                      }
                    }}
                  />
                  <span className="text-sm">Select All</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {searchResults
                .slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
                .map(job => (
                <Card 
                  key={job.jobId} 
                  className={`p-4 ${selectedJobs.has(job.jobId) ? 'ring-2 ring-indigo-500' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedJobs.has(job.jobId)}
                      onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedJobs);
                        if (checked) {
                          newSelected.add(job.jobId);
                        } else {
                          newSelected.delete(job.jobId);
                        }
                        setSelectedJobs(newSelected);
                      }}
                    />
                    <div className="grid grid-cols-2 gap-4 flex-1">
                      <div>
                        <h3 className="font-semibold">{job.jobName || 'Unnamed Job'}</h3>
                        <p className="text-sm text-gray-500">ID: {job.jobId}</p>
                        {job.activeAlerts && job.activeAlerts.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 text-amber-500">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm">{job.activeAlerts[0].type}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm">Last Activity: {formatDate(job.lastActivity)}</p>
                        <p className="text-sm">Status: {job.status}</p>
                        {job.filesRemaining > 0 && (
                          <p className="text-sm">Files Remaining: {job.filesRemaining}</p>
                        )}
                        {job.currentRateBitsPerSecond > 0 && (
                          <p className="text-sm">Current Rate: {formatBitRate(job.currentRateBitsPerSecond)}</p>
                        )}
                        {job.estimatedCompletionSeconds > 0 && (
                          <p className="text-sm">Est. Completion: {formatTimeRemaining(job.estimatedCompletionSeconds)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {job.errorCode && (
                    <div className="mt-4 p-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded">
                      Error Code: {job.errorCode}
                    </div>
                  )}
                </Card>
              ))}
            </div>
            {searchResults.length > ITEMS_PER_PAGE && (
              <div className="flex justify-center gap-2 p-4 border-t mt-4">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="py-2">
                  Page {page} of {Math.ceil(searchResults.length / ITEMS_PER_PAGE)}
                </span>
                <Button
                  variant="outline"
                  disabled={page >= Math.ceil(searchResults.length / ITEMS_PER_PAGE)}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* File Search Results */}
      {fileSearchResults && fileSearchResults.items && fileSearchResults.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>File Search Results ({fileSearchResults.totalResultCount})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fileSearchResults.items.map(file => (
                <Card key={file.fileId} className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold break-all">{file.url.split('/').pop()}</h3>
                      <p className="text-sm text-gray-500 break-all">{file.url}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">Job ID: {file.jobId}</p>
                      <p className="text-sm">State: {file.state}</p>
                      <p className="text-sm">Modified: {formatDate(file.lastModifiedOn)}</p>
                    </div>
                  </div>
                  {file.metadata && (
                    <div className="mt-2 text-sm text-gray-500">
                      <p>Score: {file.metadata.score}</p>
                      <p>Match: {file.metadata.matchedQueryStrategies.join(', ')}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default JobSearchPage;
