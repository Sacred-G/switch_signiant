import { useState, useEffect } from 'react';
import { TransferHistory } from '../components/history/TransferHistory';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Search, RefreshCw } from 'lucide-react';
import { getAllJobs } from '../services/deliveryService';
import { 
  getTransferHistory,
  getFailedTransfers
} from '../services/transferHistoryService';
import { supabase } from '../lib/supabase';
import { SigniantAuth } from '../services/auth';
import { SigniantApiAuth } from '../lib/signiant';

const TransferHistoryPage = () => {
  const [transfers, setTransfers] = useState([]);
  const [failedTransfers, setFailedTransfers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTransfers = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      
      // Get the transfer history, current jobs, and failed transfers
      const [transferHistory, currentJobs, failedHistory] = await Promise.all([
        getTransferHistory(),
        getAllJobs(),
        getFailedTransfers()
      ]);

      // Detailed logging for debugging
      console.log('=== Transfer History Data ===');
      console.log('Raw Transfer History:', JSON.stringify(transferHistory, null, 2));
      console.log('=== Current Jobs Data ===');
      console.log('Raw Current Jobs:', JSON.stringify(currentJobs, null, 2));
      console.log('=== Failed History Data ===');
      console.log('Raw Failed History:', JSON.stringify(failedHistory, null, 2));

      // Process current jobs first
      const currentTransfers = (currentJobs || []).map(job => {
        console.log('Processing job:', JSON.stringify(job, null, 2));
        
        // Extract source and destination from job data with detailed logging
        console.log('Job source:', job.source);
        console.log('Job destination:', job.destination);
        console.log('Job actions:', job.actions);
        
        // Try to get source and destination from different possible locations
        let source = '';
        let destination = '';

        // Try from direct properties first
        if (typeof job.source === 'string') {
          source = job.source;
        } else if (job.source?.name) {
          source = job.source.name;
        }

        if (typeof job.destination === 'string') {
          destination = job.destination;
        } else if (job.destination?.name) {
          destination = job.destination.name;
        }

        // If not found, try from actions
        if (!source || !destination) {
          const transferAction = job.actions?.find(action => action.type === 'TRANSFER');
          console.log('Transfer action:', transferAction);
          
          if (!source) {
            source = transferAction?.data?.source?.name || '';
          }
          if (!destination) {
            destination = transferAction?.data?.destination?.name || '';
          }
        }

        console.log('Final extracted source:', source);
        console.log('Final extracted destination:', destination);

        const transfer = {
          job_id: job.jobId,
          name: job.jobName || job.name || job.jobId?.toString() || 'Unknown Job',
          status: job.status,
          source,
          destination,
          total_bytes: job.total_bytes || job.files?.completed?.reduce((sum, file) => sum + (file.sizeInBytes || 0), 0) || 0,
          total_files: job.total_files || (job.files?.completed?.length || 0),
          created_on: job.createdOn || new Date().toISOString(),
          completed_on: null,
          last_modified_on: job.lastModifiedOn || new Date().toISOString()
        };

        console.log('Processed transfer:', JSON.stringify(transfer, null, 2));
        return transfer;
      });

      console.log('Processed Current Jobs:', currentTransfers);

      // Combine with historical transfers, preferring historical records
      // Process transfer history to ensure source and destination are properly set
      const processedHistory = (transferHistory || []).map(transfer => ({
        ...transfer,
        source: transfer.source || '',
        destination: transfer.destination || ''
      }));

      // Combine with current transfers, preferring historical records
      const allTransfers = [
        ...processedHistory,
        ...currentTransfers.filter(job => 
          !processedHistory.some(t => t.job_id === job.job_id)
        )
      ];

      console.log('Combined Transfers:', allTransfers);

      // Sort by last_modified_on in descending order
      const sortedTransfers = allTransfers.sort((a, b) => 
        new Date(b.last_modified_on) - new Date(a.last_modified_on)
      );

      console.log('Final Sorted Transfers:', sortedTransfers);
      
      setTransfers(sortedTransfers);
      setFailedTransfers(failedHistory || []);
    } catch (error) {
      console.error('Failed to fetch transfers:', error);
      setError('Failed to load transfer history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        
        try {
          // Check Supabase authentication first
          const isAuthed = await SigniantAuth.isAuthenticated();
          if (!isAuthed) {
            setError('Not authenticated. Please log in.');
            return;
          }

          // Get current user to ensure we have a valid session
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            setError('No user found. Please log in.');
            return;
          }

          // Ensure we have a valid Signiant API token
          await SigniantApiAuth.getInstance().getAccessToken();
        } catch (error) {
          console.error('Authentication error:', error);
          setError('Authentication failed. Please try logging in again.');
          return;
        }

        // Fetch transfers
        await fetchTransfers();
      } catch (error) {
        console.error('Error initializing history:', error);
        setError('Failed to initialize transfer history. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    initializeHistory();

    // Set up Supabase real-time subscription
    const transferSubscription = supabase
      .channel('transfer_history_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transfer_history'
        },
        async () => {
          try {
            // Check both authentications before refreshing
            const isSupabaseAuthed = await SigniantAuth.isAuthenticated();
            if (!isSupabaseAuthed) return;
            await SigniantApiAuth.getInstance().getAccessToken();
            
            // Only fetch if both authentications are valid
            fetchTransfers(false);
          } catch (error) {
            console.error('Real-time refresh authentication error:', error);
          }
        }
      )
      .subscribe();

    // Set up auto-refresh every 30 seconds only if component is mounted
    const interval = setInterval(async () => {
      try {
        const isSupabaseAuthed = await SigniantAuth.isAuthenticated();
        if (!isSupabaseAuthed) return;

        // Also check Signiant API token
        await SigniantApiAuth.getInstance().getAccessToken();
        
        // Only fetch if both authentications are valid
        fetchTransfers(false);
      } catch (error) {
        console.error('Auto-refresh authentication error:', error);
      }
    }, 30000);
    
    return () => {
      clearInterval(interval);
      transferSubscription.unsubscribe();
    };
  }, []);

  const filteredTransfers = transfers.filter(transfer =>
    transfer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredFailedTransfers = failedTransfers.filter(transfer =>
    transfer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Transfer History</h1>
        <Button
          onClick={async () => {
            try {
              // Check both authentications before refreshing
              const isSupabaseAuthed = await SigniantAuth.isAuthenticated();
              if (!isSupabaseAuthed) {
                setError('Not authenticated. Please log in.');
                return;
              }
              await SigniantApiAuth.getInstance().getAccessToken();
              await fetchTransfers();
            } catch (error) {
              console.error('Refresh authentication error:', error);
              setError('Authentication failed. Please try logging in again.');
            }
          }}
          className="flex items-center gap-2"
          variant="outline"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="flex gap-4 mb-6">
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
      ) : error ? (
        <div className="flex justify-center items-center p-8">
          <div className="text-lg text-red-500">{error}</div>
        </div>
      ) : (
        <TransferHistory 
          transfers={filteredTransfers}
          failedTransfers={filteredFailedTransfers}
        />
      )}
    </div>
  );
};

export default TransferHistoryPage;
