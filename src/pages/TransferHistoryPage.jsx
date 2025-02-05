import { useState, useEffect } from 'react';
import { TransferHistory } from '../components/history/TransferHistory';
import { Input } from '../components/ui/input';
import { Search } from 'lucide-react';
import { getAllJobs } from '../services/deliveryService';
import { saveTransferToHistory, getTransferHistory } from '../services/transferHistoryService';
import { useToast } from '../components/ui/use-toast';

const TransferHistoryPage = () => {
  const [transfers, setTransfers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      
      // Get current active jobs
      console.log('Fetching jobs...');
      const jobs = await getAllJobs();
      console.log('Fetched jobs:', jobs);
      
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
          // Save completed files to history
          if (job.files?.completed && job.files.completed.length > 0) {
            // Calculate total size and files from completed files
            const completedSize = job.files.completed.reduce((total, file) => total + (file.sizeInBytes || 0), 0);
            const completedFiles = job.files.completed.length;

            if (completedSize > 0) {
              const transferData = {
                job_id: job.jobId,
                name: job.name || 'Unnamed Transfer',
                status: 'COMPLETED',
                source,
                destination,
                total_bytes: completedSize,
                total_files: completedFiles,
                created_on: job.createdOn || job.created || new Date().toISOString(),
                last_modified_on: job.lastModifiedOn || job.modified || new Date().toISOString()
              };
              
              console.log('Saving completed transfer:', transferData);
              await saveTransferToHistory(transferData);
            }
          }
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

  const filteredTransfers = transfers.filter(transfer => 
    transfer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Transfer History</h1>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search transfers by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400"
          prefix={<Search className="h-4 w-4 dark:text-gray-400" />}
        />
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
