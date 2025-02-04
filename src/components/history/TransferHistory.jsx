import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { AlertTriangle, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

export function TransferHistory({ transfers }) {
  const getJobStats = (jobs) => {
    return jobs.reduce((acc, job) => {
      acc.total++;
      const upperStatus = job.status?.toUpperCase();
      if (upperStatus === 'COMPLETED' || upperStatus === 'SUCCESS') acc.completed++;
      if (upperStatus === 'IN_PROGRESS' || upperStatus === 'RUNNING') acc.inProgress++;
      if (upperStatus === 'ERROR' || upperStatus === 'FAILED') acc.error++;
      if (upperStatus === 'READY') acc.inProgress++;
      if (upperStatus === 'PAUSED') acc.inProgress++;
      return acc;
    }, { total: 0, completed: 0, inProgress: 0, error: 0 });
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

  const getStatusColor = (status) => {
    const upperStatus = status?.toUpperCase();
    if (upperStatus === 'ERROR' || upperStatus === 'FAILED') {
      return 'bg-red-500 text-white hover:bg-red-600';
    }
    return 'bg-green-500 text-white hover:bg-green-600';
  };

  const jobStats = getJobStats(transfers);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "Total Transfers", value: jobStats.total, icon: <CheckCircle2 className="text-green-500" /> },
          { title: "In Progress", value: jobStats.inProgress, icon: <AlertCircle className="text-blue-500" /> },
          { title: "Failed", value: jobStats.error, icon: <XCircle className="text-red-500" /> }
        ].map((stat, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alert Banner */}
      {jobStats.error > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-sm text-red-700">{jobStats.error} transfer(s) failed and require attention</p>
          </div>
        </div>
      )}

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
                <TableHead>Status</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Files</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((transfer) => (
                <TableRow key={transfer.jobId}>
                  <TableCell className="font-medium">{transfer.name}</TableCell>
                  <TableCell>{transfer.source || 'Unknown'}</TableCell>
                  <TableCell>{transfer.destination || 'Unknown'}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(transfer.status)}>{transfer.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatBytes(transfer.total_bytes || 0)}
                    </div>
                  </TableCell>
                  <TableCell>{transfer.total_files || 0} files</TableCell>
                  <TableCell>{formatDate(transfer.created_on)}</TableCell>
                  <TableCell>{formatDate(transfer.last_modified_on)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
