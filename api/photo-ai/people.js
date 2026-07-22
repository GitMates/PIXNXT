import { handleGetPeopleRequest } from '../../server/photoAi/handlers.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
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
    const result = await handleGetPeopleRequest(req, req.body || {});
    res.status(200).json({ ok: true, result });
  } catch (err) {
    console.error('[photo-ai/people]', err);
    const status = err?.message === 'Unauthorized' || err?.message === 'Forbidden' ? 403 : 500;
    res.status(status).json({
      ok: false,
      error: err?.message || 'Failed to load people',
      code: err?.name,
    });
  }
}
