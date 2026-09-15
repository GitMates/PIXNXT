function apiBase() {
  return String(process.env.VITE_API_URL || '').replace(/\/+$/, '');
}

function authHeaderFromReq(req) {
  return req.headers?.authorization || req.headers?.Authorization || '';
}

export async function handleSendGuestEmailRequest(req, body) {
  const eventId = body?.eventId;
  const guestId = body?.guestId;
  if (!eventId || !guestId) {
    throw new Error('eventId and guestId are required.');
  }

  const authHeader = authHeaderFromReq(req);
  if (!authHeader) {
    throw new Error('Unauthorized');
  }

  const base = apiBase();
  if (!base) throw new Error('VITE_API_URL is not configured');

  const response = await fetch(`${base}/v1/emails/guest-delivery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({
      eventId,
      guestId,
      sendCopy: Boolean(body?.sendCopy),
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Email send failed');
  }
  return payload;
}
