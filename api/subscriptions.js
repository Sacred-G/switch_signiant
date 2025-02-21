import { v4 as uuidv4 } from 'uuid';

/**
 * Handle webhook subscription requests
 * Creates and returns subscription details for Signiant Jet events
 */
export const subscriptionsHandler = async (req, res) => {
  try {
    const subscription = req.body;
    console.log('Received subscription request:', JSON.stringify(subscription, null, 2));

    // Validate subscription request
    if (!subscription || !subscription.notificationMethod || !subscription.eventCategory) {
      console.error('Invalid subscription request');
      return res.status(400).json({ error: 'Invalid subscription request' });
    }

    // Validate notification config
    if (!subscription.notificationConfig) {
      console.error('Missing notification config');
      return res.status(400).json({ error: 'Missing notification config' });
    }

    if (subscription.notificationMethod === 'WEBHOOK' && !subscription.notificationConfig.url) {
      console.error('Missing webhook URL');
      return res.status(400).json({ error: 'Missing webhook URL' });
    }

    if (subscription.notificationMethod === 'EMAIL' && 
        (!subscription.notificationConfig.recipients || 
         !subscription.notificationConfig.recipients.length)) {
      console.error('Missing email recipients');
      return res.status(400).json({ error: 'Missing email recipients' });
    }

    // Generate subscription response
    const now = new Date().toISOString();
    const response = {
      ...subscription,
      accountId: uuidv4(), // Generate unique account ID
      subscriptionId: uuidv4(), // Generate unique subscription ID
      createdOn: now,
      lastModifiedOn: now
    };

    // Ensure eventFilterConfig is properly structured
    if (subscription.eventFilterConfig) {
      if (!subscription.eventFilterConfig.jobId) {
        response.eventFilterConfig.jobId = uuidv4();
      }
      
      // Validate event types based on category
      if (subscription.eventFilterConfig.eventTypes) {
        const validEventTypes = {
          JET_TRANSFER: [
            'com.signiant.jet.transfer.queued',
            'com.signiant.jet.transfer.inProgress',
            'com.signiant.jet.transfer.failed',
            'com.signiant.jet.transfer.canceled',
            'com.signiant.jet.transfer.completed'
          ],
          JET_DELIVERY: [
            'com.signiant.jet.delivery.created',
            'com.signiant.jet.delivery.inProgress',
            'com.signiant.jet.delivery.queued',
            'com.signiant.jet.delivery.scheduled',
            'com.signiant.jet.delivery.failed',
            'com.signiant.jet.delivery.completed'
          ]
        };

        const categoryEvents = validEventTypes[subscription.eventCategory];
        if (categoryEvents) {
          response.eventFilterConfig.eventTypes = 
            subscription.eventFilterConfig.eventTypes.filter(type => categoryEvents.includes(type));
        }
      }
    }

    console.log('Created subscription:', JSON.stringify(response, null, 2));
    res.status(201).json(response);
  } catch (error) {
    console.error('Error processing subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
