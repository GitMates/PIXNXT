import { getSupabaseUrl } from '../photoAi/supabaseAdmin.js';
import { assertPhotographerOwnsEvent } from './auth.js';

function getSupabaseAnonKey() {
  return (
    process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  );
}

function readAccessToken(authHeader) {
  return String(authHeader || '')
    .replace(/^Bearer\s+/i, '')
    .trim();
}

function readFunctionError(payload, status) {
  if (payload?.error) return payload.error;
  if (payload?.message) return payload.message;
  if (payload?.code === 'NOT_FOUND' || status === 404) {
    return 'Guest delivery email function is not deployed (or needs redeploy). In Supabase Dashboard → Edge Functions → send-guest-delivery-email → Deploy updates.';
  }
  return `Email function failed (${status}).`;
}

export async function handleSendGuestEmailRequest(req, body) {
  const eventId = body?.eventId;
  const guestId = body?.guestId;
  if (!eventId || !guestId) {
    throw new Error('eventId and guestId are required.');
  }

  await assertPhotographerOwnsEvent(req, eventId);

  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const accessToken = readAccessToken(authHeader);
  if (!accessToken) {
    throw new Error('Unauthorized');
  }

  const supabaseUrl = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase is not configured for sending emails.');
  }

  // Use apikey only. Sending Authorization: Bearer with some key types returns a
  // platform 404 before the function runs. User JWT goes in the body as accessToken.
  const response = await fetch(`${supabaseUrl}/functions/v1/send-guest-delivery-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
    },
    body: JSON.stringify({
      eventId,
      guestId,
      sendCopy: Boolean(body?.sendCopy),
      siteOrigin: body?.siteOrigin || '',
      accessToken,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(readFunctionError(payload, response.status));
  }
  if (payload?.error) {
    throw new Error(payload.error);
  }
  return payload;
}
