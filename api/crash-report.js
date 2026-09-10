// Same-origin fallback for src/lib/crashLogger.js when VITE_CRASH_WORKER_URL is empty.
// Forwards to the Cloudflare Worker so browsers never need the Worker URL hard-coded.
// Env: CRASH_WORKER_URL=https://<your-worker>.workers.dev (Vercel server env).
/* global process */
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const target = (process.env.CRASH_WORKER_URL || '').replace(/\/+$/, '');
  try {
    if (!target) { console.warn('[crash-report] no CRASH_WORKER_URL, dropping', req.body?.crashNo); res.status(200).json({ ok: true, via: 'dropped-no-worker' }); return; }
    const r = await fetch(`${target}/report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body || {}) });
    const data = await r.json().catch(() => ({}));
    res.status(r.status).json(data);
  } catch (e) { res.status(502).json({ error: String(e?.message || e) }); }
}
