import { handleRepairAlbumPreviewRequest } from '../../server/albumProofer/repairAlbumPreview.js';

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
    const result = await handleRepairAlbumPreviewRequest(req, req.body || {});
    res.status(200).json({ ok: true, result });
  } catch (err) {
    console.error('[album-proofer/repair-preview]', err);
    const message = err?.message || 'Repair failed';
    const status =
      message === 'Unauthorized' || message === 'Forbidden'
        ? 403
        : message.includes('required') || message.includes('not found')
          ? 400
          : 500;
    res.status(status).json({ ok: false, error: message });
  }
}
