/**
 * Handle webhook events from Signiant Jet
 * Currently just logs the events for debugging
 */
export const webhookHandler = async (req, res) => {
  try {
    const event = req.body;
    console.log('Received webhook event:', JSON.stringify(event, null, 2));

    // Validate webhook event
    if (!event || !event.eventType) {
      console.error('Invalid webhook event received');
      return res.status(400).json({ error: 'Invalid webhook event' });
    }

    // Log transfer events
    if (event.eventCategory === 'JET_TRANSFER') {
      console.log('Transfer event details:', {
        jobId: event.jobId,
        name: event.name || `Transfer ${event.jobId}`,
        status: event.eventType.includes('completed') ? 'COMPLETED' :
                event.eventType.includes('failed') ? 'FAILED' :
                event.eventType.includes('canceled') ? 'CANCELED' :
                event.eventType.includes('inProgress') ? 'IN_PROGRESS' :
                event.eventType.includes('queued') ? 'QUEUED' : 'UNKNOWN',
        source: event.source?.path,
        destination: event.destination?.path,
        totalBytes: event.totalBytes,
        totalFiles: event.totalFiles,
        timestamp: event.timestamp
      });
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
