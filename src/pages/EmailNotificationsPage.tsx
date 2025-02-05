import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { EmailNotifications } from '../components/email-notifications';

const EmailNotificationsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const jobId = searchParams.get('jobId');
  const jobType = searchParams.get('jobType') as 'MANUAL' | 'HOT_FOLDER';

  useEffect(() => {
    // Log the search params to help debug
    console.log('Search params:', Object.fromEntries(searchParams.entries()));
  }, [searchParams]);

  if (!jobId || !jobType) {
    return (
      <div className="p-6">
        <div className="text-red-500">
          Missing required parameters: jobId and jobType are required
        </div>
        <div className="mt-4">
          <button 
            onClick={() => navigate(-1)}
            className="text-blue-500 hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Email Notifications</h1>
      </div>
      <EmailNotifications jobId={jobId} jobType={jobType} />
    </div>
  );
};

export default EmailNotificationsPage;
