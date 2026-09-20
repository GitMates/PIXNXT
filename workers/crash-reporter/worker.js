// Cloudflare Worker: PIXNXT crash sink.
// POST /report -> Analytics Engine `pixnxt_crashes` + KV mirror (admin reads).
// GET /query -> reads KV mirror (Analytics Engine bindings are write-only).
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
const ok = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
const KV_KEY = 'crashes';
const KV_MAX = 1000;

async function readAll(env) {
  try {
    const raw = await env.CRASH_KV.get(KV_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function dayKey(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function monthKey(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 7);
}

function startOfLocalDay(yyyyMmDd) {
  const [y, m, d] = String(yyyyMmDd).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

function endOfLocalDay(yyyyMmDd) {
  const [y, m, d] = String(yyyyMmDd).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

function startOfMonth(yyyyMm) {
  const [y, m] = String(yyyyMm).split('-').map(Number);
  if (!y || !m) return null;
  return new Date(y, m - 1, 1, 0, 0, 0, 0).getTime();
}

function endOfMonth(yyyyMm) {
  const [y, m] = String(yyyyMm).split('-').map(Number);
  if (!y || !m) return null;
  return new Date(y, m, 0, 23, 59, 59, 999).getTime();
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(req.url);

    if (req.method === 'POST' && url.pathname.endsWith('/report')) {
      try {
        const b = await req.json();
        const crashNo = Number(b.crashNo || 0);
        if (!crashNo || crashNo < 1 || crashNo > 1000) {
          return ok({ error: 'crashNo 1-1000 required' }, 400);
        }
        const row = {
          timestamp: b.ts || new Date().toISOString(),
          accountEmail: String(b.accountEmail || 'unknown').slice(0, 128),
          photographerId: String(b.photographerId || 'unknown').slice(0, 64),
          category: String(b.category || 'Unknown').slice(0, 64),
          crashType: String(b.crashType || b.category || 'Unknown').slice(0, 64),
          crashName: String(b.crashName || 'Unknown').slice(0, 160),
          reason: String(b.reason || '').slice(0, 1200),
          stack: String(b.stack || '').slice(0, 4000),
          route: String(b.route || '').slice(0, 512),
          endpoint: String(b.endpoint || b.path || '').slice(0, 256),
          method: String(b.method || '').slice(0, 16),
          code: String(b.code || '').slice(0, 64),
          status: String(b.status || 'error').slice(0, 32),
          httpStatus: Number(b.httpStatus || b.statusCode || 0) || 0,
          appVersion: String(b.appVersion || '').slice(0, 32),
          ua: String(b.ua || '').slice(0, 240),
          whoKind: String(b.whoKind || '').slice(0, 32),
          whoLabel: String(b.whoLabel || '').slice(0, 160),
          studioName: String(b.studioName || '').slice(0, 128),
          gallerySlug: String(b.gallerySlug || '').slice(0, 128),
          galleryName: String(b.galleryName || '').slice(0, 128),
          visitorEmail: String(b.visitorEmail || '').slice(0, 128),
          crashNo,
          latencyMs: Number(b.latencyMs || 0),
        };
        try {
          env.CRASH_ANALYTICS?.writeDataPoint?.({
            blobs: [
              row.accountEmail,
              row.photographerId,
              row.category,
              row.crashType,
              row.crashName,
              row.reason,
              row.route,
              row.status,
              row.appVersion,
            ],
            doubles: [crashNo, row.latencyMs],
            indexes: [String(crashNo)],
          });
        } catch {
          /* analytics optional */
        }
        const all = await readAll(env);
        all.push(row);
        await env.CRASH_KV.put(KV_KEY, JSON.stringify(all.slice(-KV_MAX)));
        return ok({ ok: true });
      } catch (e) {
        return ok({ error: String(e?.message || e) }, 500);
      }
    }

    if (req.method === 'GET' && url.pathname.endsWith('/query')) {
      if (env.ADMIN_TOKEN && url.searchParams.get('token') !== env.ADMIN_TOKEN) {
        return ok({ error: 'unauthorized' }, 401);
      }
      const category = url.searchParams.get('category') || '';
      const q = (url.searchParams.get('q') || '').toLowerCase();
      const crashNoFilter = url.searchParams.get('crashNo') || '';
      const day = url.searchParams.get('day') || '';
      const month = url.searchParams.get('month') || '';
      const fromParam = url.searchParams.get('from') || '';
      const toParam = url.searchParams.get('to') || '';
      const hoursRaw = url.searchParams.get('hours');

      let fromMs = null;
      let toMs = null;

      if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
        fromMs = startOfLocalDay(day);
        toMs = endOfLocalDay(day);
      } else if (month && /^\d{4}-\d{2}$/.test(month)) {
        fromMs = startOfMonth(month);
        toMs = endOfMonth(month);
      } else if (fromParam || toParam) {
        if (fromParam) {
          fromMs = /^\d{4}-\d{2}-\d{2}$/.test(fromParam)
            ? startOfLocalDay(fromParam)
            : Date.parse(fromParam);
        }
        if (toParam) {
          toMs = /^\d{4}-\d{2}-\d{2}$/.test(toParam)
            ? endOfLocalDay(toParam)
            : Date.parse(toParam);
        }
      } else {
        const hours = Math.min(Math.max(Number(hoursRaw || 168) || 168, 1), 720);
        fromMs = Date.now() - hours * 3600 * 1000;
        toMs = Date.now();
      }

      try {
        const all = await readAll(env);
        const rows = all
          .filter((r) => {
            const t = Date.parse(r.timestamp || 0);
            if (Number.isNaN(t)) return false;
            if (fromMs != null && !Number.isNaN(fromMs) && t < fromMs) return false;
            if (toMs != null && !Number.isNaN(toMs) && t > toMs) return false;
            return true;
          })
          .filter((r) => !category || r.category === category)
          .filter((r) => !crashNoFilter || String(r.crashNo) === String(crashNoFilter))
          .filter((r) => {
            if (!q) return true;
            const hay = [
              r.accountEmail,
              r.crashName,
              r.reason,
              r.route,
              r.endpoint,
              r.stack,
              r.studioName,
              r.gallerySlug,
              r.code,
            ]
              .join(' ')
              .toLowerCase();
            return hay.includes(q);
          })
          .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
          .slice(0, 800)
          .map((r) => ({
            ...r,
            day: dayKey(r.timestamp),
            month: monthKey(r.timestamp),
          }));
        return ok({
          ok: true,
          rows,
          meta: {
            from: fromMs != null ? new Date(fromMs).toISOString() : null,
            to: toMs != null ? new Date(toMs).toISOString() : null,
            count: rows.length,
          },
        });
      } catch (e) {
        return ok({ error: String(e?.message || e) }, 500);
      }
    }

    return ok({
      ok: true,
      usage:
        'POST /report, GET /query?hours=168|day=YYYY-MM-DD|month=YYYY-MM|from=&to=&category=&crashNo=&q=',
    });
  },
};
