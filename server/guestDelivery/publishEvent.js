function apiBase() {
  return String(process.env.VITE_API_URL || '').replace(/\/+$/, '');
}

function authHeaderFromReq(req) {
  return req.headers?.authorization || req.headers?.Authorization || '';
}

export async function handlePublishEventRequest(req, body) {
  const eventId = body?.eventId;
  if (!eventId) throw new Error('eventId is required.');

  const authHeader = authHeaderFromReq(req);
  if (!authHeader) throw new Error('Unauthorized');

  const base = apiBase();
  if (!base) throw new Error('VITE_API_URL is not configured');

  const res = await fetch(`${base}/v1/guest/events/${encodeURIComponent(eventId)}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader },
    body: JSON.stringify({}),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.error?.message || 'Publish failed');
  }

  const event = payload?.event;
  const summary = payload?.summary || {};
  const photoCount = Number(summary.photos ?? 0);
  const guestCount = Number(summary.guests ?? 0);

  return {
    event,
    indexing: {
      total: photoCount,
      pending: 0,
      indexed: photoCount,
      noFaces: 0,
      failed: 0,
    },
    guests: [],
    summary: {
      photosIndexed: photoCount,
      photosNoFaces: 0,
      photosFailed: 0,
      guestsMatched: 0,
      guestsNoMatch: guestCount,
      guestsFailed: 0,
    },
  };
}
