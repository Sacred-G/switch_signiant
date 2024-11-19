import React, { useState, useEffect } from 'react';
import { SigniantApiAuth, pauseJob, resumeJob, startManualJob } from '../lib/signiant';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useToast } from '../components/ui/use-toast';
import { TransferProgress, formatBytes } from '../components/transferProgress';
import config from '../config';
import { 
  RefreshCw, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Pause, 
  Play,
  Network,
  FileWarning,
  Trash,
  PlayCircle
} from 'lucide-react';

const AnalyticsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [jobTransfers, setJobTransfers] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  const fetchTransferForJob = async (jobId) => {
    try {
      const headers = await SigniantApiAuth.getAuthHeader();
      const response = await fetch(`${config.SIGNIANT_API_URL}/v1/jobs/${jobId}/transfers?state=IN_PROGRESS`, {
        method: 'GET',
        headers
      });

      if (!response.ok) throw new Error('Failed to fetch transfer');
      const data = await response.json();
      return data.items[0];
    } catch (error) {
      console.error(`Failed to fetch transfer for job ${jobId}:`, error);
      return null;
    }
  };

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const headers = await SigniantApiAuth.getAuthHeader();
      const response = await fetch(`${config.SIGNIANT_API_URL}/v1/jobs/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sortBy: 'lastActivity',
          sortOrder: 'desc',
          limit: 100
        })
      });

      if (!response.ok) throw new Error('Failed to fetch jobs');
      const data = await response.json();
      setJobs(data.items);

      const transfers = {};
      await Promise.all(
        data.items.map(async (job) => {
          const transfer = await fetchTransferForJob(job.jobId);
          if (transfer) {
            transfers[job.jobId] = transfer;
          }
        })
      );
      setJobTransfers(transfers);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status, errorCode) => {
    if (errorCode) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    switch (status) {
      case 'READY': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'IN_PROGRESS': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'ERROR': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'PAUSED': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status, errorCode) => {
    if (errorCode) return <FileWarning className="w-4 h-4" />;
    switch (status) {
      case 'READY': return <Clock className="w-4 h-4" />;
      case 'IN_PROGRESS': return <CheckCircle2 className="w-4 h-4" />;
      case 'ERROR': return <AlertTriangle className="w-4 h-4" />;
      case 'PAUSED': return <Pause className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const handlePauseJob = async (jobId) => {
    setActionLoading(true);
    try {
      await pauseJob(jobId);
      toast({
        title: "Success",
        description: "Job paused successfully",
      });
      fetchJobs();
    } catch (error) {
      console.error('Error pausing job:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to pause job",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeJob = async (jobId) => {
    setActionLoading(true);
    try {
      await resumeJob(jobId);
      toast({
        title: "Success",
        description: "Job resumed successfully",
      });
      fetchJobs();
    } catch (error) {
      console.error('Error resuming job:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to resume job",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartJob = async (jobId) => {
    setActionLoading(true);
    try {
      await startManualJob(jobId);
      toast({
        title: "Success",
        description: "Job started successfully",
      });
      fetchJobs();
    } catch (error) {
      console.error('Error starting job:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to start job",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteJob = async (jobId) => {
    setActionLoading(true);
    try {
      const headers = await SigniantApiAuth.getAuthHeader();
      const response = await fetch(`${config.SIGNIANT_API_URL}/v1/jobs/${jobId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to delete job');
      }
      
      toast({
        title: "Success",
        description: "Job deleted successfully"
      });
      
      setTimeout(fetchJobs, 1000);
    } catch (error) {
      console.error('Delete job error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const formatTransferProgress = (transfer) => {
    if (!transfer?.transferProgress) return null;

    const { transferred, failed, skipped, remaining } = transfer.transferProgress;
    const totalBytes = transfer.objectsManifest?.summary?.bytes || 0;
    const bytesTransferred = (transferred?.bytes || 0) + (failed?.bytes || 0) + (skipped?.bytes || 0);
    
    return {
      percentComplete: Math.round((bytesTransferred / totalBytes) * 100),
      bytesTransferred,
      filesRemaining: remaining?.count || 0
    };
  };

  const getTransferSize = (transfer) => {
    if (!transfer?.objectsManifest?.summary?.bytes) return 0;
    return transfer.objectsManifest.summary.bytes;
  };

  const getTransferFileCount = (transfer) => {
    if (!transfer?.objectsManifest?.summary?.count) return 0;
    return transfer.objectsManifest.summary.count;
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.jobName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: jobs.length,
    inProgress: jobs.filter(j => j.status === 'IN_PROGRESS').length,
    error: jobs.filter(j => j.status === 'ERROR' || j.errorCode).length,
    ready: jobs.filter(j => j.status === 'READY').length,
    paused: jobs.filter(j => j.status === 'PAUSED').length,
    totalBytes: Object.values(jobTransfers).reduce((acc, transfer) => 
      acc + getTransferSize(transfer), 0
    )
  };

  return (
    <div className="p-8 space-y-6 bg-gray-100 dark:bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">Transfer Analytics</h1>
        <Button onClick={fetchJobs} size="sm" variant="outline" className="dark:bg-gray-800 dark:text-white">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { title: "Total Jobs", value: stats.total, icon: null },
          { title: "In Progress", value: stats.inProgress, icon: <CheckCircle2 className="h-4 w-4 text-green-600" /> },
          { title: "Error/Warning", value: stats.error, icon: <AlertTriangle className="h-4 w-4 text-red-600" /> },
          { title: "Ready", value: stats.ready, icon: <Clock className="h-4 w-4 text-blue-600" /> },
          { title: "Paused", value: stats.paused, icon: <Pause className="h-4 w-4 text-yellow-600" /> },
          { title: "Total Data", value: formatBytes(stats.totalBytes), icon: <Network className="h-4 w-4 text-purple-600" /> }
        ].map((stat, index) => (
          <Card key={index} className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium dark:text-gray-200">{stat.title}</CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <Input
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full dark:bg-gray-800 dark:text-white dark:border-gray-700"
            prefix={<Search className="w-4 h-4 dark:text-gray-400" />}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] dark:bg-gray-800 dark:text-white dark:border-gray-700">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="READY">Ready</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="ERROR">Error</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Active Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="dark:border-gray-700">
                <TableHead className="dark:text-gray-400">Job Name</TableHead>
                <TableHead className="dark:text-gray-400">Status</TableHead>
                <TableHead className="dark:text-gray-400">Progress</TableHead>
                <TableHead className="dark:text-gray-400">Size</TableHead>
                <TableHead className="dark:text-gray-400">Files</TableHead>
                <TableHead className="dark:text-gray-400">Last Modified</TableHead>
                <TableHead className="dark:text-gray-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobs.map((job) => {
                const transfer = jobTransfers[job.jobId];
                const transferProgress = formatTransferProgress(transfer);
                const size = getTransferSize(transfer);
                const fileCount = getTransferFileCount(transfer);
                const isPaused = job.status === 'PAUSED';
                const isInProgress = job.status === 'IN_PROGRESS';
                const canStart = job.status === 'READY' || isPaused;
                
                return (
                  <TableRow key={job.jobId} className="dark:border-gray-700 dark:hover:bg-gray-700/50">
                    <TableCell className="font-medium dark:text-gray-200">
                      <div>
                        {job.jobName}
                        {job.activeAlerts?.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {job.activeAlerts.map((alert, i) => (
                              <Badge 
                                key={i} 
                                variant="destructive"
                                className="text-xs"
                              >
                                {alert.type}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={`${getStatusColor(job.status, job.errorCode)} flex items-center gap-2`}
                      >
                        {getStatusIcon(job.status, job.errorCode)}
                        {job.status}
                        {job.errorCode && ` (${job.errorCode})`}
                      </Badge>
                    </TableCell>
                    <TableCell className="dark:text-gray-200">
                      {job.status === 'IN_PROGRESS' && transfer && (
                        <TransferProgress
                          transferProgress={transferProgress}
                          transferStartedOn={transfer.createdOn}
                          currentRateBitsPerSecond={job.currentRateBitsPerSecond}
                        />
                      )}
                    </TableCell>
                    <TableCell className="dark:text-gray-200">
                      {size > 0 ? formatBytes(size) : '0 B'}
                    </TableCell>
                    <TableCell className="dark:text-gray-200">
                      {fileCount > 0 ? `${fileCount} files` : '0 files'}
                    </TableCell>
                    <TableCell className="dark:text-gray-200">
                      {formatDate(job.lastActivity)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {canStart && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => isPaused ? handleResumeJob(job.jobId) : handleStartJob(job.jobId)}
                            className="dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                            disabled={actionLoading}
                          >
                            {isPaused ? <PlayCircle className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </Button>
                        )}
                        {isInProgress && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handlePauseJob(job.jobId)}
                            className="dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                            disabled={actionLoading}
                          >
                            <Pause className="w-4 h-4" />
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeleteJob(job.jobId)}
                          className="dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                          disabled={actionLoading || isInProgress}
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsPage;