import { handleSendGuestEmailRequest } from '../../server/guestDelivery/sendGuestEmail.js';

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
    const result = await handleSendGuestEmailRequest(req, req.body || {});
    res.status(200).json({ ok: true, result });
  } catch (err) {
    console.error('[guest-delivery/send-email]', err);
    const message = err?.message || 'Failed to send email';
    const status =
      message === 'Unauthorized' || message === 'Forbidden' || message === 'Event not found.'
        ? 403
        : message.includes('required') || message.includes('no matched')
          ? 400
          : 500;
    res.status(status).json({ ok: false, error: message });
  }
}
