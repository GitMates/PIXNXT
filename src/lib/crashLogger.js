// Crash reporting helper: pages call logCrash(), reports go to Cloudflare.
// Full taxonomy lives in ./crashTaxonomy.js (Master Crash Report; stable 20/77/78).
import { crashByNo, crashNoForApiError, CRASH_NO } from './crashTaxonomy';

const WORKER_URL = (import.meta.env.VITE_CRASH_WORKER_URL || '').replace(/\/+$/, '');
const QUEUE_KEY = 'pixnxt_crash_queue_v1';
const MAX_QUEUE = 200;

const DETECTION_KEY = 'pixnxt_crash_detection';
export const CRASH_DETECTION_EVENT = 'pixnxt-crash-detection-changed';

export function isCrashDetectionEnabled() {
  try {
    if (typeof window !== 'undefined' && window.__PIXNXT_CRASH_DETECTION_OFF__) return false;
    const v = (typeof localStorage !== 'undefined' && localStorage.getItem(DETECTION_KEY)) || 'on';
    return v !== 'off';
  } catch {
    return true;
  }
}

export function setCrashDetectionEnabled(on) {
  try {
    if (typeof window !== 'undefined') {
      window.__PIXNXT_CRASH_DETECTION_OFF__ = !on;
      localStorage.setItem(DETECTION_KEY, on ? 'on' : 'off');
      window.dispatchEvent(new CustomEvent(CRASH_DETECTION_EVENT, { detail: { enabled: Boolean(on) } }));
    }
  } catch { /* storage unavailable */ }
  if (typeof window !== 'undefined') window.__PIXNXT_CRASH_DETECTION_OFF__ = !on;
}

function readQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; }
}
function persistQueue(q) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-MAX_QUEUE))); } catch { /* quota */ }
}

function safeStoreGet(store, key) {
  try {
    if (typeof store === 'undefined' || store == null) return null;
    return store.getItem(key);
  } catch {
    return null;
  }
}

/** Stamp identity for crash reports (AuthContext / public visitor). */
export function stampCrashUser({ email, id } = {}) {
  if (typeof window === 'undefined') return;
  if (email) window.__PIXNXT_USER_EMAIL__ = String(email);
  else delete window.__PIXNXT_USER_EMAIL__;
  if (id) window.__PIXNXT_USER_ID__ = String(id);
  else delete window.__PIXNXT_USER_ID__;
}

function baseContext(extra = {}) {
  let user = null;
  const raw =
    safeStoreGet(typeof sessionStorage !== 'undefined' ? sessionStorage : undefined, 'pixnxt_user');
  try {
    user = raw ? JSON.parse(raw) : null;
  } catch { user = null; }
  return {
    v: 1,
    ts: new Date().toISOString(),
    accountEmail: extra.accountEmail || user?.email || (typeof window !== 'undefined' ? window.__PIXNXT_USER_EMAIL__ : null) || 'unknown',
    photographerId: extra.photographerId || user?.id || (typeof window !== 'undefined' ? window.__PIXNXT_USER_ID__ : null) || 'unknown',
    route: extra.route || (typeof window !== 'undefined' ? window.location.pathname + window.location.search : ''),
    ua: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : '',
    appVersion: import.meta.env.VITE_APP_VERSION || 'dev',
    ...extra,
  };
}

export async function logCrash({ crashNo, category, crashType, crashName, reason, ...extra }) {
  if (!isCrashDetectionEnabled()) return { ok: false, via: 'disabled' };
  const ref = crashByNo(crashNo);
  const payload = {
    ...baseContext(extra),
    crashNo: Number(crashNo),
    category: category || ref.category,
    crashType: crashType || ref.category,
    crashName: crashName || ref.name,
    reason: (reason || ref.reason || '').slice(0, 500),
    status: extra.status || 'error',
    latencyMs: extra.latencyMs ?? 0,
  };
  if (WORKER_URL) {
    try {
      const res = await fetch(`${WORKER_URL}/report`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), keepalive: true,
      });
      if (res.ok) { flushQueue(); return { ok: true, via: 'worker' }; }
    } catch { /* queue */ }
  }
  try {
    const res = await fetch('/api/crash-report', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), keepalive: true,
    });
    if (res.ok) { flushQueue(); return { ok: true, via: 'api' }; }
  } catch { /* offline */ }
  const q = readQueue(); q.push(payload); persistQueue(q);
  return { ok: false, via: 'queued' };
}

