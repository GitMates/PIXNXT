// Crash reporting helper: pages call logCrash(), reports go to Cloudflare.
// Full taxonomy lives in ./crashTaxonomy.js (Master Crash Report; stable 20/77/78).
import { crashByNo, crashNoForApiError, CRASH_NO } from './crashTaxonomy';

const WORKER_URL = (import.meta.env.VITE_CRASH_WORKER_URL || '').replace(/\/+$/, '');
const QUEUE_KEY = 'pixnxt_crash_queue_v1';
const MAX_QUEUE = 200;
const USER_KEY = 'pixnxt_user';
const CTX_KEY = 'pixnxt_crash_ctx';

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

function safeStoreSet(store, key, value) {
  try {
    if (typeof store === 'undefined' || store == null) return;
    if (value == null) store.removeItem(key);
    else store.setItem(key, value);
  } catch { /* private mode */ }
}

function readJson(store, key) {
  try {
    const raw = safeStoreGet(store, key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function gallerySlugFromPath(pathname = '') {
  const m = String(pathname).match(/^\/gallery\/([^/?#]+)/i);
  return m ? decodeURIComponent(m[1]) : '';
}

/**
 * Stamp identity for crash reports.
 * - Studio account: email + id (AuthContext)
 * - Public gallery: studio owner + optional visitor email + gallery slug
 */
export function stampCrashUser({
  email,
  id,
  role,
  studioName,
  gallerySlug,
  galleryName,
  visitorEmail,
  clearGallery,
} = {}) {
  if (typeof window === 'undefined') return;

  const prev = window.__PIXNXT_CRASH_CTX__ || {};
  const next = { ...prev };

  if (email !== undefined) {
    if (email) {
      window.__PIXNXT_USER_EMAIL__ = String(email);
      next.accountEmail = String(email);
    } else {
      delete window.__PIXNXT_USER_EMAIL__;
      delete next.accountEmail;
    }
  }
  if (id !== undefined) {
    if (id) {
      window.__PIXNXT_USER_ID__ = String(id);
      next.photographerId = String(id);
    } else {
      delete window.__PIXNXT_USER_ID__;
      delete next.photographerId;
    }
  }
  if (role !== undefined) next.whoKind = role || undefined;
  if (studioName !== undefined) next.studioName = studioName ? String(studioName).slice(0, 128) : undefined;
  if (galleryName !== undefined) next.galleryName = galleryName ? String(galleryName).slice(0, 128) : undefined;
  if (gallerySlug !== undefined) next.gallerySlug = gallerySlug ? String(gallerySlug).slice(0, 128) : undefined;
  if (visitorEmail !== undefined) next.visitorEmail = visitorEmail ? String(visitorEmail).slice(0, 128) : undefined;
  if (clearGallery) {
    delete next.gallerySlug;
    delete next.galleryName;
    delete next.visitorEmail;
    if (next.whoKind === 'visitor' || next.whoKind === 'public') delete next.whoKind;
  }

  window.__PIXNXT_CRASH_CTX__ = next;
  try {
    localStorage.setItem(CTX_KEY, JSON.stringify(next));
  } catch { /* quota */ }
}

function readCrashCtx() {
  const mem = typeof window !== 'undefined' ? window.__PIXNXT_CRASH_CTX__ : null;
  if (mem && typeof mem === 'object') return mem;
  return readJson(typeof localStorage !== 'undefined' ? localStorage : undefined, CTX_KEY) || {};
}

function readAuthUser() {
  const fromSession = readJson(
    typeof sessionStorage !== 'undefined' ? sessionStorage : undefined,
    USER_KEY,
  );
  if (fromSession?.email || fromSession?.id) return fromSession;
  return readJson(typeof localStorage !== 'undefined' ? localStorage : undefined, USER_KEY);
}

function buildWhoFields(extra = {}) {
  const ctx = readCrashCtx();
  const user = readAuthUser();
  const route = extra.route
    || (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '');
  const path = String(route).split('?')[0];
  const slugFromRoute = gallerySlugFromPath(path);

  const photographerId =
    extra.photographerId
    || ctx.photographerId
    || user?.id
    || (typeof window !== 'undefined' ? window.__PIXNXT_USER_ID__ : null)
    || '';

  const studioEmail =
    extra.accountEmail
    || ctx.accountEmail
    || user?.email
    || (typeof window !== 'undefined' ? window.__PIXNXT_USER_EMAIL__ : null)
    || '';

  const visitorEmail = extra.visitorEmail || ctx.visitorEmail || '';
  const studioName = extra.studioName || ctx.studioName || '';
  const gallerySlug = extra.gallerySlug || ctx.gallerySlug || slugFromRoute || '';
  const galleryName = extra.galleryName || ctx.galleryName || '';

  let whoKind = extra.whoKind || ctx.whoKind || '';
  if (!whoKind) {
    if (studioEmail && user?.email && studioEmail === user.email) whoKind = 'studio';
    else if (visitorEmail) whoKind = 'visitor';
    else if (gallerySlug || /\/gallery\//i.test(path)) whoKind = 'public';
    else if (studioEmail) whoKind = 'studio';
    else whoKind = 'unknown';
  }

  // Prefer studio account email for "Who" (admin question: whose account).
  // Fall back to visitor email, then a readable public label.
  let accountEmail = studioEmail || visitorEmail || '';
  if (!accountEmail && gallerySlug) {
    accountEmail = `visitor@gallery:${gallerySlug}`;
  }
  if (!accountEmail) accountEmail = 'unknown';

  const whoLabelParts = [];
  if (studioName) whoLabelParts.push(studioName);
  if (studioEmail) whoLabelParts.push(studioEmail);
  else if (visitorEmail) whoLabelParts.push(`visitor ${visitorEmail}`);
  else if (gallerySlug) whoLabelParts.push(`gallery /${gallerySlug}`);
  const whoLabel = whoLabelParts.join(' · ').slice(0, 160) || accountEmail;

  return {
    accountEmail: String(accountEmail).slice(0, 128),
    photographerId: String(photographerId || 'unknown').slice(0, 64),
    whoKind: String(whoKind).slice(0, 32),
    whoLabel: String(whoLabel).slice(0, 160),
    studioName: String(studioName || '').slice(0, 128),
    gallerySlug: String(gallerySlug || '').slice(0, 128),
    galleryName: String(galleryName || '').slice(0, 128),
    visitorEmail: String(visitorEmail || '').slice(0, 128),
    route,
  };
}

function baseContext(extra = {}) {
  const who = buildWhoFields(extra);
  return {
    v: 2,
    ts: new Date().toISOString(),
    ...who,
    ua: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : '',
    appVersion: import.meta.env.VITE_APP_VERSION || 'dev',
    ...extra,
    // Keep who fields authoritative after extra spread overrides
    accountEmail: extra.accountEmail || who.accountEmail,
    photographerId: extra.photographerId || who.photographerId,
    whoKind: extra.whoKind || who.whoKind,
    whoLabel: extra.whoLabel || who.whoLabel,
    studioName: extra.studioName ?? who.studioName,
    gallerySlug: extra.gallerySlug ?? who.gallerySlug,
    galleryName: extra.galleryName ?? who.galleryName,
    visitorEmail: extra.visitorEmail ?? who.visitorEmail,
    route: extra.route || who.route,
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
  // Hydrate in-memory ctx from localStorage early
  try {
    const ctx = readJson(localStorage, CTX_KEY);
    if (ctx) window.__PIXNXT_CRASH_CTX__ = ctx;
    const user = readAuthUser();
    if (user?.email || user?.id) {
      stampCrashUser({ email: user.email, id: user.id, role: 'studio' });
    }
  } catch { /* ignore */ }

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

export { CRASH_NO, safeStoreSet, USER_KEY };
