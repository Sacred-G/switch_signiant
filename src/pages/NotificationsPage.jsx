import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { subscribeToNotifications, unsubscribeFromNotifications } from '../services/emailService'

export default function NotificationsPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    checkNotificationStatus()
  }, [])

  const checkNotificationStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.notifications_enabled) {
        setNotificationsEnabled(true)
        setEmail(user.user_metadata.notification_email || '')
      }
    } catch (error) {
      console.error('Error checking notification status:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      await subscribeToNotifications(email)
      setSuccess(true)
      setNotificationsEnabled(true)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      await unsubscribeFromNotifications()
      setSuccess(true)
      setNotificationsEnabled(false)
      setEmail('')
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Email Notifications</h1>
      
      {notificationsEnabled ? (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <p className="mb-4">You are currently subscribed to notifications with email: <strong>{email}</strong></p>
          <button
            onClick={handleUnsubscribe}
            disabled={loading}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? 'Unsubscribing...' : 'Unsubscribe'}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Enter your email"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Subscribing...' : 'Subscribe to Notifications'}
          </button>
        </form>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 p-4 bg-green-100 text-green-700 rounded">
          {notificationsEnabled 
            ? 'Successfully subscribed to notifications!'
            : 'Successfully unsubscribed from notifications.'
          }
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-xl font-bold mb-4">About Notifications</h2>
        <p className="text-gray-700">
          Subscribe to receive email notifications when new transfers are added to the system.
          You'll be notified immediately when:
        </p>
        <ul className="list-disc ml-6 mt-2 text-gray-700">
          <li>A new transfer is initiated</li>
          <li>Transfer status changes</li>
          <li>Important system updates</li>
        </ul>
      </div>
    </div>
  )
}
