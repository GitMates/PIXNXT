import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CRASH_CATEGORIES,
  CRASH_LIST,
  CRASH_SECTIONS,
  CRASH_TOTAL,
  crashByNo,
} from '../../lib/crashTaxonomy';
import { getCrashGuidance } from '../../lib/crashGuidance';
import { CRASH_DETECTION_EVENT, isCrashDetectionEnabled, setCrashDetectionEnabled } from '../../lib/crashLogger';

const WORKER_URL = (import.meta.env.VITE_CRASH_WORKER_URL || '').replace(/\/+$/, '');
const QUERY_TOKEN = (import.meta.env.VITE_CRASH_QUERY_TOKEN || '').trim();

/** Prefer Master Report taxonomy over stale worker-stored names. */
function enrichRow(r) {
  const no = Number(r.crashNo);
  const ref = crashByNo(no);
  const known = ref.name && ref.name !== 'Unknown crash';
  return {
    ...r,
    crashNo: no,
    category: known ? ref.category : (r.category || ref.category),
    crashType: known ? ref.category : (r.crashType || r.category || ref.category),
    crashName: known ? ref.name : (r.crashName || ref.name),
    taxonomyReason: ref.reason,
    signal: ref.signal,
    section: ref.section,
    sectionTitle: ref.sectionTitle,
  };
}

function matchesQuery(row, q) {
  if (!q) return true;
  const hay = [
    row.accountEmail, row.photographerId, row.crashNo, row.category, row.crashType,
    row.crashName, row.reason, row.route, row.taxonomyReason, row.signal,
    row.section, row.sectionTitle,
  ].join(' ').toLowerCase();
  return hay.includes(q);
}

