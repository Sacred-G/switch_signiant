import { useState, useEffect } from 'react';
import { TransferHistory } from '../components/history/TransferHistory';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Search } from 'lucide-react';
import { getAllJobs } from '../services/deliveryService';
import { saveTransferToHistory, getTransferHistory } from '../services/transferHistoryService';
import { useToast } from '../components/ui/use-toast';

const TransferHistoryPage = () => {
  const [transfers, setTransfers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      
      // Get current active jobs
      console.log('Fetching jobs...');
      const jobs = await getAllJobs();
      console.log('Fetched jobs:', jobs);
      console.log('Job statuses:', jobs.map(job => job.status));
      
      // Process each job
      console.log('Processing jobs...');
      for (const job of jobs) {
        console.log('Processing job:', job.jobId);
        // Extract source and destination from job data
        const source = job.actions?.[0]?.data?.source?.name || 
                      job.sourceProfile?.name || 
                      'Unknown';
        const destination = job.actions?.[0]?.data?.destination?.name || 
                          job.destinationProfile?.name || 
                          'Unknown';
        
        // Calculate total size and file count
        let totalSize = 0;
        let totalFiles = 0;
        
        // Count completed files
        if (job.files?.completed) {
          job.files.completed.forEach(file => {
            totalSize += file.sizeInBytes || 0;
            totalFiles++;
          });
        }
        
        // Count in-progress files
        if (job.files?.inProgress) {
          job.files.inProgress.forEach(file => {
            totalSize += file.sizeInBytes || 0;
            totalFiles++;
          });
        }
        
        // Add active transfers
        if (job.activeTransfers?.length > 0) {
          job.activeTransfers.forEach(activeTransfer => {
            if (activeTransfer.objectsManifest?.summary) {
              totalSize += activeTransfer.objectsManifest.summary.bytes || 0;
              totalFiles += activeTransfer.objectsManifest.summary.count || 0;
            }
          });
        }

        try {
          const transferData = {
            jobId: job.jobId,
            name: job.name || 'Unnamed Transfer',
            status: job.status,
            source,
            destination,
            total_bytes: totalSize,
            total_files: totalFiles,
            created_on: job.createdOn || job.created || new Date().toISOString(),
            last_modified_on: job.lastModifiedOn || job.modified || new Date().toISOString()
          };
          
          console.log('Saving transfer data:', transferData);
          console.log('Transfer status:', transferData.status);
          await saveTransferToHistory(transferData);
        } catch (error) {
          console.error('Error saving job:', job.jobId, error);
        }
      }
      
      // Get the updated history
      console.log('Fetching updated history...');
      const updatedHistory = await getTransferHistory();
      console.log('Setting transfers state with:', updatedHistory);
      setTransfers(updatedHistory);
    } catch (error) {
      console.error('Failed to fetch transfers:', error);
      toast({
        title: "Error",
        description: "Failed to load transfer history. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchTransfers, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredTransfers = transfers
    .filter(transfer => {
      const matchesSearch = transfer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          transfer.jobId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || transfer.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Transfer History</h1>
      </div>

      <div className="flex gap-4 items-center mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search transfers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400"
            prefix={<Search className="h-4 w-4 dark:text-gray-400" />}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-gray-50 border-gray-200 hover:border-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <div className="py-2 px-2 text-sm font-medium text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
              Filter by Status
            </div>
            <SelectItem value="all" className="hover:bg-gray-50 focus:bg-gray-100 dark:hover:bg-gray-700 dark:focus:bg-gray-600 dark:text-gray-200">
              All Statuses
            </SelectItem>
            <SelectItem value="READY" className="hover:bg-green-50 focus:bg-green-100 dark:hover:bg-gray-700 dark:focus:bg-gray-600 dark:text-gray-200">
              Ready
            </SelectItem>
            <SelectItem value="IN_PROGRESS" className="hover:bg-blue-50 focus:bg-blue-100 dark:hover:bg-gray-700 dark:focus:bg-gray-600 dark:text-gray-200">
              In Progress
            </SelectItem>
            <SelectItem value="COMPLETED" className="hover:bg-emerald-50 focus:bg-emerald-100 dark:hover:bg-gray-700 dark:focus:bg-gray-600 dark:text-gray-200">
              Completed
            </SelectItem>
            <SelectItem value="ERROR" className="hover:bg-red-50 focus:bg-red-100 dark:hover:bg-gray-700 dark:focus:bg-gray-600 dark:text-gray-200">
              Error
            </SelectItem>
            <SelectItem value="PAUSED" className="hover:bg-yellow-50 focus:bg-yellow-100 dark:hover:bg-gray-700 dark:focus:bg-gray-600 dark:text-gray-200">
              Paused
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center items-center p-8">
          <div className="text-lg text-gray-500">Loading transfer history...</div>
        </div>
      ) : (
        <TransferHistory transfers={filteredTransfers} />
      )}
    </div>
  );
};

export default TransferHistoryPage;
