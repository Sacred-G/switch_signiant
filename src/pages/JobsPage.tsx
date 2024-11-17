import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from "../components/ui/button"
import { Input } from '../components/ui/input'
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '../components/ui/table';
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Loader2, 
  ChevronDown, 
  ChevronRight, 
  PauseCircle,
  Trash2,
  FolderInput
} from 'lucide-react';
import { useToast } from '../components/ui/use-toast';
import { getSigniantHeaders, deleteJob, updateJobTrigger, getTransferDetails } from '../lib/signiant';
import { TransferProgress } from '../components/transferProgress';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (confirmText: string) => Promise<void>;
  jobName?: string;
}

interface TransferProgressType {
  percentComplete: number;
  filesRemaining: number;
  bytesTransferred: number;
  objectsManifest?: {
    manifestId: string;
    summary: {
      bytes: number;
      count: number;
    };
  };
  transferProgress?: {
    failed: {
      bytes: number;
      count: number;
    };
    skipped: {
      bytes: number;
      count: number;
    };
    transferred: {
      bytes: number;
      count: number;
    };
    remaining: {
      bytes: number;
      count: number;
    };
  };
}

interface TransferDetailsType {
  percentComplete: number;
  filesRemaining: number;
  bytesTransferred: number;
  startTime: string;
  currentRateBitsPerSecond: number;
  objectsManifest?: {
    manifestId: string;
    summary: {
      bytes: number;
      count: number;
    };
  };
  transferProgress?: {
    failed: {
      bytes: number;
      count: number;
    };
    skipped: {
      bytes: number;
      count: number;
    };
    transferred: {
      bytes: number;
      count: number;
    };
    remaining: {
      bytes: number;
      count: number;
    };
  };
}

