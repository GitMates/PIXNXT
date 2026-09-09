// Step-4 abstraction: pages call logCrash(), only this file knows Supabase vs Cloudflare.
// Full taxonomy lives in ./crashTaxonomy.js (auto-generated 1-266 from Master Crash Report).
import { crashByNo } from './crashTaxonomy';

const WORKER_URL = (import.meta.env.VITE_CRASH_WORKER_URL || '').replace(/\/+$/, '');
const QUEUE_KEY = 'pixnxt_crash_queue_v1';
const MAX_QUEUE = 200;

function readQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; }
}
function persistQueue(q) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-MAX_QUEUE))); } catch { /* quota full: drop */ }
}

function baseContext(extra = {}) {
  let user = null;
  try {
    const raw = localStorage.getItem('supabase.auth.token') || sessionStorage.getItem('pixnxt_user');
    user = raw ? JSON.parse(raw) : null;
  } catch { user = null; }
  return {
    v: 1,
    ts: new Date().toISOString(),
    accountEmail: extra.accountEmail || user?.email || window.__PIXNXT_USER_EMAIL__ || 'unknown',
    photographerId: extra.photographerId || user?.id || window.__PIXNXT_USER_ID__ || 'unknown',
    route: extra.route || (typeof window !== 'undefined' ? window.location.pathname + window.location.search : ''),
    ua: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : '',
    appVersion: import.meta.env.VITE_APP_VERSION || 'dev',
    ...extra,
  };
}

// crashNo 1-266 required. crashType/category/name auto-filled from taxonomy if omitted.
export async function logCrash({ crashNo, category, crashType, crashName, reason, ...extra }) {
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
  // 1) Cloudflare Worker -> Analytics Engine (primary after migration)
  if (WORKER_URL) {
    try {
      const res = await fetch(`${WORKER_URL}/report`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), keepalive: true,
      });
      if (res.ok) { flushQueue(); return { ok: true, via: 'worker' }; }
    } catch { /* fall through to queue */ }
  }
  // 2) Same-origin API fallback (Vercel /api/crash-report or dev middleware)
  try {
    const res = await fetch('/api/crash-report', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), keepalive: true,
    });
    if (res.ok) { flushQueue(); return { ok: true, via: 'api' }; }
  } catch { /* offline */ }
  // 3) Offline queue -> retried on next logCrash / page load
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
  return logCrash({ crashNo, reason: String(err?.message || err || 'caught').slice(0, 300), stack: String(err?.stack || '').slice(0, 1000), ...extra });
}

// Install once in main.jsx: window.onerror + unhandledrejection -> crashNo 77/78
export function installGlobalCrashHooks() {
  if (window.__PIXNXT_CRASH_HOOKS__) return;
  window.__PIXNXT_CRASH_HOOKS__ = true;
  window.addEventListener('error', (e) => {
    void logCrash({ crashNo: 77, reason: String(e.message || 'window.onerror').slice(0, 300), route: window.location.pathname, stack: String(e.error?.stack || '').slice(0, 1000) });
  });
  window.addEventListener('unhandledrejection', (e) => {
    void logCrash({ crashNo: 78, reason: String(e.reason?.message || e.reason || 'unhandledrejection').slice(0, 300), route: window.location.pathname });
  });
  flushQueue();
}
