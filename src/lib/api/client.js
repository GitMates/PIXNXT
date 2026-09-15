/**
 * Workers API client (Cloudflare backend) — the ONLY backend.
 * Supabase was fully removed (cutover). VITE_USE_WORKERS_API is ignored
 * and kept only so old hosting envs don't break the build.
 */

export const USE_WORKERS_AUTH = true;

export function apiBase() {
  const base = String(import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  if (!base) throw new Error('VITE_API_URL is not configured');
  return base;
}

export const AUTH_SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED';

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusCode = status;
    this.code = code;
  }
}

let accessToken = null;

export function setAccessToken(token) {
  accessToken = token || null;
}

export function getAccessToken() {
  return accessToken;
}

export function clearAccessToken() {
  accessToken = null;
}

/** Read JWT expiry (seconds) without verifying — for proactive refresh only. */
export function jwtExpiresAt(token) {
  try {
    const payload = JSON.parse(atob(String(token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp : 0;
  } catch {
    return 0;
  }
}

let refreshInflight = null;

async function refreshAccessToken() {
  if (refreshInflight) return refreshInflight;
  refreshInflight = (async () => {
    const res = await fetch(`${apiBase()}/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      clearAccessToken();
      return null;
    }
    const data = await res.json().catch(() => ({}));
    if (!data?.accessToken) {
      clearAccessToken();
      return null;
    }
    setAccessToken(data.accessToken);
    return data.accessToken;
  })();
  try {
    return await refreshInflight;
  } finally {
    refreshInflight = null;
  }
}

/**
 * Authenticated fetch against the Workers API.
 * Attaches the in-memory access token, sends the refresh cookie, and retries
 * once after a silent refresh on 401.
 */
export async function apiFetch(path, { method = 'GET', body, auth = true, retry = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(`${apiBase()}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401 && auth && retry) {
    const rotated = await refreshAccessToken();
    if (rotated) {
      return apiFetch(path, { method, body, auth, retry: false });
    }
  }
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError(res.status, payload?.error?.code || 'REQUEST_FAILED', payload?.error?.message || `Request failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json().catch(() => null);
}

/** True for Workers password-reset links (/auth/reset?token=...). */
export function isWorkersResetCallback() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('token') &&
    window.location.pathname === '/auth/reset';
}

/** True right after the backend Google callback lands on /auth/success. */
export function isWorkersSuccessPath() {
  if (typeof window === 'undefined') return false;
  return window.location.pathname === '/auth/success';
}

export function readWorkersResetToken() {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('token');
}

/**
 * Subscribe to a Workers SSE endpoint (EventSource can't send headers, so an
 * explicit access token is appended as ?access_token= over HTTPS).
 * Returns an unsubscribe function. Auto-stops on error (caller polls anyway).
 */
export function subscribeSse(path, { onEvent, query = {} } = {}) {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
    return () => {};
  }
  const params = new URLSearchParams({ ...query });
  if (accessToken) params.set('access_token', accessToken);
  const source = new EventSource(`${apiBase()}${path}?${params.toString()}`);
  source.onmessage = (event) => {
    if (!event.data || event.data.startsWith(':')) return;
    try {
      onEvent?.(JSON.parse(event.data), event);
    } catch {
      onEvent?.(event.data, event);
    }
  };
  source.addEventListener('feedback-updated', (event) => {
    try {
      onEvent?.(JSON.parse(event.data), event, 'feedback-updated');
    } catch {
      onEvent?.(event.data, event, 'feedback-updated');
    }
  });
  source.addEventListener('gallery-updated', (event) => {
    try {
      onEvent?.(JSON.parse(event.data), event, 'gallery-updated');
    } catch {
      onEvent?.(event.data, event, 'gallery-updated');
    }
  });
  source.onerror = () => {
    try {
      source.close();
    } catch {
      // ignore
    }
  };
  return () => {
    try {
      source.close();
    } catch {
      // ignore
    }
  };
}
