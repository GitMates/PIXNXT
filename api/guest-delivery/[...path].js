import { handleRegisterGuestRequest } from '../../server/guestDelivery/registerGuest.js';
import { handlePublishEventRequest } from '../../server/guestDelivery/publishEvent.js';
import { handleGuestGalleryRequest } from '../../server/guestDelivery/getGuestGallery.js';
import { handleSendGuestEmailRequest } from '../../server/guestDelivery/sendGuestEmail.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '6mb',
    },
  },
};

function actionPath(req) {
  const raw = req.query?.path;
  if (Array.isArray(raw)) {
    return raw.filter(Boolean).join('/').replace(/^\/+|\/+$/g, '');
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim().replace(/^\/+|\/+$/g, '');
  }

  // Some hosts leave query.path empty — recover from the request URL.
  const url = String(req.url || '');
  const match = url.match(/\/api\/guest-delivery\/?([^?&#]*)/i);
  if (match?.[1]) {
    return match[1].replace(/^\/+|\/+$/g, '');
  }
  return '';
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const action = actionPath(req);

  try {
    if (action === 'register') {
      const result = await handleRegisterGuestRequest(req.body || {});
      res.status(200).json({ ok: true, result });
      return;
    }

    if (action === 'publish') {
      const result = await handlePublishEventRequest(req, req.body || {});
      res.status(200).json({ ok: true, result });
      return;
    }

    if (action === 'gallery') {
      const result = await handleGuestGalleryRequest(req.body || {});
      res.status(200).json({ ok: true, result });
      return;
    }

    if (action === 'send-email') {
      const result = await handleSendGuestEmailRequest(req, req.body || {});
      res.status(200).json({ ok: true, result });
      return;
    }

    res.status(404).json({ error: 'Not found', action });
  } catch (err) {
    console.error(`[guest-delivery/${action || 'root'}]`, err);
    const message = err?.message || 'Request failed';

    let status = 500;
    if (action === 'register') {
      status =
        message === 'Event not found.' ||
        message.includes('required') ||
        message.includes('valid email') ||
        message.includes('already registered') ||
        message.includes('Registration is closed')
          ? 400
          : 500;
    } else if (action === 'publish') {
      status =
        message === 'Unauthorized' || message === 'Forbidden'
          ? 403
          : message === 'Event not found.' ||
              message.includes('before publishing') ||
              message.includes('Archived')
            ? 400
            : 500;
    } else if (action === 'gallery') {
      status =
        message.includes('not found') ||
        message.includes('not available') ||
        message.includes('required')
          ? 404
          : 500;
    } else if (action === 'send-email') {
      status =
        message === 'Unauthorized' || message === 'Forbidden' || message === 'Event not found.'
          ? 403
          : message.includes('required') || message.includes('no matched')
            ? 400
            : 500;
    }

    res.status(status).json({ ok: false, error: message });
  }
}
