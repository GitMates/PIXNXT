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
    const status =
      err?.status ||
      (err?.message === 'Unauthorized' || err?.message === 'Forbidden'
        ? 403
        : err?.message?.includes('not found')
          ? 404
          : 500);
    if (status >= 500) {
      console.error('[album-proofer/repair-preview]', err);
    }
    const message = err?.message || 'Repair failed';
    res.status(status).json({ ok: false, error: message });
  }
}
