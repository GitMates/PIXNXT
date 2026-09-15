function apiBase() {
  return String(process.env.VITE_API_URL || '').replace(/\/+$/, '');
}

function authHeaderFromReq(req) {
  return req.headers?.authorization || req.headers?.Authorization || '';
}

async function workersPost(path, body, { authHeader = '', publicRoute = false } = {}) {
  const base = apiBase();
  if (!base) throw new Error('VITE_API_URL is not configured');
  if (!publicRoute && !authHeader) throw new Error('Unauthorized');
  const headers = { 'Content-Type': 'application/json' };
  if (authHeader) headers.Authorization = authHeader;
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body ?? {}),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = payload?.error?.message || payload?.error || `Request failed (${res.status})`;
    const err = new Error(typeof message === 'string' ? message : 'Request failed');
    err.status = res.status;
    throw err;
  }
  return payload;
}

export async function handleIndexPhotoRequest(req, body) {
  const photoId = body?.photoId;
  if (!photoId) throw new Error('photoId is required.');

  return workersPost('/v1/photo-ai/index', { photoId }, { authHeader: authHeaderFromReq(req) });
}

export async function handleSyncCollectionRequest(req, body) {
  const collectionId = body?.collectionId;
  if (!collectionId) throw new Error('collectionId is required.');

  const limit = Math.min(Number(body?.limit) || 500, 500);
  const forceReindex = Boolean(body?.forceReindex);
  return workersPost(
    '/v1/photo-ai/sync-collection',
    { collectionId, limit, forceReindex },
    { authHeader: authHeaderFromReq(req) }
  );
}

export async function handleRepairLabelsRequest(req, body) {
  const collectionId = body?.collectionId;
  if (!collectionId) throw new Error('collectionId is required.');

  return workersPost(
    '/v1/photo-ai/repair-labels',
    { collectionId },
    { authHeader: authHeaderFromReq(req) }
  );
}

export async function handleReclusterRequest(req, body) {
  const collectionId = body?.collectionId;
  if (!collectionId) throw new Error('collectionId is required.');

  const payload = await workersPost(
    '/v1/photo-ai/recluster',
    { collectionId },
    { authHeader: authHeaderFromReq(req) }
  );
  if (payload && typeof payload.peopleCount !== 'number' && typeof payload.people === 'number') {
    return { ...payload, peopleCount: payload.people };
  }
  return payload;
}

export async function handleIndexCollectionRequest(req, body) {
  return handleSyncCollectionRequest(req, body);
}

export async function handleGetPeopleRequest(req, body) {
  const collectionId = body?.collectionId;
  if (!collectionId) throw new Error('collectionId is required.');

  const forceRecluster = Boolean(body?.forceRecluster);
  const includeHidden = Boolean(body?.includeHidden);

  const payload = await workersPost(
    '/v1/photo-ai/people',
    { collectionId, forceRecluster, includeHidden },
    { authHeader: authHeaderFromReq(req) }
  );
  return {
    people: payload?.people || [],
    fromCache: false,
    missingTables: false,
    ...(payload?.state !== undefined ? { state: payload.state } : {}),
  };
}

export async function handleSearchSelfieRequest(req, body) {
  const collectionId = body?.collectionId;
  const imageBase64 = body?.imageBase64;
  if (!collectionId) throw new Error('collectionId is required.');
  if (!imageBase64) throw new Error('imageBase64 is required.');

  const threshold = Math.min(Math.max(Number(body?.threshold) || 85, 70), 99);

  const payload = await workersPost(
    '/v1/photo-ai/search-selfie',
    { collectionId, imageBase64, threshold },
    { authHeader: authHeaderFromReq(req) }
  );
  return {
    matched: Boolean(payload?.matched),
    photoIds: payload?.photoIds || [],
    faceIds: payload?.faceIds || [],
    matches: payload?.matches || [],
    searchedFaceConfidence: payload?.searchedFaceConfidence ?? null,
    people: payload?.people || [],
    message: payload?.message || '',
    ...(payload?.threshold !== undefined ? { threshold: payload.threshold } : {}),
  };
}

export async function handlePublicSearchSelfieRequest(req, body) {
  const collectionId = body?.collectionId;
  const imageBase64 = body?.imageBase64;
  if (!collectionId) throw new Error('collectionId is required.');
  if (!imageBase64) throw new Error('imageBase64 is required.');

  const threshold = Math.min(Math.max(Number(body?.threshold) || 85, 70), 99);

  return workersPost(
    '/v1/photo-ai/public/search-selfie',
    { collectionId, imageBase64, threshold },
    { publicRoute: true }
  );
}
