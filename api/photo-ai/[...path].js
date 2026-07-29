import {
  handleIndexPhotoRequest,
  handleIndexCollectionRequest,
  handleSyncCollectionRequest,
  handleReclusterRequest,
  handleGetPeopleRequest,
  handleSearchSelfieRequest,
  handlePublicSearchSelfieRequest,
} from '../../server/photoAi/handlers.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '6mb',
    },
  },
};

function actionPath(req) {
  const raw = req.query.path;
  if (Array.isArray(raw)) return raw.join('/');
  if (typeof raw === 'string') return raw;
  return '';
}

const HANDLERS = {
  index: handleIndexPhotoRequest,
  'index-collection': handleIndexCollectionRequest,
  'sync-collection': handleSyncCollectionRequest,
  recluster: handleReclusterRequest,
  people: handleGetPeopleRequest,
  'search-selfie': handleSearchSelfieRequest,
  'public/search-selfie': handlePublicSearchSelfieRequest,
};

const ERROR_FALLBACKS = {
  index: 'Indexing failed',
  'index-collection': 'Batch indexing failed',
  'sync-collection': 'Sync failed',
  recluster: 'Recluster failed',
  people: 'Failed to load people',
  'search-selfie': 'Selfie search failed',
  'public/search-selfie': 'Selfie search failed',
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

  const action = actionPath(req);
  const handle = HANDLERS[action];
  if (!handle) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  try {
    const result = await handle(req, req.body || {});
    res.status(200).json({ ok: true, result });
  } catch (err) {
    console.error(`[photo-ai/${action}]`, err);
    const status =
      err?.message === 'Unauthorized' || err?.message === 'Forbidden' ? 403 : 500;
    res.status(status).json({
      ok: false,
      error: err?.message || ERROR_FALLBACKS[action] || 'Request failed',
      code: err?.name,
    });
  }
}
