// Cloudflare Worker: PIXNXT crash sink.
// POST /report -> Analytics Engine `pixnxt_crashes` (history/charts) + KV mirror (admin reads).
// GET /query -> reads KV mirror (Analytics Engine bindings are write-only, no .query()).
// Row shape: {timestamp, accountEmail, photographerId, category, crashType, crashName, reason, route, status, appVersion, crashNo, latencyMs}
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
const ok = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const KV_KEY = 'crashes';
const KV_MAX = 500;

async function readAll(env) {
  try {
    const raw = await env.CRASH_KV.get(KV_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(req.url);

    if (req.method === 'POST' && url.pathname.endsWith('/report')) {
      try {
        const b = await req.json();
        const crashNo = Number(b.crashNo || 0);
        if (!crashNo || crashNo < 1 || crashNo > 1000) return ok({ error: 'crashNo 1-1000 required' }, 400);
        const row = {
          timestamp: new Date().toISOString(),
          accountEmail: String(b.accountEmail || 'unknown').slice(0, 128),
          photographerId: String(b.photographerId || 'unknown').slice(0, 64),
          category: String(b.category || 'Unknown').slice(0, 64),
          crashType: String(b.crashType || b.category || 'Unknown').slice(0, 64),
          crashName: String(b.crashName || 'Unknown').slice(0, 128),
          reason: String(b.reason || '').slice(0, 256),
          route: String(b.route || '').slice(0, 256),
          status: String(b.status || 'error').slice(0, 32),
          appVersion: String(b.appVersion || '').slice(0, 32),
          crashNo,
          latencyMs: Number(b.latencyMs || 0),
        };
        env.CRASH_ANALYTICS.writeDataPoint({
          blobs: [row.accountEmail, row.photographerId, row.category, row.crashType, row.crashName, row.reason, row.route, row.status, row.appVersion],
          doubles: [crashNo, row.latencyMs],
          indexes: [String(crashNo)],
        });
        const all = await readAll(env);
        all.push(row);
        await env.CRASH_KV.put(KV_KEY, JSON.stringify(all.slice(-KV_MAX)));
        return ok({ ok: true });
      } catch (e) { return ok({ error: String(e?.message || e) }, 500); }
    }

    if (req.method === 'GET' && url.pathname.endsWith('/query')) {
      if (env.ADMIN_TOKEN && url.searchParams.get('token') !== env.ADMIN_TOKEN) return ok({ error: 'unauthorized' }, 401);
      const hours = Math.min(Number(url.searchParams.get('hours') || 72), 168);
      const category = url.searchParams.get('category') || '';
      const q = (url.searchParams.get('q') || '').toLowerCase();
      try {
        const cutoff = Date.now() - hours * 3600 * 1000;
        const all = await readAll(env);
        const rows = all
          .filter((r) => Date.parse(r.timestamp || 0) >= cutoff)
          .filter((r) => !category || r.category === category)
          .filter((r) => !q || `${r.accountEmail} ${r.crashName} ${r.reason}`.toLowerCase().includes(q))
          .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
          .slice(0, 500);
        return ok({ ok: true, rows });
      } catch (e) { return ok({ error: String(e?.message || e) }, 500); }
    }
    return ok({ ok: true, usage: 'POST /report, GET /query?hours=72&category=&q=' });
  },
};
