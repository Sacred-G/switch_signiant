import { supabase } from '../lib/supabase'

export const sendEmail = async ({ email, subject, message }) => {
  try {
    const { data, error } = await supabase.functions.invoke('resend', {
      body: {
        email,
        subject,
        message,
      },
    })

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}

export const sendTransferNotification = async (email, transferDetails) => {
  const subject = 'New Transfer Added'
  const message = `
    <h1>New Transfer Added</h1>
    <p>A new transfer has been added to the system:</p>
    <ul>
      <li>Transfer ID: ${transferDetails.id}</li>
      <li>Status: ${transferDetails.status}</li>
      <li>Date: ${new Date(transferDetails.created_at).toLocaleString()}</li>
    </ul>
  `

  return sendEmail({ email, subject, message })
}

export const subscribeToNotifications = async (email) => {
  try {
    // Store email subscription in user metadata
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) throw userError

    const { error: updateError } = await supabase.auth.updateUser({
      data: { 
        notification_email: email,
        notifications_enabled: true
      }
    })

    if (updateError) throw updateError

    return { success: true }
  } catch (error) {
    console.error('Error subscribing to notifications:', error)
    throw error
  }
}

export const unsubscribeFromNotifications = async () => {
  try {
    const { error } = await supabase.auth.updateUser({
      data: { 
        notifications_enabled: false
      }
    })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error unsubscribing from notifications:', error)
    throw error
  }
}
