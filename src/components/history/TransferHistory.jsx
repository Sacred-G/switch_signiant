import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { AlertTriangle, CheckCircle2, AlertCircle, XCircle, Bell, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { getTransferUpdates } from '../../services/updateTransferHistory';

export function TransferHistory({ transfers, failedTransfers = [] }) {
  const navigate = useNavigate();
  const [expandedTransfer, setExpandedTransfer] = useState(null);
  const [transferUpdates, setTransferUpdates] = useState({});
  console.log('Received transfers in TransferHistory:', transfers);
  console.log('Received failed transfers in TransferHistory:', failedTransfers);
  
  const getJobStats = (jobs, isFailedTransfers = false) => {
    if (isFailedTransfers) {
      return {
        total: jobs.length,
        failed: jobs.length
      };
    }
    
    const completedJobs = jobs.filter(job => job.status === 'COMPLETED');
    const inProgressJobs = jobs.filter(job => job.status === 'IN_PROGRESS');
    const readyJobs = jobs.filter(job => job.status === 'READY');
    
    return {
      total: jobs.length,
      completed: completedJobs.length,
      inProgress: inProgressJobs.length,
      ready: readyJobs.length
    };
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString, isRelative = false) => {
    if (!dateString) return 'N/A';
    
    try {
      // Log the incoming date string for debugging
      console.log('Formatting date:', dateString);
      
      // Try to parse the date string
      const date = new Date(dateString);
      console.log('Parsed date:', date);
      
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateString);
        return 'N/A';
      }
      
      // Format the date in the local timezone
      const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      };
      
      const formattedDate = new Intl.DateTimeFormat('en-US', options).format(date);
      console.log('Formatted date:', formattedDate);
      return formattedDate;
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'N/A';
    }
  };

  const jobStats = getJobStats(transfers, false);
  const failedStats = getJobStats(failedTransfers, true);
  console.log('Calculated job stats:', jobStats);
  console.log('Calculated failed stats:', failedStats);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transfers</CardTitle>
            <Bell className="text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobStats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedStats.failed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready</CardTitle>
            <AlertCircle className="text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobStats.ready}</div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-4">
        {/* Successful Transfers Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Transfers</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transfer Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Files</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((transfer) => {
                  const isExpanded = expandedTransfer === transfer.job_id;
                  
                  const handleRowClick = async () => {
                    if (isExpanded) {
                      setExpandedTransfer(null);
                    } else {
                      setExpandedTransfer(transfer.job_id);
                      if (!transferUpdates[transfer.job_id]) {
                        const updates = await getTransferUpdates(transfer.job_id);
                        setTransferUpdates(prev => ({
                          ...prev,
                          [transfer.job_id]: updates
                        }));
                      }
                    }
                  };

                  return (
                    <React.Fragment key={transfer.job_id}>
                      <TableRow 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={handleRowClick}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <span>{transfer.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {transfer.status === 'COMPLETED' && (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            )}
                            {transfer.status === 'IN_PROGRESS' && (
                              <AlertTriangle className="w-4 h-4 text-blue-500" />
                            )}
                            {transfer.status === 'READY' && (
                              <AlertCircle className="w-4 h-4 text-yellow-500" />
                            )}
                            <span>{transfer.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>{transfer.source || 'Unknown'}</TableCell>
                        <TableCell>{transfer.destination || 'Unknown'}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatBytes(transfer.total_bytes || 0)}
                          </div>
                        </TableCell>
                        <TableCell>{transfer.total_files || 0} files</TableCell>
                        <TableCell>
                          {formatDate(transfer.last_modified_on || transfer.completed_on || transfer.created_on)}
                        </TableCell>
                      </TableRow>
                      
                      {isExpanded && transferUpdates[transfer.job_id] && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-gray-50 p-4">
                            <div className="text-sm font-medium mb-2">Transfer Updates</div>
                            <div className="space-y-2">
                              {transferUpdates[transfer.job_id].map((update, index) => (
                                <div key={index} className="bg-white p-2 rounded border">
                                  <div className="flex justify-between">
                                    <span className="font-medium">{update.update_type}</span>
                                    <span className="text-gray-500">{formatDate(update.created_on)}</span>
                                  </div>
                                  {update.previous_status && (
                                    <div className="text-sm text-gray-600">
                                      Status changed from {update.previous_status} to {update.status}
                                    </div>
                                  )}
                                  {update.update_details && (
                                    <div className="text-sm text-gray-600 mt-1">
                                      {update.update_type === 'progress_update' ? (
                                        <>
                                          Transferred: {formatBytes(update.update_details.bytes_transferred)} 
                                          ({update.update_details.files_transferred} files)
                                          <br />
                                          Remaining: {formatBytes(update.update_details.bytes_remaining)}
                                          ({update.update_details.files_remaining} files)
                                        </>
                                      ) : (
                                        <>
                                          Size: {formatBytes(update.update_details.file_size)}
                                          <br />
                                          Type: {update.update_details.file_type}
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Failed Transfers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Failed Transfers</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transfer Name</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Failed On</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedTransfers.map((transfer) => (
                  <TableRow key={transfer.job_id}>
                    <TableCell className="font-medium">{transfer.name}</TableCell>
                    <TableCell>{transfer.source || 'Unknown'}</TableCell>
                    <TableCell>{transfer.destination || 'Unknown'}</TableCell>
                    <TableCell className="text-red-500">
                      {transfer.error_message || 'Unknown error'}
                    </TableCell>
                    <TableCell>{formatDate(transfer.failed_on || transfer.last_modified_on || transfer.created_on)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
