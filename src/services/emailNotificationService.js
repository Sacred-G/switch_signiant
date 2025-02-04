import { supabase } from '../lib/supabase';

const RESEND_API_KEY = 're_RBfoiPx2_BgYhmnMLfLfrjdvpi5Yqb4Qg';

/**
 * Get notification preferences for the current user
 */
export const getNotificationPreferences = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw error;
    }

    // Return default preferences if none exist
    return data || {
      user_id: user.id,
      transfer_started: true,
      transfer_completed: true,
      transfer_failed: true,
      email_notifications_enabled: true
    };
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    throw error;
  }
};

/**
 * Save notification preferences for the current user
 */
export const saveNotificationPreferences = async (preferences) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const { data: existing } = await supabase
      .from('notification_preferences')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const preferencesData = {
      user_id: user.id,
      ...preferences
    };

    if (existing) {
      const { error } = await supabase
        .from('notification_preferences')
        .update(preferencesData)
        .eq('user_id', user.id);

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

/**
 * Send an email notification using Resend
 */
export const sendEmailNotification = async (to, subject, content) => {
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
export const sendTransferStatusNotification = async (transfer, status) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    // Get user's notification preferences
    const preferences = await getNotificationPreferences();
    
    // Check if notifications are enabled
    if (!preferences.email_notifications_enabled) return;

    // Check if this type of notification is enabled
    const notificationType = {
      'STARTED': 'transfer_started',
      'COMPLETED': 'transfer_completed',
      'FAILED': 'transfer_failed'
    }[status];

    if (!notificationType || !preferences[notificationType]) return;

    // Format size
    const formatBytes = (bytes) => {
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

    await sendEmailNotification(user.email, subject, content);
  } catch (error) {
    console.error('Error sending transfer status notification:', error);
    // Don't throw the error as this is a background notification
  }
};