export async function flushQueue() {
  if (!WORKER_URL) return;
  const q = readQueue();
  if (!q.length) return;
  const rest = [];
  for (const p of q) {
    try {
      const r = await fetch(`${WORKER_URL}/report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
      if (!r.ok) rest.push(p);
    } catch { rest.push(p); }
  }
  persistQueue(rest);
}

export function reportCaught(crashNo, err, extra = {}) {
  return logCrash({
    crashNo,
    reason: String(err?.message || err || 'caught').slice(0, 300),
    stack: String(err?.stack || '').slice(0, 1000),
    status: err?.status || err?.statusCode || extra.status,
    code: err?.code,
    ...extra,
  });
}

/** Report an ApiError with taxonomy-mapped crashNo (401→API 401, 404→API 404, …). */
export function reportApiError(err, extra = {}) {
  if (!err) return Promise.resolve({ ok: false });
  if (err.__pixnxtCrashLogged) return Promise.resolve({ ok: false, via: 'deduped' });
  try { err.__pixnxtCrashLogged = true; } catch { /* non-extensible */ }
  const crashNo = crashNoForApiError(err);
  return reportCaught(crashNo, err, {
    endpoint: extra.endpoint || extra.path || '',
    method: extra.method || '',
    ...extra,
  });
}

function isThirdPartyRumError({ message, filename, stack }) {
  const hay = `${message || ''}\n${filename || ''}\n${stack || ''}`;
  if (/reportAllChanges/i.test(hay)) return true;
  if (/^VM\d+/i.test(String(filename || ''))) return true;
  if (/^\s*at .*\(VM\d+:/m.test(String(stack || ''))) return true;
  if (/speed-insights|web-vitals|cloudflareinsights|beacon\.min\.js|\.zaraz|chrome-extension:\/\/|moz-extension:\/\/|safari-extension:\/\//i.test(hay)) return true;
  return false;
}

export function installGlobalCrashHooks() {
  if (window.__PIXNXT_CRASH_HOOKS__) return;
  window.__PIXNXT_CRASH_HOOKS__ = true;
  window.addEventListener('error', (e) => {
    if (!isCrashDetectionEnabled()) return;
    const message = String(e.message || 'window.onerror');
    const stack = String(e.error?.stack || '');
    if (isThirdPartyRumError({ message, filename: e.filename || '', stack })) return;
    void logCrash({
      crashNo: CRASH_NO.UNHANDLED_EXCEPTION,
      reason: message.slice(0, 300),
      route: window.location.pathname + window.location.search,
      stack: stack.slice(0, 1000),
    });
  });
  window.addEventListener('unhandledrejection', (e) => {
    if (!isCrashDetectionEnabled()) return;
    const reason = e.reason;
    if (reason?.__pixnxtCrashLogged) return;
    const message = String(reason?.message || reason || 'unhandledrejection');
    const stack = String(reason?.stack || '');
    if (isThirdPartyRumError({ message, filename: '', stack })) return;
    // Remap ApiError / HTTP failures to the matching Master Report vector.
    if (reason && (reason.name === 'ApiError' || reason.status || reason.statusCode)) {
      void reportApiError(reason, { route: window.location.pathname + window.location.search });
      return;
    }
    void logCrash({
      crashNo: CRASH_NO.UNHANDLED_REJECTION,
      reason: message.slice(0, 300),
      route: window.location.pathname + window.location.search,
      stack: stack.slice(0, 1000),
    });
  });
  if (isCrashDetectionEnabled()) flushQueue();
  window.addEventListener('pagehide', () => { void flushQueue(); });
}

export { CRASH_NO };
