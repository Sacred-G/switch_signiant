export interface NotificationPreferences {
  user_id: string;
  job_id?: string;
  transfer_started: boolean;
  transfer_completed: boolean;
  transfer_failed: boolean;
  email_notifications_enabled: boolean;
  notification_emails?: string[];
}
