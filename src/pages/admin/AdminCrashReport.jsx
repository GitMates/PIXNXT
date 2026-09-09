import React, { useEffect, useMemo, useState } from 'react';
import { CRASH_CATEGORIES, CRASH_LIST, crashByNo } from '../../lib/crashTaxonomy';

const WORKER_URL = (import.meta.env.VITE_CRASH_WORKER_URL || '').replace(/\/+$/, '');

// New admin page: who's account crashed + reason + crash type + crash name.
// Reads Cloudflare Analytics Engine via Worker GET /query. Falls back to taxonomy preview when Worker not configured.
export default function AdminCrashReport() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hours, setHours] = useState(72);
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      if (!WORKER_URL) {
        // Preview mode: show taxonomy so team sees all 266 tracked names before Worker is bound.
        setRows(CRASH_LIST.slice(0, 100).map((c) => ({
          timestamp: '', accountEmail: '(connect Worker to see live accounts)',
          photographerId: '-', category: c.category, crashType: c.category,
          crashName: c.name, reason: c.reason, route: '-', crashNo: c.no, status: 'tracked',
        })));
        return;
      }
      const params = new URLSearchParams({ hours: String(hours) });
      if (category) params.set('category', category);
      if (q.trim()) params.set('q', q.trim());
      const res = await fetch(`${WORKER_URL}/query?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Query failed (${res.status})`);
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch (e) { setError(e.message || 'Failed to load'); } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => {
    const byCat = {};
    for (const r of rows) byCat[r.category || 'Unknown'] = (byCat[r.category || 'Unknown'] || 0) + 1;
    return { total: rows.length, accounts: new Set(rows.map((r) => r.accountEmail)).size, byCat };
  }, [rows]);

  const exportCsv = () => {
    const head = 'timestamp,accountEmail,photographerId,crashNo,category,crashType,crashName,reason,route,status';
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const body = rows.map((r) => [r.timestamp, r.accountEmail, r.photographerId, r.crashNo, r.category, r.crashType, r.crashName, r.reason, r.route, r.status].map(esc).join(',')).join('\n');
    const blob = new Blob([head + '\n' + body], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `pixnxt_crashes_${hours}h.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-serif uppercase">Crash Report</h1>
        <p className="text-gray-500 mt-1">Who crashed, crash type + name, reason. Source: Analytics Engine dataset <code>pixnxt_crashes</code> ({CRASH_LIST.length} crash names tracked). {!WORKER_URL && <span className="text-amber-600">Set VITE_CRASH_WORKER_URL to go live — showing taxonomy preview.</span>}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[['Total events', stats.total], ['Accounts affected', stats.accounts], ['Categories', Object.keys(stats.byCat).length]].map(([l, v]) => (
          <div key={l} className="bg-[#fdfdfc] p-6 rounded-2xl shadow-sm border border-[#eae8e4]">
            <h3 className="text-sm font-medium text-gray-500">{l}</h3>
            <p className="text-3xl font-bold text-gray-900 mt-4">{loading ? '…' : v}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#fdfdfc] p-4 rounded-2xl border border-[#eae8e4] flex flex-wrap gap-3 items-end">
        <label className="text-sm">Hours <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className="ml-2 border rounded-lg px-2 py-1"><option value={24}>24</option><option value={72}>72</option><option value={168}>168</option></select></label>
        <label className="text-sm">Category <select value={category} onChange={(e) => setCategory(e.target.value)} className="ml-2 border rounded-lg px-2 py-1"><option value="">All ({CRASH_CATEGORIES.length})</option>{CRASH_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
        <label className="text-sm flex-1 min-w-[200px]">Account / reason / name <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="email, crash name, reason…" className="ml-2 border rounded-lg px-2 py-1 w-full" /></label>
        <button type="button" onClick={load} disabled={loading} className="px-4 py-2 bg-[#1a1a1a] text-white rounded-xl text-sm disabled:opacity-50">{loading ? 'Loading…' : 'Refresh'}</button>
        <button type="button" onClick={exportCsv} className="px-4 py-2 border rounded-xl text-sm">Export CSV</button>
      </div>

      {error && <p className="text-sm text-red-600">Query failed: {error}. Check Worker binding CRASH_ANALYTICS + dataset pixnxt_crashes has data.</p>}

      <div className="bg-[#fdfdfc] rounded-2xl border border-[#eae8e4] overflow-auto">
        <table className="w-full text-sm min-w-[1000px]">
          <thead><tr className="text-left text-gray-500 border-b">
            {['Time', 'Who (account)', 'No.', 'Crash type', 'Crash name', 'Reason', 'Route'].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((r, i) => {
              const ref = crashByNo(r.crashNo);
              return (
                <tr key={i} className="border-b last:border-0 hover:bg-black/[0.02]">
                  <td className="px-4 py-2 whitespace-nowrap text-gray-500">{r.timestamp ? new Date(r.timestamp).toLocaleString() : '—'}</td>
                  <td className="px-4 py-2"><div className="font-medium">{r.accountEmail}</div><div className="text-xs text-gray-500">{r.photographerId}</div></td>
                  <td className="px-4 py-2 font-mono">{r.crashNo || ref.no}</td>
                  <td className="px-4 py-2">{r.crashType || r.category}</td>
                  <td className="px-4 py-2">{r.crashName || ref.name}</td>
                  <td className="px-4 py-2 max-w-[320px] truncate" title={r.reason}>{r.reason}</td>
                  <td className="px-4 py-2 max-w-[200px] truncate text-gray-500" title={r.route}>{r.route}</td>
                </tr>
              );
            })}
            {!rows.length && !loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No crashes in window. Trigger one via logCrash({"{ crashNo: 77 }"}) or pick a No. 1-{CRASH_LIST.length}.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
