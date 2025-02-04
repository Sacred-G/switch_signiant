import React, { useEffect, useState } from 'react';
import { Switch } from './ui/switch';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { PlusIcon, MinusIcon } from 'lucide-react';
import { useToast } from './ui/use-toast';
import { getNotificationPreferences, saveNotificationPreferences } from '../services/emailNotificationService';
import type { NotificationPreferences } from '../services/emailNotificationService';

interface EmailNotificationsProps {
  jobId: string;
  jobType: 'MANUAL' | 'HOT_FOLDER';
}

export const EmailNotifications: React.FC<EmailNotificationsProps> = ({ jobId, jobType }) => {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emails, setEmails] = useState<string[]>(['']);
  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
  }, [jobId]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await getNotificationPreferences(jobId);
      setPreferences(prefs);
      if (prefs.notification_emails?.length > 0) {
        setEmails(prefs.notification_emails);
      } else {
        setEmails(['']);
      }
    } catch (err) {
      console.error('Failed to load notification preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notification preferences');
      toast({
        title: "Error",
        description: "Failed to load notification preferences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!preferences) return;

      await saveNotificationPreferences({
        ...preferences,
        job_id: jobId,
        email_notifications_enabled: preferences.email_notifications_enabled,
        notification_emails: emails.filter(email => email.trim() !== ''),
      });

      toast({
        title: "Success",
        description: "Notification preferences saved successfully",
      });

      await loadPreferences();
    } catch (err) {
      console.error('Failed to save notification preferences:', err);
      toast({
        title: "Error",
        description: "Failed to save notification preferences",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!preferences) {
    return null;
  }

  return (
    <div className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Email Notifications</h3>
        <Switch
          checked={preferences.email_notifications_enabled}
          onCheckedChange={(checked) => {
            setPreferences({
              ...preferences,
              email_notifications_enabled: checked,
            });
          }}
        />
      </div>

      {preferences.email_notifications_enabled && (
        <>
          <div className="space-y-4">
            {emails.map((email, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="flex-1">
                  <label className="text-sm font-medium">
                    {index === 0 ? 'Notification Email' : `Additional Email ${index + 1}`}
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      const newEmails = [...emails];
                      newEmails[index] = e.target.value;
                      setEmails(newEmails);
                    }}
                    placeholder="Enter email address"
                  />
                </div>
                <div className="flex items-end space-x-2 pb-1">
                  {index === emails.length - 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setEmails([...emails, ''])}
                      className="h-10 w-10"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </Button>
                  )}
                  {emails.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const newEmails = emails.filter((_, i) => i !== index);
                        setEmails(newEmails);
                      }}
                      className="h-10 w-10"
                    >
                      <MinusIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notification Events</label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={preferences.transfer_completed}
                  onCheckedChange={(checked) => {
                    setPreferences({
                      ...preferences,
                      transfer_completed: checked,
                    });
                  }}
                />
                <span>Transfer Completed</span>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={preferences.transfer_failed}
                  onCheckedChange={(checked) => {
                    setPreferences({
                      ...preferences,
                      transfer_failed: checked,
                    });
                  }}
                />
                <span>Transfer Failed</span>
              </div>
            </div>
          </div>

          <Button onClick={handleSave}>Save Preferences</Button>
        </>
      )}
    </div>
  );
};

export default EmailNotifications;
