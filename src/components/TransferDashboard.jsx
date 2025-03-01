import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SigniantAuth } from '../lib/signiant';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { TransferProgress } from './transferProgress';
import { useToast } from '../components/ui/use-toast';
import { RefreshCw, Search, AlertTriangle, CheckCircle2, Clock, AlertCircle, Pause, Play } from 'lucide-react';
import { pauseJob, resumeJob } from '../lib/signiant';
import { saveTransferToHistory } from '../services/transferHistoryService';
import { sendTransferStatusNotification } from '../services/emailNotificationService';

const TransferDashboard = () => {
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTransfers = async () => {
    try {
      const headers = await SigniantAuth.getAuthHeader();
      const response = await fetch('/platform-api/v1/jobs/search', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sortBy: 'lastActivity',
          sortOrder: 'desc',
          limit: 100
        })
      });

      if (!response.ok) throw new Error('Failed to fetch transfers');
      const data = await response.json();
      console.log('Fetched transfers:', data.items);
      setTransfers(data.items);

      // Save each transfer to Supabase
      for (const transfer of data.items) {
        try {
          // Extract source and destination from transfer data
          const source = transfer.actions?.[0]?.data?.source?.name || 
                        transfer.sourceProfile?.name || 
                        'Unknown';
          const destination = transfer.actions?.[0]?.data?.destination?.name || 
                            transfer.destinationProfile?.name || 
                            'Unknown';

          // Calculate total size and file count
          let totalBytes = transfer.bytesTransferred || 0;
          let totalFiles = transfer.totalResultCount || 0;

          const transferData = {
            jobId: transfer.id || transfer.jobId,
            name: transfer.jobName || 'Unnamed Transfer',
            status: transfer.status,
            source,
            destination,
            total_bytes: totalBytes,
            total_files: totalFiles,
            created_on: transfer.startTime || new Date().toISOString(),
            last_modified_on: transfer.lastModifiedOn || new Date().toISOString()
          };

          await saveTransferToHistory(transferData);
          
          // Send notification for new transfers
          if (transfer.status === 'IN_PROGRESS') {
            await sendTransferStatusNotification(transferData, 'STARTED');
          } else if (transfer.status === 'COMPLETED' || transfer.status === 'SUCCESS') {
            await sendTransferStatusNotification(transferData, 'COMPLETED');
          } else if (transfer.status === 'ERROR' || transfer.status === 'FAILED') {
            await sendTransferStatusNotification(transferData, 'FAILED');
          }
        } catch (error) {
          console.error('Error saving transfer to history:', error);
        }
      }
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
    fetchTransfers();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchTransfers, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'READY': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-green-100 text-green-800';
      case 'ERROR': return 'bg-red-100 text-red-800';
      case 'PAUSED': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'READY': return <Clock className="w-4 h-4" />;
      case 'IN_PROGRESS': return <CheckCircle2 className="w-4 h-4" />;
      case 'ERROR': return <AlertTriangle className="w-4 h-4" />;
      case 'PAUSED': return <Pause className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const handleJobAction = async (jobId, action) => {
    try {
      // Perform the action
      if (action === 'PAUSE') {
        await pauseJob(jobId);
      } else if (action === 'RESUME') {
        await resumeJob(jobId);
      }

      // Update the transfer status in Supabase
      const transfer = transfers.find(t => t.id === jobId || t.jobId === jobId);
      if (transfer) {
        const source = transfer.actions?.[0]?.data?.source?.name || 
                      transfer.sourceProfile?.name || 
                      'Unknown';
        const destination = transfer.actions?.[0]?.data?.destination?.name || 
                          transfer.destinationProfile?.name || 
                          'Unknown';

        const transferData = {
          jobId: transfer.id || transfer.jobId,
          name: transfer.jobName || 'Unnamed Transfer',
          status: action === 'PAUSE' ? 'PAUSED' : 'IN_PROGRESS',
          source,
          destination,
          total_bytes: transfer.bytesTransferred || 0,
          total_files: transfer.totalResultCount || 0,
          created_on: transfer.startTime || new Date().toISOString(),
          last_modified_on: new Date().toISOString()
        };

        await saveTransferToHistory(transferData);

        // Send notification for status change
        if (action === 'RESUME') {
          await sendTransferStatusNotification(transferData, 'STARTED');
        }
      }
      
      toast({
        title: "Success",
        description: `Job ${action.toLowerCase()}d successfully`
      });
      
      // Fetch transfers after a short delay to allow the API to update
      setTimeout(fetchTransfers, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action.toLowerCase()} job: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const filteredTransfers = transfers.filter(transfer => {
    const matchesSearch = transfer.jobName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || transfer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: transfers.length,
    inProgress: transfers.filter(t => t.status === 'IN_PROGRESS').length,
    error: transfers.filter(t => t.status === 'ERROR').length,
    completed: transfers.filter(t => t.status === 'READY').length
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Transfer Dashboard</h1>
        <Button onClick={fetchTransfers} size="sm" variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transfers</CardTitle>
            <div className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.error}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Controls */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <Input
            placeholder="Search transfers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
            prefix={<Search className="w-4 h-4" />}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="READY">Ready</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="ERROR">Error</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transfers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Transfers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransfers.map((transfer) => (
                <TableRow key={transfer.id || transfer.jobId} className="group hover:bg-gray-50">
                  <TableCell className="font-medium">
                    {transfer.jobName}
                    {transfer.filesRemaining > 0 && (
                      <div className="text-sm text-gray-500">
                        {transfer.filesRemaining} files remaining
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getStatusColor(transfer.status)} flex items-center gap-2`}>
                      {getStatusIcon(transfer.status)}
                      {transfer.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="w-1/3">
                    {transfer.status === 'IN_PROGRESS' && (
                      <TransferProgress
                        transferProgress={{
                          percentComplete: ((transfer.totalResultCount - transfer.filesRemaining) / transfer.totalResultCount) * 100,
                          filesRemaining: transfer.filesRemaining,
                          bytesTransferred: transfer.bytesTransferred
                        }}
                        transferStartedOn={transfer.startTime}
                        currentRateBitsPerSecond={transfer.currentRateBitsPerSecond}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {transfer.status === 'IN_PROGRESS' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleJobAction(transfer.id || transfer.jobId, 'PAUSE')}
                        >
                          <Pause className="w-4 h-4" />
                        </Button>
                      )}
                      {transfer.status === 'PAUSED' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleJobAction(transfer.id || transfer.jobId, 'RESUME')}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          console.log('Configuring notifications for transfer:', transfer);
                          const jobId = transfer.id || transfer.jobId;
                          console.log('Using jobId:', jobId);
                          const params = new URLSearchParams();
                          params.set('jobId', jobId);
                          params.set('jobType', 'MANUAL');
                          navigate({
                            pathname: '/notifications',
                            search: params.toString()
                          });
                        }}
                      >
                        Configure Notifications
                      </Button>
                    </div>
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

export default TransferDashboard;
