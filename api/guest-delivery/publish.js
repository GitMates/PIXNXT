import { handlePublishEventRequest } from '../../server/guestDelivery/publishEvent.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const result = await handlePublishEventRequest(req, req.body || {});
    res.status(200).json({ ok: true, result });
  } catch (err) {
    console.error('[guest-delivery/publish]', err);
    const message = err?.message || 'Publish failed';
    const status =
      message === 'Unauthorized' || message === 'Forbidden'
        ? 403
        : message === 'Event not found.' ||
            message.includes('before publishing') ||
            message.includes('Archived')
          ? 400
          : 500;
    res.status(status).json({ ok: false, error: message });
  }
}