interface Job {
    modifiedOn: string;
    jobId: string;
    name: string;
    status: string;
    lastModifiedOn: string;
    transferDetails: TransferDetailsType | null;
    activeAlerts: Array<{ type: string }> | null;
    actions: Array<{
      [x: string]: any;
      data: {
        source: {
          name: string;
          url?: string;
        };
        destination: {
          name: string;
          url?: string;
          config?: {
            path: string;
          };
        };
        transferOptions?: {
          areGrowingObjects: boolean;
          growingObjects?: {
            growingIdleTimeoutInSeconds: number;
          };
          partSizeInMiB?: number;
        };
        bandwidthManagement?: {
          enabled: boolean;
          maxRate?: {
            value: number;
            unit: string;
          };
        };
      };
    }>;
    createdByAuthId: string;
    lastModifiedByAuthId: string;
    createdOn: string;
    triggerType: string;
    triggers?: Array<{
      type: string;
      monitor?: {
        status?: {
          state: string;
        };
      };
    }>;
  }

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({ isOpen, onClose, onConfirm, jobName }) => {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    await onConfirm(confirmText);
    setIsDeleting(false);
    setConfirmText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Delete Job</h3>
        <p className="text-gray-600 mb-4">
          Are you sure you want to delete the job "{jobName}"? This action cannot be undone.
        </p>
        <p className="text-gray-600 mb-4">
          Type <span className="font-mono font-bold">DELETE</span> to confirm:
        </p>
        <Input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Type DELETE to confirm"
          className="mb-4"
        />
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={confirmText !== 'DELETE' || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Job'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

const JobsPage: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const { toast } = useToast();
  
  const fetchJobs = async () => {
    try {
      const headers = await getSigniantHeaders();
      const response = await fetch(`${import.meta.env.VITE_SIGNIANT_API_URL}/v1/jobs`, {
        headers
      });
  
      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }
  
      const data = await response.json();
      const jobsWithDetails = await Promise.all(data.items.map(async (job: Job) => {
        // Get monitor status and action status
        const monitorStatus = job.triggers?.[0]?.monitor?.status?.state;
        const actionStatus = job.actions?.[0]?.status?.state;
        
        // Prioritize IN_PROGRESS status
        let jobStatus = 'READY';
        if (monitorStatus) {
          jobStatus = monitorStatus;
        } else if (actionStatus) {
          jobStatus = actionStatus;
        }

        let transferDetails = null;
        // Only fetch transfer details if the job is in progress
        if (jobStatus === 'IN_PROGRESS') {
          transferDetails = await getTransferDetails(job.jobId);
        }
  
        // Clean up the job name
        const jobName = job.name || 'Unnamed Job';
        const cleanName = jobName
          .replace('Hot Folder - ', '')
          .replace(/\s+-\s+\d{8}_\d{6}$/, '');
  
        return {
          ...job,
          jobId: job.jobId,
          name: cleanName,
          status: jobStatus,
          lastModifiedOn: job.lastModifiedOn || job.modifiedOn || job.createdOn,
          transferDetails,
          activeAlerts: job.activeAlerts || [],
          actions: job.actions || [],
          createdByAuthId: job.createdByAuthId,
          lastModifiedByAuthId: job.lastModifiedByAuthId,
          createdOn: job.createdOn,
          triggerType: job.triggers?.[0]?.type || 'MANUAL'
        };
      }));
  
      setJobs(jobsWithDetails);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch jobs');
      toast({
        title: "Error",
        description: "Failed to load jobs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(() => {
      const hasActiveTransfers = jobs.some(job => job.status === 'IN_PROGRESS');
      if (hasActiveTransfers) {
        fetchJobs();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [jobs]);

  const handleDeleteClick = (e: React.MouseEvent, job: Job) => {
    e.stopPropagation();
    setSelectedJob(job);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (confirmText: string) => {
    if (!selectedJob) return;
    
    try {
      await deleteJob(selectedJob.jobId, confirmText);
      toast({
        title: "Success",
        description: "Job deleted successfully",
      });
      fetchJobs();
    } catch (error) {
      console.error('Error deleting job:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete job",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleHotFolderClick = async (e: React.MouseEvent, job: Job) => {
    e.stopPropagation();
    try {
      await updateJobTrigger(job.jobId);
      toast({
        title: "Success",
        description: "Job trigger updated to HOT FOLDER",
      });
      fetchJobs();
    } catch (error) {
      console.error('Error updating job trigger:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update job trigger",
        variant: "destructive",
      });
    }
  };

  const getJobStats = () => {
    const total = jobs.length;
    const completed = jobs.filter(job => 
      job.status?.toUpperCase() === 'OK' || 
      job.status?.toUpperCase() === 'COMPLETED'
    ).length;
    const inProgress = jobs.filter(job => 
      job.status?.toUpperCase() === 'IN_PROGRESS'
    ).length;
    const failed = jobs.filter(job => 
      job.status?.toUpperCase() === 'ERROR' ||
      (job.activeAlerts && job.activeAlerts.length > 0)
    ).length;
    const paused = jobs.filter(job => 
      job.status?.toUpperCase() === 'PAUSED'
    ).length;
    const ready = jobs.filter(job => 
      job.status?.toUpperCase() === 'READY' || 
      !job.status || 
      job.status === 'N/A'
    ).length;
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  
    return { total, completed, inProgress, failed, ready, paused, successRate };
  };

  const toggleRowExpansion = (jobId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (expandedRows.has(jobId)) {
      newExpandedRows.delete(jobId);
    } else {
      newExpandedRows.add(jobId);
    }
    setExpandedRows(newExpandedRows);
  };

  const getStatusVariant = (status: string, alerts: Array<{ type: string }> | null = null) => {
    const hasCriticalAlert = alerts?.some(alert => 
      ['SOURCE_ENDPOINT_OFFLINE', 'DESTINATION_ENDPOINT_OFFLINE', 'IN_PROGRESS_TRANSFER_HAS_ERRORS']
      .includes(alert.type)
    ) ?? false;
  
    if (hasCriticalAlert) return 'destructive';
  
    switch (status?.toUpperCase()) {
      case 'OK':
      case 'COMPLETED':
        return 'success';
      case 'IN_PROGRESS':
        return 'default';
      case 'ERROR':
        return 'destructive';
      case 'PAUSED':
        return 'warning';
      case 'READY':
        return 'secondary';
      default:
        return 'secondary';
    }
  };
  
  const getStatusDisplay = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'OK':
      case 'COMPLETED':
        return 'READY';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'ERROR':
        return 'Error';
      case 'PAUSED':
        return 'Paused';
      case 'READY':
        return 'Ready';
      default:
        return status || 'Ready';
    }
  };

  const formatDate = (dateString: string) => {
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

  interface StatCardProps {
    title: string;
    value: number;
    subtitle: string;
    icon: React.ElementType;
    bgColor: string;
    textColor: string;
  }

  const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon: Icon, bgColor, textColor }) => (
    <Card className={`bg-white shadow-md`}>
      <div className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className={`text-sm ${textColor} font-medium`}>{title}</p>
            <h2 className="text-3xl font-bold text-gray-900">{value}</h2>
            <p className={`text-sm ${textColor}`}>{subtitle}</p>
          </div>
          <div className={`p-2 ${bgColor} rounded-full`}>
            <Icon className={textColor} />
          </div>
        </div>
      </div>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-7xl mx-auto bg-gray-50">
        <div className="text-center text-red-500 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-xl font-semibold">Error loading jobs</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const stats = getJobStats();

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <StatCard
          title="Total Jobs"
          value={stats.total}
          subtitle={`${stats.completed} completed`}
          icon={Clock}
          bgColor="bg-blue-100"
          textColor="text-blue-600"
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          subtitle={`${stats.successRate}% success rate`}
          icon={CheckCircle}
          bgColor="bg-green-100"
          textColor="text-green-600"
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          subtitle="Active transfers"
          icon={Clock}
          bgColor="bg-purple-100"
          textColor="text-purple-600"
        />
        <StatCard
          title="Paused"
          value={stats.paused}
          subtitle="Paused jobs"
          icon={PauseCircle}
          bgColor="bg-yellow-100"
          textColor="text-yellow-700"
        />
        <StatCard
          title="Failed"
          value={stats.failed}
          subtitle="Require attention"
          icon={XCircle}
          bgColor="bg-red-100"
          textColor="text-red-600"
        />
      </div>

      {stats.failed > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg shadow-sm">
          <div className="flex items-center">
            <AlertCircle className="text-red-500 dark:text-red-400 mr-2" />
            <p className="text-red-700 dark:text-red-400 font-medium">
              {stats.failed} job(s) failed and require attention
            </p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-900">
              <TableHead className="w-8 dark:text-gray-300"></TableHead>
              <TableHead className="font-semibold dark:text-gray-300">NAME</TableHead>
              <TableHead className="font-semibold dark:text-gray-300">STATUS</TableHead>
              <TableHead className="font-semibold dark:text-gray-300">FOLDER TYPE</TableHead>
              <TableHead className="font-semibold dark:text-gray-300">TRANSFER PROGRESS</TableHead>
              <TableHead className="font-semibold dark:text-gray-300">LAST ACTIVITY</TableHead>
              <TableHead className="font-semibold dark:text-gray-300">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {jobs.map(job => {
              const isExpanded = expandedRows.has(job.jobId);

              return (
                <React.Fragment key={job.jobId}>
                  <TableRow 
                    className={`transition-colors ${
                      isExpanded 
                        ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <TableCell className="w-8 cursor-pointer dark:text-gray-300" onClick={() => toggleRowExpansion(job.jobId)}>
                      {isExpanded ? 
                        <ChevronDown className="h-4 w-4 text-blue-500" /> : 
                        <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      }
                    </TableCell>
                    <TableCell className="font-medium cursor-pointer dark:text-gray-200" onClick={() => toggleRowExpansion(job.jobId)}>
                      {job.name}
                    </TableCell>
                    <TableCell className="cursor-pointer" onClick={() => toggleRowExpansion(job.jobId)}>
                      <Badge variant={getStatusVariant(job.status, job.activeAlerts)}>
                        {getStatusDisplay(job.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="cursor-pointer" onClick={() => toggleRowExpansion(job.jobId)}>
                      <Badge variant="outline" className="dark:border-gray-600 dark:text-gray-300">
                        {job.triggerType}
                      </Badge>
                    </TableCell>
                    <TableCell className="w-1/3">
                      {job.status === 'IN_PROGRESS' && job.transferDetails && (
                        <TransferProgress
                          transferProgress={{
                            percentComplete: job.transferDetails.percentComplete,
                            filesRemaining: job.transferDetails.filesRemaining,
                            bytesTransferred: job.transferDetails.bytesTransferred,
                            objectsManifest: job.transferDetails.objectsManifest,
                            transferProgress: job.transferDetails.transferProgress
                          }}
                          transferStartedOn={job.transferDetails.startTime}
                          currentRateBitsPerSecond={job.transferDetails.currentRateBitsPerSecond}
                          detailed={isExpanded}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-300 cursor-pointer" onClick={() => toggleRowExpansion(job.jobId)}>
                      {formatDate(job.lastModifiedOn)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {job.triggerType !== 'HOT_FOLDER' && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-100 dark:border-gray-600 dark:hover:bg-gray-700"
                            onClick={(e) => handleHotFolderClick(e, job)}
                            disabled={job.status === 'IN_PROGRESS'}
                          >
                            <FolderInput className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
                          onClick={(e) => handleDeleteClick(e, job)}
                          disabled={job.status === 'IN_PROGRESS'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow className="bg-blue-50 dark:bg-blue-900/20">
                      <TableCell colSpan={7}>
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800 rounded-lg m-2 shadow-sm">
                          <h3 className="font-semibold text-blue-700 dark:text-blue-400 mb-4">Transfer Details</h3>
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div>
                                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Source Details</p>
                                <div className="space-y-2">
                                  <p className="text-sm text-gray-700 dark:text-gray-300">
                                    Name: {job.actions?.[0]?.data?.source?.name || 'N/A'}
                                  </p>
                                  {job.actions?.[0]?.data?.source?.url && (
                                    <p className="text-sm text-gray-700 dark:text-gray-300 break-all">
                                      Path: {job.actions[0].data.source.url}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Destination Details</p>
                                <div className="space-y-2">
                                  <p className="text-sm text-gray-700 dark:text-gray-300">
                                    Name: {job.actions?.[0]?.data?.destination?.name || 'N/A'}
                                  </p>
                                  {job.actions?.[0]?.data?.destination?.url && (
                                    <p className="text-sm text-gray-700 dark:text-gray-300 break-all">
                                      Path: {job.actions[0].data.destination.url}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="col-span-2 mt-4">
                              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Transfer Options</p>
                              <div className="grid grid-cols-2 gap-4 mt-2">
                                <div>
                                  <p className="text-sm text-gray-700 dark:text-gray-300">
                                    Growing Objects: {job.actions?.[0]?.data?.transferOptions?.areGrowingObjects ? 'Yes' : 'No'}
                                  </p>
                                  {job.actions?.[0]?.data?.transferOptions?.growingObjects && (
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                      Idle Timeout: {job.actions[0].data.transferOptions.growingObjects.growingIdleTimeoutInSeconds}s
                                    </p>
                                  )}
                                  {job.actions?.[0]?.data?.transferOptions?.partSizeInMiB && (
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                      Part Size: {job.actions[0].data.transferOptions.partSizeInMiB} MiB
                                    </p>
                                  )}
                                </div>
                                <div>
                                  {job.actions?.[0]?.data?.bandwidthManagement?.enabled && (
                                    <>
                                      <p className="text-sm text-gray-700 dark:text-gray-300">
                                        Bandwidth Management: Enabled
                                      </p>
                                      {job.actions[0].data.bandwidthManagement.maxRate && (
                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                          Max Rate: {job.actions[0].data.bandwidthManagement.maxRate.value} {job.actions[0].data.bandwidthManagement.maxRate.unit}
                                        </p>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="col-span-2">
                              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Job Information</p>
                              <div className="grid grid-cols-2 gap-4 mt-2">
                                <div>
                                  <p className="text-sm text-gray-700 dark:text-gray-300">Job ID: {job.jobId}</p>
                                  <p className="text-sm text-gray-700 dark:text-gray-300">Created By: {job.createdByAuthId || 'N/A'}</p>
                                  <p className="text-sm text-gray-700 dark:text-gray-300">Created On: {formatDate(job.createdOn)}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-700 dark:text-gray-300">Last Modified By: {job.lastModifiedByAuthId || 'N/A'}</p>
                                  <p className="text-sm text-gray-700 dark:text-gray-300">Last Modified On: {formatDate(job.lastModifiedOn)}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {deleteDialogOpen && (
        <DeleteConfirmationDialog
          isOpen={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={handleDeleteConfirm}
          jobName={selectedJob?.name}
        />
      )}
    </div>
  );
};

export default JobsPage;