function GuideBlock({ label, children, tone = 'default' }) {
  const tones = {
    default: 'bg-white border-[#eae8e4]',
    occurs: 'bg-[#fdfdfc] border-[#eae8e4]',
    page: 'bg-[#f7f4ef] border-[#eae8e4]',
    fix: 'bg-emerald-50/80 border-emerald-200/80',
  };
  return (
    <div className={`rounded-xl border p-3.5 ${tones[tone] || tones.default}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">{label}</p>
      <div className="text-sm text-gray-800 leading-relaxed">{children}</div>
    </div>
  );
}

function CrashDetailCard({ crashNo, liveReason, liveRoute, liveWho, onClose }) {
  if (crashNo == null) return null;

  const g = getCrashGuidance(crashNo, { liveReason, route: liveRoute });

  return (
    <div
      className={`rounded-2xl border overflow-hidden ${
        g.unknown ? 'border-amber-300 bg-amber-50/40' : 'border-[#eae8e4] bg-[#fdfdfc]'
      }`}
      role="region"
      aria-label={`Crash ${g.no} details`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5 border-b border-[#eae8e4] bg-white/70">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-gray-500">No. {g.no}</span>
            {g.section != null && (
              <span className="text-[11px] text-gray-400">
                §{g.section} {g.sectionTitle}
              </span>
            )}
            {g.unknown && (
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                Unmapped
              </span>
            )}
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mt-1 leading-snug">{g.what}</h2>
          <p className="text-xs text-gray-500 mt-1">
            Click any crash row to open this panel — how it happens, which page, and how to fix it.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-xs font-medium text-gray-500 hover:text-gray-900 px-2.5 py-1.5 rounded-lg border border-[#eae8e4] bg-white"
          >
            Close
          </button>
        )}
      </div>

      <div className="p-4 grid gap-3 md:grid-cols-2">
        <GuideBlock label="How it occurs" tone="occurs">
          <p>{g.howItOccurs}</p>
          {liveReason && liveReason !== g.howItOccurs && (
            <p className="mt-2 text-xs text-amber-800 border-t border-amber-200/60 pt-2">
              <span className="font-semibold">This live event said: </span>
              {liveReason}
            </p>
          )}
        </GuideBlock>

        <GuideBlock label="Which page / area" tone="page">
          <p className="font-medium text-gray-900">{g.whichPage}</p>
          {g.route && (
            <p className="mt-1.5 font-mono text-xs text-gray-500 break-all">
              Route when it fired: {g.route}
            </p>
          )}
          {liveWho && (
            <p className="mt-1.5 text-xs text-gray-500">
              Who: <span className="font-medium text-gray-700">{liveWho}</span>
            </p>
          )}
        </GuideBlock>

        <div className="md:col-span-2">
          <GuideBlock label="How to fix" tone="fix">
            <ol className="list-decimal pl-4 space-y-1.5">
              {g.howToFix.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            {g.signal && (
              <p className="mt-3 text-xs text-gray-500 font-mono border-t border-emerald-200/50 pt-2">
                Debug fields: {g.signal}
              </p>
            )}
          </GuideBlock>
        </div>
      </div>
    </div>
  );
}

export default function AdminCrashReport() {
  const [tab, setTab] = useState('live');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hours, setHours] = useState(72);
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [crashNoFilter, setCrashNoFilter] = useState('');
  const [detectionOn, setDetectionOn] = useState(() => isCrashDetectionEnabled());
  const [catalogCategory, setCatalogCategory] = useState('');
  const [catalogSection, setCatalogSection] = useState('');
  const [catalogQ, setCatalogQ] = useState('');
  const [selectedNo, setSelectedNo] = useState(null);
  const [selectedLive, setSelectedLive] = useState({ reason: '', route: '', who: '' });

  useEffect(() => {
    const sync = (e) => {
      if (e?.detail && typeof e.detail.enabled === 'boolean') setDetectionOn(e.detail.enabled);
      else setDetectionOn(isCrashDetectionEnabled());
    };
    window.addEventListener(CRASH_DETECTION_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CRASH_DETECTION_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ hours: String(hours) });
      if (category) params.set('category', category);

      const parseRows = async (res) => {
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) return null;
        const data = await res.json().catch(() => null);
        if (!data || typeof data !== 'object') return null;
        if (data.error && !Array.isArray(data.rows)) {
          const err = new Error(String(data.error));
          err.status = res.status;
          throw err;
        }
        if (!res.ok) {
          const err = new Error(data.error || `Query failed (${res.status})`);
          err.status = res.status;
          throw err;
        }
        return Array.isArray(data.rows) ? data.rows : [];
      };

      let next = null;
      try {
        const proxyRes = await fetch(`/api/crash-query?${params.toString()}`);
        next = await parseRows(proxyRes);
      } catch (e) {
        if (e.status === 401 || /unauthorized/i.test(String(e.message))) throw e;
        next = null;
      }

      if (next == null) {
        if (!WORKER_URL) {
          setError(`Live feed unavailable here. Use Catalog to browse Nos. 1–${CRASH_TOTAL} and click any row for how / where / fix.`);
          setRows([]);
          return;
        }
        const directParams = new URLSearchParams(params);
        if (QUERY_TOKEN) directParams.set('token', QUERY_TOKEN);
        const res = await fetch(`${WORKER_URL}/query?${directParams.toString()}`);
        next = await parseRows(res);
        if (next == null) throw new Error(`Query failed (${res.status})`);
      }

      setRows(next.map(enrichRow));
    } catch (e) {
      const msg = e.message || 'Failed to load';
      if (e.status === 401 || /unauthorized/i.test(msg)) {
        setError('Crash query unauthorized — set Pages CRASH_ADMIN_TOKEN (or VITE_CRASH_QUERY_TOKEN).');
      } else {
        setError(msg);
      }
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [hours, category]);

  useEffect(() => { void load(); }, [load]);

  const filteredLive = useMemo(() => {
    const no = crashNoFilter.trim();
    return rows.filter((r) => {
      if (no && String(r.crashNo) !== no) return false;
      return matchesQuery(r, q.trim().toLowerCase());
    });
  }, [rows, q, crashNoFilter]);

  const stats = useMemo(() => {
    const byNo = {};
    let unknownWho = 0;
    for (const r of filteredLive) {
      const n = Number(r.crashNo) || 0;
      byNo[n] = (byNo[n] || 0) + 1;
      if (!r.accountEmail || r.accountEmail === 'unknown') unknownWho += 1;
    }
    const top = Object.entries(byNo)
      .map(([no, count]) => ({ no: Number(no), count, ...crashByNo(no) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    return {
      total: filteredLive.length,
      accounts: new Set(filteredLive.map((r) => r.accountEmail)).size,
      top,
      unknownWho,
    };
  }, [filteredLive]);

  const catalogRows = useMemo(() => {
    const qq = catalogQ.trim().toLowerCase();
    const secNum = catalogSection === '' ? null : Number(catalogSection);
    return CRASH_LIST.filter((c) => {
      if (catalogCategory && c.category !== catalogCategory) return false;
      if (secNum != null && c.section !== secNum) return false;
      if (!qq) return true;
      return `${c.no} ${c.category} ${c.name} ${c.reason} ${c.signal} ${c.section} ${c.sectionTitle || ''}`
        .toLowerCase()
        .includes(qq);
    });
  }, [catalogCategory, catalogSection, catalogQ]);

  const clearDetail = () => {
    setSelectedNo(null);
    setSelectedLive({ reason: '', route: '', who: '' });
  };

  const openDetail = (no, live = {}) => {
    setSelectedNo(Number(no));
    setSelectedLive({
      reason: live.reason || '',
      route: live.route || '',
      who: live.who || '',
    });
    // Scroll detail into view after paint
    requestAnimationFrame(() => {
      document.getElementById('crash-detail-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const exportCsv = () => {
    const head = 'timestamp,accountEmail,photographerId,crashNo,category,crashName,reason,route,section,sectionTitle';
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const body = filteredLive.map((r) => [
      r.timestamp, r.accountEmail, r.photographerId, r.crashNo, r.category,
      r.crashName, r.reason, r.route, r.section, r.sectionTitle,
    ].map(esc).join(',')).join('\n');
    const blob = new Blob([head + '\n' + body], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pixnxt_crashes_${hours}h.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const exportCatalogCsv = () => {
    const head = 'no,section,sectionTitle,category,name,reason,signal';
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const body = catalogRows.map((c) => [
      c.no, c.section, c.sectionTitle, c.category, c.name, c.reason, c.signal,
    ].map(esc).join(',')).join('\n');
    const blob = new Blob([head + '\n' + body], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pixnxt_master_crash_catalog_${CRASH_TOTAL}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const tabs = [
    ['live', 'Live crashes'],
    ['catalog', `All crash types (${CRASH_TOTAL})`],
    ['sections', 'By area'],
  ];

  const detail = selectedNo != null ? (
    <div id="crash-detail-panel">
      <CrashDetailCard
        crashNo={selectedNo}
        liveReason={selectedLive.reason}
        liveRoute={selectedLive.route}
        liveWho={selectedLive.who}
        onClose={clearDetail}
      />
    </div>
  ) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-serif uppercase">Crash Report</h1>
          <p className="text-gray-500 mt-1 text-sm leading-relaxed max-w-2xl">
            See what broke, where the user was, and what to do next.
            Click any crash — live or catalog — for <strong className="font-medium text-gray-700">how it occurs</strong>,{' '}
            <strong className="font-medium text-gray-700">which page</strong>, and{' '}
            <strong className="font-medium text-gray-700">how to fix</strong>.
            {' '}({CRASH_TOTAL} types in the Master Report)
          </p>
        </div>
        <div className={`shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border ${detectionOn ? 'bg-[#fdfdfc] border-[#eae8e4]' : 'bg-gray-50 border-gray-200'}`}>
          <button
            type="button"
            role="switch"
            aria-checked={detectionOn}
            aria-label="Crash detection"
            onClick={() => { setCrashDetectionEnabled(!detectionOn); setDetectionOn(!detectionOn); }}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${detectionOn ? 'bg-emerald-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${detectionOn ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
          <div className="leading-tight">
            <p className="text-[13px] font-bold text-gray-900">Detection</p>
            <p className="text-[11px] text-gray-500">{detectionOn ? 'Recording errors' : 'Paused'}</p>
          </div>
        </div>
      </div>

      {!detectionOn && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-800">
          Detection is off on this browser — new crashes will not be recorded until you turn it on.
        </div>
      )}

      <div className="flex gap-1 border-b border-[#eae8e4] overflow-x-auto">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              tab === id ? 'border-[#1a1a1a] text-[#1a1a1a]' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'live' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['Crashes shown', stats.total],
              ['Accounts hit', stats.accounts],
              ['Unknown who', stats.unknownWho],
              ['Catalog size', CRASH_TOTAL],
            ].map(([l, v]) => (
              <div key={l} className="bg-[#fdfdfc] p-4 rounded-2xl border border-[#eae8e4]">
                <h3 className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{l}</h3>
                <p className="text-xl font-bold text-gray-900 mt-1">{loading ? '…' : v}</p>
              </div>
            ))}
          </div>

          {stats.top.length > 0 && (
            <div className="bg-[#fdfdfc] rounded-2xl border border-[#eae8e4] p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Most common right now</h3>
              <p className="text-xs text-gray-500 mb-3">Click a chip to filter and open the fix guide.</p>
              <div className="flex flex-wrap gap-2">
                {stats.top.map((t) => (
                  <button
                    key={t.no}
                    type="button"
                    onClick={() => { setCrashNoFilter(String(t.no)); openDetail(t.no); }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#eae8e4] bg-white text-left hover:border-gray-400"
                    title={t.reason}
                  >
                    <span className="font-mono text-xs text-gray-500">#{t.no}</span>
                    <span className="text-sm font-medium text-gray-900 max-w-[200px] truncate">{t.name}</span>
                    <span className="text-xs font-bold text-gray-600">{t.count}×</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-[#fdfdfc] p-4 rounded-2xl border border-[#eae8e4] flex flex-wrap gap-3 items-end">
            <label className="text-sm text-gray-600">Hours
              <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className="ml-2 border border-[#eae8e4] rounded-lg px-2 py-1.5 bg-white">
                <option value={24}>24</option>
                <option value={72}>72</option>
                <option value={168}>168</option>
              </select>
            </label>
            <label className="text-sm text-gray-600">Type
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="ml-2 border border-[#eae8e4] rounded-lg px-2 py-1.5 bg-white max-w-[200px]">
                <option value="">All</option>
                {CRASH_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-sm text-gray-600">No.
              <input
                value={crashNoFilter}
                onChange={(e) => setCrashNoFilter(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="78"
                className="ml-2 border border-[#eae8e4] rounded-lg px-2 py-1.5 w-20 font-mono"
              />
            </label>
            <label className="text-sm text-gray-600 flex-1 min-w-[180px]">Search
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="email, name, page…"
                className="ml-2 border border-[#eae8e4] rounded-lg px-2 py-1.5 w-full"
              />
            </label>
            <button type="button" onClick={load} disabled={loading} className="px-4 py-2 bg-[#1a1a1a] text-white rounded-xl text-sm disabled:opacity-50">
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            <button type="button" onClick={exportCsv} className="px-4 py-2 border border-[#eae8e4] rounded-xl text-sm bg-white">CSV</button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {detail}

          <div className="bg-[#fdfdfc] rounded-2xl border border-[#eae8e4] overflow-auto">
            <table className="w-full text-sm min-w-[960px]">
              <thead>
                <tr className="text-left text-gray-500 border-b border-[#eae8e4]">
                  {['When', 'Who', 'Crash', 'Where (route)', ''].map((h) => (
                    <th key={h || 'act'} className="px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLive.map((r, i) => (
                  <tr
                    key={`${r.timestamp}-${r.crashNo}-${i}`}
                    className={`border-b border-[#f0eee9] last:border-0 hover:bg-[#f7f4ef]/70 cursor-pointer ${selectedNo === r.crashNo ? 'bg-[#f7f4ef]' : ''}`}
                    onClick={() => openDetail(r.crashNo, {
                      reason: r.reason || r.taxonomyReason,
                      route: r.route,
                      who: r.accountEmail || 'unknown',
                    })}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">
                      {r.timestamp ? new Date(r.timestamp).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.accountEmail || 'unknown'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-xs text-gray-400">#{r.crashNo}</span>
                        <span className="font-medium text-gray-900">{r.crashName}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{r.crashType || r.category}</div>
                    </td>
                    <td className="px-4 py-3 max-w-[220px] truncate font-mono text-xs text-gray-500" title={r.route}>
                      {r.route || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-medium text-[#1a1a1a] underline-offset-2 hover:underline">
                        How to fix →
                      </span>
                    </td>
                  </tr>
                ))}
                {!filteredLive.length && !loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                      No live crashes in this window. Open <button type="button" className="underline" onClick={() => setTab('catalog')}>All crash types</button> and click any row to see how / where / fix.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'catalog' && (
        <>
          <div className="bg-[#fdfdfc] p-4 rounded-2xl border border-[#eae8e4] flex flex-wrap gap-3 items-end">
            <label className="text-sm text-gray-600">Area
              <select
                value={catalogSection}
                onChange={(e) => setCatalogSection(e.target.value)}
                className="ml-2 border border-[#eae8e4] rounded-lg px-2 py-1.5 bg-white max-w-[260px]"
              >
                <option value="">All areas</option>
                {CRASH_SECTIONS.map((s) => (
                  <option key={s.num} value={s.num}>
                    {s.num}. {s.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-gray-600">Type
              <select
                value={catalogCategory}
                onChange={(e) => setCatalogCategory(e.target.value)}
                className="ml-2 border border-[#eae8e4] rounded-lg px-2 py-1.5 bg-white max-w-[220px]"
              >
                <option value="">All</option>
                {CRASH_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-sm text-gray-600 flex-1 min-w-[200px]">Search
              <input
                value={catalogQ}
                onChange={(e) => setCatalogQ(e.target.value)}
                placeholder="e.g. upload, 401, gallery…"
                className="ml-2 border border-[#eae8e4] rounded-lg px-2 py-1.5 w-full"
              />
            </label>
            <button type="button" onClick={exportCatalogCsv} className="px-4 py-2 border border-[#eae8e4] rounded-xl text-sm bg-white">
              CSV
            </button>
            <p className="text-xs text-gray-500 w-full sm:w-auto sm:ml-auto">
              {catalogRows.length} of {CRASH_TOTAL} — click a row for the fix guide
            </p>
          </div>

          {detail}

          <div className="bg-[#fdfdfc] rounded-2xl border border-[#eae8e4] overflow-auto max-h-[70vh]">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="sticky top-0 bg-[#fdfdfc] z-10">
                <tr className="text-left text-gray-500 border-b border-[#eae8e4]">
                  {['No.', 'Crash', 'What goes wrong', ''].map((h) => (
                    <th key={h || 'a'} className="px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catalogRows.map((c) => (
                  <tr
                    key={c.no}
                    className={`border-b border-[#f0eee9] last:border-0 hover:bg-[#f7f4ef]/70 cursor-pointer ${selectedNo === c.no ? 'bg-[#f7f4ef]' : ''}`}
                    onClick={() => openDetail(c.no)}
                  >
                    <td className="px-4 py-2.5 font-mono font-semibold text-gray-900">{c.no}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {c.category}
                        {c.sectionTitle ? ` · ${c.sectionTitle}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 max-w-[480px] text-gray-600 line-clamp-2" title={c.reason}>
                      {c.reason}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <span className="text-xs font-medium text-[#1a1a1a]">How to fix →</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'sections' && (
        <>
          <p className="text-sm text-gray-500">
            Same areas as the Master Crash Report document. Open an area to browse its crash types, then click one for how / where / fix.
          </p>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {CRASH_SECTIONS.map((s) => (
              <button
                key={s.num}
                type="button"
                onClick={() => {
                  setCatalogSection(String(s.num));
                  setCatalogCategory('');
                  setCatalogQ('');
                  clearDetail();
                  setTab('catalog');
                }}
                className="text-left bg-[#fdfdfc] border border-[#eae8e4] rounded-2xl p-4 hover:border-gray-400 transition-colors"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs font-mono text-gray-400">§{s.num}</p>
                  <p className="text-xs text-gray-500">{s.count} types</p>
                </div>
                <p className="font-semibold text-gray-900 mt-1 leading-snug">{s.title}</p>
                <p className="text-xs text-gray-500 mt-2 line-clamp-2">{s.focus}</p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
