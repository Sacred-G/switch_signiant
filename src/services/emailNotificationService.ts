import { supabase } from '../lib/supabase';
import type { NotificationPreferences } from '../types/notifications';

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;

if (!RESEND_API_KEY) {
  console.error('RESEND_API_KEY environment variable is not configured');
}

export const getNotificationPreferences = async (jobId: string | null = null): Promise<NotificationPreferences> => {
  try {
    const { data: authData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!authData.user) throw new Error('No authenticated user');

    let query = supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', authData.user.id);
    
    if (jobId) {
      query = query.eq('job_id', jobId);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw error;
    }

    // Return default preferences if none exist
    return data || {
      user_id: authData.user.id,
      job_id: jobId,
      transfer_started: true,
      transfer_completed: true,
      transfer_failed: true,
      email_notifications_enabled: true,
      notification_emails: []
    };
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    throw error;
  }
};

export const saveNotificationPreferences = async (preferences: NotificationPreferences): Promise<void> => {
  try {
    const { data: authData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!authData.user) throw new Error('No authenticated user');

    let query = supabase
      .from('notification_preferences')
      .select('id')
      .eq('user_id', authData.user.id);
    
    if (preferences.job_id) {
      query = query.eq('job_id', preferences.job_id);
    }

    const { data: existing } = await query.single();

    // Create preferences data without the user_id from preferences
    const { user_id: _, ...preferencesWithoutUserId } = preferences;
    const preferencesData = {
      user_id: authData.user.id,
      ...preferencesWithoutUserId
    };

    if (existing) {
      let updateQuery = supabase
        .from('notification_preferences')
        .update(preferencesData)
        .eq('user_id', authData.user.id);
      
      if (preferences.job_id) {
        updateQuery = updateQuery.eq('job_id', preferences.job_id);
      }

      const { error } = await updateQuery;
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('notification_preferences')
        .insert([preferencesData]);

      if (error) throw error;
    }
  } catch (error) {
    console.error('Error saving notification preferences:', error);
    throw error;
  }
};

export const sendEmailNotification = async (to: string, subject: string, content: string): Promise<any> => {
  try {
    if (!RESEND_API_KEY) {
      throw new Error('Resend API key is not configured');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Signiant Dashboard <notifications@resend.dev>',
        to,
        subject,
        html: content
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending email notification:', error);
    throw error;
  }
};

interface Transfer {
  job_id?: string;
  name: string;
  source: string;
  destination: string;
  total_bytes: number;
  total_files: number;
}

export const sendTransferStatusNotification = async (transfer: Transfer, status: 'STARTED' | 'COMPLETED' | 'FAILED'): Promise<void> => {
  try {
    const { data: authData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!authData.user) throw new Error('No authenticated user');

    // Get user's notification preferences
    const preferences = await getNotificationPreferences(transfer.job_id || null);
    
    // Check if notifications are enabled
    if (!preferences.email_notifications_enabled) return;

    // Check if this type of notification is enabled
    const notificationTypes = {
      'STARTED': 'transfer_started',
      'COMPLETED': 'transfer_completed',
      'FAILED': 'transfer_failed'
    } as const;

    const notificationType = notificationTypes[status] as keyof NotificationPreferences;
    if (!preferences[notificationType]) return;

    // Get notification recipients
    const recipients = [
      authData.user.email,
      ...(preferences.notification_emails || [])
    ].filter((email): email is string => Boolean(email)); // Type guard to ensure non-null strings

    if (recipients.length === 0) return;

    // Format size
    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Create email content
    const subject = `Transfer ${status.toLowerCase()}: ${transfer.name}`;
    const content = `
      <h2>Transfer ${status.toLowerCase()}: ${transfer.name}</h2>
      <p>Your transfer has ${status.toLowerCase()}.</p>
      <h3>Transfer Details:</h3>
      <ul>
        <li><strong>Name:</strong> ${transfer.name}</li>
        <li><strong>Status:</strong> ${status}</li>
        <li><strong>Source:</strong> ${transfer.source}</li>
        <li><strong>Destination:</strong> ${transfer.destination}</li>
        <li><strong>Size:</strong> ${formatBytes(transfer.total_bytes)}</li>
        <li><strong>Files:</strong> ${transfer.total_files}</li>
      </ul>
      <p>View more details in your <a href="${window.location.origin}/history">transfer history</a>.</p>
    `;

    // Send to all recipients
    await Promise.all(
      recipients.map(email => 
        sendEmailNotification(email, subject, content)
          .catch(err => console.error(`Failed to send notification to ${email}:`, err))
      )
    );
  } catch (error) {
    console.error('Error sending transfer status notification:', error);
    // Don't throw the error as this is a background notification
  }
};
