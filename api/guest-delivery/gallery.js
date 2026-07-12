import { handleGuestGalleryRequest } from '../../server/guestDelivery/getGuestGallery.js';

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
    const result = await handleGuestGalleryRequest(req.body || {});
    res.status(200).json({ ok: true, result });
  } catch (err) {
    console.error('[guest-delivery/gallery]', err);
    const message = err?.message || 'Could not load gallery';
    const status =
      message.includes('not found') ||
      message.includes('not available') ||
      message.includes('required')
        ? 404
        : 500;
    res.status(status).json({ ok: false, error: message });
  }
}
