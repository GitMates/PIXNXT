import { handleRegisterGuestRequest } from '../../server/guestDelivery/registerGuest.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '6mb',
    },
  },
};

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
    const result = await handleRegisterGuestRequest(req.body || {});
    res.status(200).json({ ok: true, result });
  } catch (err) {
    console.error('[guest-delivery/register]', err);
    const message = err?.message || 'Registration failed';
    const status =
      message === 'Event not found.' ||
      message.includes('required') ||
      message.includes('valid email') ||
      message.includes('already registered') ||
      message.includes('Registration is closed')
        ? 400
        : 500;
    res.status(status).json({ ok: false, error: message });
  }
}
