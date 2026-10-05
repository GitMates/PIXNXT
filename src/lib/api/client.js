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

/** Rotate the refresh cookie once; shared by apiFetch 401 retry and AuthContext. */
export async function refreshAccessToken() {
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
 * Hidden tabs disconnect. A stream that never opens (D1 5xx) backs off and
 * stops; a stream that already delivered events reconnects after a minute.
 */
export function subscribeSse(path, { onEvent, query = {} } = {}) {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
    return () => {};
  }
  let source = null;
  let retryId = null;
  let disposed = false;
  let sawEvent = false;
  let failures = 0;
  const emit = (event, type) => {
    if (!event.data || event.data.startsWith(':')) return;
    sawEvent = true;
    failures = 0;
    try {
      onEvent?.(JSON.parse(event.data), event, type);
    } catch {
      onEvent?.(event.data, event, type);
    }
  };
  const scheduleRetry = (opened) => {
    if (disposed || retryId) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    let delay = 60000;
    if (!opened) {
      failures += 1;
      // Four failures in a row (D1 5xx) and this tab stops calling.
      if (failures >= 4) return;
      delay = Math.min(300000, 30000 * (2 ** (failures - 1)));
    }
    retryId = window.setTimeout(() => {
      retryId = null;
      connect();
    }, delay);
  };
  const connect = () => {
    if (disposed) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    const params = new URLSearchParams({ ...query });
    if (accessToken) params.set('access_token', accessToken);
    try {
      source = new EventSource(`${apiBase()}${path}?${params.toString()}`);
    } catch {
      scheduleRetry(false);
      return;
    }
    source.onmessage = (event) => emit(event);
    source.addEventListener('hello', (event) => emit(event, 'hello'));
    source.addEventListener('feedback-updated', (event) => emit(event, 'feedback-updated'));
    source.addEventListener('gallery-updated', (event) => emit(event, 'gallery-updated'));
    source.onerror = () => {
      const opened = sawEvent;
      sawEvent = false;
      try {
        source?.close();
      } catch {
        // ignore
      }
      source = null;
      scheduleRetry(opened);
    };
  };
  const onVis = () => {
    if (disposed) return;
    if (document.visibilityState === 'hidden') {
      if (retryId) {
        window.clearTimeout(retryId);
        retryId = null;
      }
      try {
        source?.close();
      } catch {
        // ignore
      }
      source = null;
      return;
    }
    failures = 0;
    sawEvent = false;
    if (!source) connect();
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVis);
  }
  connect();
  return () => {
    disposed = true;
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVis);
    }
    if (retryId) window.clearTimeout(retryId);
    try {
      source?.close();
    } catch {
      // ignore
    }
    source = null;
  };
}
