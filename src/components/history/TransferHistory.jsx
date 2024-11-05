import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { AlertTriangle, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

export function TransferHistory({ transfers }) {
  const getJobStats = (jobs) => {
    return jobs.reduce((acc, job) => {
      acc.total++;
      if (job.status === 'COMPLETED' || job.status === 'SUCCESS') acc.completed++;
      if (job.status === 'IN_PROGRESS' || job.status === 'RUNNING') acc.inProgress++;
      if (job.status === 'ERROR' || job.status === 'FAILED') acc.error++;
      return acc;
    }, { total: 0, completed: 0, inProgress: 0, error: 0 });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
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

    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'IN_PROGRESS':
      case 'RUNNING': 
        return 'bg-blue-500 text-white';
      case 'COMPLETED':
      case 'SUCCESS':
        return 'bg-green-500 text-white';
      case 'ERROR':
      case 'FAILED':
        return 'bg-red-500 text-white';
      case 'PAUSED':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const jobStats = getJobStats(transfers);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: "Total Transfers", value: jobStats.total, icon: "$" },
          { title: "Completed", value: jobStats.completed, icon: <CheckCircle2 className="text-green-500" /> },
          { title: "In Progress", value: jobStats.inProgress, icon: <AlertCircle className="text-blue-500" /> },
          { title: "Failed", value: jobStats.error, icon: <XCircle className="text-red-500" /> }
        ].map((stat, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              {typeof stat.icon === 'string' ? <span className="text-gray-400">{stat.icon}</span> : stat.icon}
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
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((transfer) => (
                <TableRow key={transfer.jobId}>
                  <TableCell className="font-medium">{transfer.jobName || transfer.name}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(transfer.status)}>{transfer.status}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(transfer.startTime || transfer.created)}</TableCell>
                  <TableCell>{formatDate(transfer.lastActivity || transfer.modified)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}