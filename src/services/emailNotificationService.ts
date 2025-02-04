import { supabase } from '../lib/supabase';
import { SigniantAuth } from './auth';
import type { User } from '@supabase/supabase-js';

// Replace hardcoded API key with environment variable
const RESEND_API_KEY = process.env.NEXT_PUBLIC_RESEND_API_KEY;

export interface NotificationPreferences {
  id?: string;
  user_id?: string;
  job_id?: string;
  job_type?: 'HOT_FOLDER' | 'MANUAL';
  email_notifications_enabled: boolean;
  transfer_started: boolean;
  transfer_completed: boolean;
  transfer_failed: boolean;
  notification_emails: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Transfer {
  name: string;
  status: string;
  source: string;
  destination: string;
  total_bytes: number;
  total_files: number;
}

/**
 * Get notification preferences for the current user and optionally for a specific job
 */
export const getNotificationPreferences = async (jobId?: string): Promise<NotificationPreferences> => {
  try {
    const session = await SigniantAuth.getSession();
    if (!session?.user) {
      throw new Error('User not authenticated');
    }

    const user = session.user;
    let query = supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id);
    
    if (jobId) {
      query = query.eq('job_id', jobId);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw error;
    }

    // Return default preferences if none exist
    return data || {
      user_id: user.id,
      job_id: jobId,
      email_notifications_enabled: true,
      transfer_started: true,
      transfer_completed: true,
      transfer_failed: true,
      notification_emails: [user.email] // Include user's email as default
    };
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    throw error;
  }
};

/**
 * Save notification preferences for the current user and optionally for a specific job
 */
export const saveNotificationPreferences = async (preferences: Partial<NotificationPreferences>): Promise<void> => {
  try {
    const session = await SigniantAuth.getSession();
    if (!session?.user) {
      throw new Error('User not authenticated');
    }

    const user = session.user;
    const query = {
      user_id: user.id,
      ...preferences,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('notification_preferences')
      .upsert(query, {
        onConflict: 'user_id,job_id'
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error saving notification preferences:', error);
    throw error;
  }
};

interface EmailResponse {
  id: string;
  from: string;
  to: string;
  created_at: string;
}

/**
 * Send an email notification using Resend
 */
export const sendEmailNotification = async (
  to: string,
  subject: string,
  content: string
): Promise<EmailResponse> => {
  try {
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

/**
 * Send a transfer status notification
 */
export const sendTransferStatusNotification = async (
  transfer: Transfer,
  status: 'STARTED' | 'COMPLETED' | 'FAILED',
  jobId?: string
): Promise<void> => {
  try {
    const session = await SigniantAuth.getSession();
    if (!session?.user) {
      throw new Error('User not authenticated');
    }

    // Get user's notification preferences
    const preferences = await getNotificationPreferences(jobId);
    
    // Check if notifications are enabled
    if (!preferences.email_notifications_enabled) return;

    // Check if this type of notification is enabled
    const notificationType = {
      'STARTED': 'transfer_started',
      'COMPLETED': 'transfer_completed',
      'FAILED': 'transfer_failed'
    }[status] as keyof NotificationPreferences;

    if (!notificationType || !preferences[notificationType]) return;

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

    // Send to all registered notification emails
    const emails = preferences.notification_emails;
    if (emails.length === 0) {
      // If no notification emails are set, use the user's email
      emails.push(session.user.email);
    }

    // Send to each email address
    await Promise.all(
      emails.map(email => sendEmailNotification(email, subject, content))
    );
  } catch (error) {
    console.error('Error sending transfer status notification:', error);
    // Don't throw the error as this is a background notification
  }
};
