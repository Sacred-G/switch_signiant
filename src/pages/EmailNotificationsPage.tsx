import React from 'react';
import { EmailNotifications } from '../components/email-notifications';

const EmailNotificationsPage = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Email Notifications</h1>
      </div>
      <EmailNotifications />
    </div>
  );
};

export default EmailNotificationsPage;
