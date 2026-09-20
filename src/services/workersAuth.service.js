/**
 * Auth backend (Cloudflare) — mirrors the auth.service.js API
 * surface so callers stay untouched.
 */
import {
  apiFetch,
  clearAccessToken,
  getAccessToken,
  jwtExpiresAt,
  setAccessToken,
  AUTH_SESSION_EXPIRED,
  readWorkersResetToken,
  isWorkersResetCallback,
  isWorkersSuccessPath,
} from '../lib/api/client';

const REFRESH_BUFFER_SEC = 60;

/** Single-flight refresh so Strict Mode / focus / boot don't rotate the cookie twice. */
let resolveSessionInflight = null;

function toUser(photographer) {
  if (!photographer) return null;
  const displayName = photographer.display_name || photographer.email?.split('@')[0] || 'Photographer';
  return {
    id: photographer.id,
    email: photographer.email,
    updated_at: photographer.updated_at || null,
    user_metadata: {
      display_name: displayName,
      full_name: displayName,
      name: displayName,
      avatar_url: photographer.avatar_url || null,
      picture: photographer.avatar_url || null,
    },
  };
}

function toSession(accessTokenValue, photographer) {
  const user = toUser(photographer);
  return {
    access_token: accessTokenValue,
    token_type: 'bearer',
    expires_at: jwtExpiresAt(accessTokenValue),
    user,
  };
}

async function fetchMeRaw() {
  const data = await apiFetch('/v1/me');
  return data?.photographer ?? null;
}

export function isAuthExpiredError(error) {
  if (!error) return false;
  if (error.code === AUTH_SESSION_EXPIRED) return true;
  const message = String(error.message || error.msg || '').toLowerCase();
  return (
    message.includes('jwt expired') ||
    message.includes('invalid jwt') ||
    message.includes('session expired') ||
    error.status === 401 ||
    error.statusCode === 401
  );
}

export async function signInWithEmail({ email, password }) {
  const data = await apiFetch('/v1/auth/login', { method: 'POST', auth: false, body: { email, password } });
  setAccessToken(data.accessToken);
  const photographer = await fetchMeRaw();
  return { user: toUser(photographer), session: toSession(data.accessToken, photographer) };
}

export async function signUpWithEmail({ email, password, displayName }) {
  const fallbackName = displayName || email.split('@')[0] || 'Photographer';
  const data = await apiFetch('/v1/auth/signup', {
    method: 'POST',
    auth: false,
    body: { email, password, displayName: fallbackName },
  });
  setAccessToken(data.accessToken);
  const photographer = await fetchMeRaw();
  return { user: toUser(photographer), session: toSession(data.accessToken, photographer) };
}

/** Google flow: backend owns the OAuth exchange, then 302s to <origin>/auth/success. */
export async function signInWithGoogle() {
  const data = await apiFetch(`/v1/auth/google/url?returnTo=${encodeURIComponent(window.location.origin)}`, { auth: false });
  if (!data?.url) throw new Error('Google sign-in is not configured yet.');
  window.location.assign(data.url);
  return { provider: 'google' };
}

export async function completeGoogleStudioSignIn() {
  throw new Error('Google sign-in now completes on /auth/success — please try again.');
}

export async function ensurePhotographerProfile(user) {
  if (!user?.id) return null;
  try {
    return await fetchMeRaw();
  } catch {
    return null;
  }
}

export async function sendPasswordReset(email) {
  await apiFetch('/v1/auth/password-reset/request', { method: 'POST', auth: false, body: { email } });
  return {};
}

/** Workers reset uses the ?token= link — no recovery session to wait for. */
export async function updatePassword(password) {  const token = readWorkersResetToken();
  if (!token) {
    const err = new Error('This reset link has expired or was already used. Request a new one below.');
    err.code = AUTH_SESSION_EXPIRED;
    throw err;
  }
  await apiFetch('/v1/auth/password-reset/confirm', { method: 'POST', auth: false, body: { token, newPassword: password } });
  return {};
}

/** Signed-in password change (current password always required). */
export async function changePassword(currentPassword, newPassword) {
  await apiFetch('/v1/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } });
  return {};
}

export async function signOut() {
  try {
    await apiFetch('/v1/auth/logout', { method: 'POST' });
  } catch {
    // best-effort: still clear local state
  } finally {
    clearAccessToken();
  }
}

export async function resolveAuthSession() {
  if (resolveSessionInflight) return resolveSessionInflight;

  resolveSessionInflight = (async () => {
    const token = getAccessToken();
    const now = Math.floor(Date.now() / 1000);
    if (token && jwtExpiresAt(token) > now + REFRESH_BUFFER_SEC) {
      try {
        const photographer = await fetchMeRaw();
        return { user: toUser(photographer), session: toSession(token, photographer) };
      } catch {
        // fall through to refresh
      }
    }
    try {
      // auth:false — this IS the refresh call; don't nest another /refresh on 401.
      const data = await apiFetch('/v1/auth/refresh', { method: 'POST', auth: false });
      if (!data?.accessToken) return { user: null, session: null };
      setAccessToken(data.accessToken);
      const photographer = await fetchMeRaw();
      return { user: toUser(photographer), session: toSession(data.accessToken, photographer) };
    } catch {
      clearAccessToken();
      return { user: null, session: null };
    }
  })();

  try {
    return await resolveSessionInflight;
  } finally {
    resolveSessionInflight = null;
  }
}

export async function resolveInitialAuthSession() {
  // /auth/success (post-Google, cookie already set) and plain loads both
  // resolve through the refresh cookie; no realtime subscription needed.
  return resolveAuthSession();
}

export async function ensureAuthSession() {
  const { user, session } = await resolveAuthSession();
  if (!user || !session) {
    const err = new Error('Your session has expired. Please sign in again.');
    err.code = AUTH_SESSION_EXPIRED;
    throw err;
  }
  return { user, session };
}

export async function getSession() {
  const { session } = await resolveAuthSession();
  return session;
}

export async function getUser() {
  const { user } = await resolveAuthSession();
  return user;
}

export async function getProfile() {
  try {
    return await fetchMeRaw();
  } catch {
    return null;
  }
}

export function isPasswordRecoveryCallback() {
  return isWorkersResetCallback();
}

export function hasAuthCallbackInUrl() {
  if (typeof window === 'undefined') return false;
  if (isWorkersResetCallback() || isWorkersSuccessPath()) return true;
  return false;
}

export function readOAuthCallbackError() {
  if (typeof window === 'undefined') return null;
  const search = new URLSearchParams(window.location.search);
  const error = search.get('error_description') || search.get('error');
  if (!error) return null;
  const decoded = decodeURIComponent(String(error).replace(/\+/g, ' '));
  if (/access_denied/i.test(decoded)) return 'Google sign-in was cancelled.';
  return decoded;
}

export function clearOAuthCallbackParams() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('error');
  url.searchParams.delete('error_description');
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  window.history.replaceState({}, '', `${url.pathname}${url.search}`);
}

export function clearPasswordRecoveryParams() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('mode');
  url.searchParams.delete('token');
  window.history.replaceState({}, '', `${url.pathname}${url.search}`);
}
