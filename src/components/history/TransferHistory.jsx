import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { AlertTriangle, CheckCircle2, AlertCircle, XCircle, Bell } from 'lucide-react';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';

export function TransferHistory({ transfers }) {
  const navigate = useNavigate();
  console.log('Received transfers in TransferHistory:', transfers);
  
  const getCompletedTransfers = (transfers) => {
    return transfers.filter(transfer => {
      const upperStatus = transfer.status?.toUpperCase();
      const hasData = (transfer.total_bytes || 0) > 0;
      return (upperStatus === 'COMPLETED' || upperStatus === 'SUCCESS') && hasData;
    });
  };

  const getJobStats = (jobs) => {
    const completedJobs = getCompletedTransfers(jobs);
    return {
      total: completedJobs.length,
      completed: completedJobs.length
    };
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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

      return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  const jobStats = getJobStats(transfers);
  console.log('Calculated job stats:', jobStats);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Transfers</CardTitle>
            <CheckCircle2 className="text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobStats.total}</div>
          </CardContent>
        </Card>
      </div>

      {/* Transfers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transfer Name</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Files</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getCompletedTransfers(transfers).map((transfer) => (
                <TableRow key={transfer.job_id}>
                  <TableCell className="font-medium">{transfer.name}</TableCell>
                  <TableCell>{transfer.source || 'Unknown'}</TableCell>
                  <TableCell>{transfer.destination || 'Unknown'}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatBytes(transfer.total_bytes || 0)}
                    </div>
                  </TableCell>
                  <TableCell>{transfer.total_files || 0} files</TableCell>
                  <TableCell>{formatDate(transfer.created_on)}</TableCell>
                  <TableCell>{formatDate(transfer.last_modified_on)}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={() => navigate(`/notifications?jobId=${transfer.job_id}&jobType=MANUAL`)}
                    >
                      <Bell className="h-4 w-4" />
                      Notifications
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
