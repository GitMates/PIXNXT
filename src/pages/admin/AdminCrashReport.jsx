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
import {
  AdminPageHeader,
  AdminStatCard,
  AdminModal,
} from '../../components/admin/AdminUi';
import { apiFetch } from '../../lib/api/client';

const WORKER_URL = (import.meta.env.VITE_CRASH_WORKER_URL || '').replace(/\/+$/, '');
const QUERY_TOKEN = (import.meta.env.VITE_CRASH_QUERY_TOKEN || '').trim();

const RANGE_PRESETS = [
  { id: '24h', label: 'Last 24 hours', hours: 24 },
  { id: '7d', label: 'Last 7 days', hours: 168 },
  { id: '30d', label: 'Last 30 days', hours: 720 },
  { id: 'today', label: 'Today', mode: 'today' },
  { id: 'month', label: 'This month', mode: 'this-month' },
  { id: 'day', label: 'Pick a day', mode: 'day' },
  { id: 'month-pick', label: 'Pick a month', mode: 'month' },
  { id: 'custom', label: 'Custom range', mode: 'custom' },
];

function gallerySlugFromRoute(route = '') {
  const m = String(route).match(/\/gallery\/([^/?#]+)/i);
  return m ? decodeURIComponent(m[1]) : '';
}

function isPlaceholderEmail(email = '') {
  const e = String(email).trim();
  return !e || e === 'unknown' || /^visitor@gallery:/i.test(e) || !e.includes('@');
}

function extractEmail(text = '') {
  const m = String(text).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m ? m[0] : '';
}

function toDateInputValue(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toMonthInputValue(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Who column = account email id only.
 * Secondary line may show studio name / gallery for context.
 */
export function formatWho(row = {}) {
  const email = String(row.accountEmail || '').trim();
  const label = String(row.whoLabel || '').trim();
  const studio = String(row.studioName || '').trim();
  const slug = String(row.gallerySlug || gallerySlugFromRoute(row.route) || '').trim();
  const visitor = String(row.visitorEmail || '').trim();
  const pid = String(row.photographerId || '').trim();
  const resolved = String(row.resolvedEmail || '').trim();

  const fromLabel = extractEmail(label);
  const primaryEmail =
    (!isPlaceholderEmail(email) ? email : '')
    || (!isPlaceholderEmail(resolved) ? resolved : '')
    || (!isPlaceholderEmail(fromLabel) ? fromLabel : '')
    || (!isPlaceholderEmail(visitor) ? visitor : '');

  const secondaryParts = [];
  if (studio && (!primaryEmail || studio.toLowerCase() !== primaryEmail.toLowerCase())) {
    secondaryParts.push(studio);
  }
  if (slug) secondaryParts.push(`Gallery /${slug}`);
  else if (!primaryEmail && pid && pid !== 'unknown') secondaryParts.push(`ID ${pid.slice(0, 8)}…`);

  if (primaryEmail) {
    return {
      primary: primaryEmail,
      secondary: secondaryParts.join(' · '),
      kind: row.whoKind || (visitor && primaryEmail === visitor ? 'visitor' : 'studio'),
    };
  }

  return {
    primary: 'No email',
    secondary: secondaryParts.join(' · ') || 'Studio email not linked yet',
    kind: 'unknown',
  };
}

function enrichRow(r, maps = { byPhotographerId: {}, byGallerySlug: {} }) {
  const no = Number(r.crashNo);
  const ref = crashByNo(no);
  const known = ref.name && ref.name !== 'Unknown crash';
  const slug = r.gallerySlug || gallerySlugFromRoute(r.route);
  const pid = String(r.photographerId || '').trim();
  const slugKey = String(slug || '').trim().toLowerCase();
  const byId = maps.byPhotographerId || {};
  const bySlug = maps.byGallerySlug || {};
  const resolvedEmail =
    (pid && pid !== 'unknown' && byId[pid])
    || (slugKey && bySlug[slugKey])
    || '';
  const liveReason = String(r.reason || '').trim();
  const taxonomyReason = String(ref.reason || '').trim();
  const row = {
    ...r,
    crashNo: no,
    category: known ? ref.category : (r.category || ref.category),
    crashType: known ? ref.category : (r.crashType || r.category || ref.category),
    crashName: known ? ref.name : (r.crashName || ref.name),
    taxonomyReason,
    signal: ref.signal,
    section: ref.section,
    sectionTitle: ref.sectionTitle,
    gallerySlug: slug,
    resolvedEmail,
    accountEmail: !isPlaceholderEmail(r.accountEmail) ? r.accountEmail : (resolvedEmail || r.accountEmail),
    causeSummary: liveReason || taxonomyReason || 'No cause recorded',
    causeDetail: liveReason && taxonomyReason && liveReason !== taxonomyReason
      ? liveReason
      : (liveReason || taxonomyReason),
  };
  const who = formatWho(row);
  return { ...row, whoPrimary: who.primary, whoSecondary: who.secondary, whoKind: who.kind };
}

function matchesQuery(row, q) {
  if (!q) return true;
  const hay = [
    row.accountEmail, row.whoLabel, row.whoPrimary, row.whoSecondary, row.studioName,
    row.gallerySlug, row.visitorEmail, row.photographerId, row.crashNo, row.category,
    row.crashType, row.crashName, row.reason, row.route, row.taxonomyReason, row.signal,
    row.section, row.sectionTitle, row.stack, row.endpoint, row.method, row.code, row.ua,
  ].join(' ').toLowerCase();
  return hay.includes(q);
}

function DetailBlock({ label, children, mono = false }) {
  if (!children) return null;
  return (
    <section className="rounded-2xl border border-[#eae8e4] bg-white p-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 select-none">{label}</h3>
      <div className={mono ? 'font-mono text-xs text-gray-800 whitespace-pre-wrap break-all leading-relaxed' : 'text-sm text-gray-800 leading-relaxed'}>
        {children}
      </div>
    </section>
  );
}

function FixModal({ crashNo, live, onClose }) {
  if (crashNo == null) return null;
  const g = getCrashGuidance(crashNo, {
    liveReason: live?.reason || live?.causeDetail,
    route: live?.route,
  });
  const who = formatWho(live || {});
  const liveReason = String(live?.reason || '').trim();
  const taxonomyReason = String(live?.taxonomyReason || g.howItOccurs || '').trim();
  const stack = String(live?.stack || '').trim();
  const endpoint = String(live?.endpoint || '').trim();
  const method = String(live?.method || '').trim();
  const code = String(live?.code || '').trim();
  const httpStatus = Number(live?.httpStatus || 0) || 0;
  const ua = String(live?.ua || '').trim();
  const appVersion = String(live?.appVersion || '').trim();
  const latencyMs = Number(live?.latencyMs || 0) || 0;

  return (
    <AdminModal
      open
      onClose={onClose}
      size="xl"
      title={g.what}
      subtitle={`No. ${g.no}${g.section != null ? ` · §${g.section} ${g.sectionTitle}` : ''}${live?.timestamp ? ` · ${new Date(live.timestamp).toLocaleString()}` : ''}`}
      footer={(
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#1a1a1a] text-white hover:bg-black"
        >
          Close
        </button>
      )}
    >
      <section className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 mb-2 select-none">
          Live cause
        </h3>
        <p className="text-sm text-gray-900 leading-relaxed font-medium">
          {liveReason || 'No live error message was captured for this event.'}
        </p>
        {taxonomyReason && liveReason && taxonomyReason !== liveReason && (
          <p className="mt-3 text-xs text-amber-900/80 border-t border-amber-200/70 pt-3">
            <span className="font-semibold">Catalog pattern: </span>{taxonomyReason}
          </p>
        )}
        {!liveReason && taxonomyReason && (
          <p className="mt-3 text-xs text-amber-900/80 border-t border-amber-200/70 pt-3">
            <span className="font-semibold">Catalog pattern: </span>{taxonomyReason}
          </p>
        )}
      </section>

      <DetailBlock label="Stack trace" mono>
        {stack || null}
      </DetailBlock>

      <div className="grid sm:grid-cols-2 gap-3">
        <section className="rounded-2xl border border-[#eae8e4] bg-[#f7f4ef] p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 select-none">Which page</h3>
          <p className="text-sm font-medium text-gray-900">{g.whichPage}</p>
          {g.route && (
            <p className="mt-2 font-mono text-xs text-gray-500 break-all">{g.route}</p>
          )}
          {(method || endpoint) && (
            <p className="mt-2 font-mono text-xs text-gray-600 break-all">
              {method ? `${method} ` : ''}{endpoint || ''}
            </p>
          )}
        </section>
        <section className="rounded-2xl border border-[#eae8e4] bg-[#f7f4ef] p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 select-none">Whose account</h3>
          <p className="text-sm font-medium text-gray-900">{who.primary}</p>
          {who.secondary && <p className="mt-1 text-xs text-gray-600">{who.secondary}</p>}
          <p className="mt-2 text-[11px] uppercase tracking-wide text-gray-400 select-none">{who.kind}</p>
          {live?.photographerId && live.photographerId !== 'unknown' && (
            <p className="mt-2 font-mono text-[11px] text-gray-500 break-all">id: {live.photographerId}</p>
          )}
        </section>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <DetailBlock label="HTTP / status">
          {[httpStatus || null, live?.status, code].filter(Boolean).join(' · ') || '—'}
        </DetailBlock>
        <DetailBlock label="App version">{appVersion || '—'}</DetailBlock>
        <DetailBlock label="Latency">{latencyMs ? `${latencyMs} ms` : '—'}</DetailBlock>
        <DetailBlock label="Category">{live?.category || g.summary || '—'}</DetailBlock>
      </div>

      <DetailBlock label="User agent" mono>{ua || null}</DetailBlock>

      {g.signal && (
        <DetailBlock label="Debug signals" mono>{g.signal}</DetailBlock>
      )}

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 mb-2 select-none">How to fix</h3>
        <ol className="list-decimal pl-4 space-y-2 text-sm text-gray-900 leading-relaxed">
          {g.howToFix.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </AdminModal>
  );
}

function buildQueryParams({ rangeId, hours, day, month, from, to, category, crashNoFilter }) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (crashNoFilter) params.set('crashNo', crashNoFilter);

  const preset = RANGE_PRESETS.find((p) => p.id === rangeId) || RANGE_PRESETS[1];
  if (preset.hours) {
    params.set('hours', String(preset.hours));
  } else if (preset.mode === 'today') {
    params.set('day', toDateInputValue(new Date()));
    // Also send hours for older crash workers that only understand hours.
    params.set('hours', '48');
  } else if (preset.mode === 'this-month') {
    params.set('month', toMonthInputValue(new Date()));
    params.set('hours', '720');
  } else if (preset.mode === 'day' && day) {
    params.set('day', day);
    params.set('hours', '720');
  } else if (preset.mode === 'month' && month) {
    params.set('month', month);
    params.set('hours', '720');
  } else if (preset.mode === 'custom' && (from || to)) {
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    params.set('hours', '720');
  } else {
    params.set('hours', String(hours || 168));
  }
  return params;
}

export default function AdminCrashReport() {
  const [tab, setTab] = useState('live');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rangeId, setRangeId] = useState('7d');
  const [hours] = useState(168);
  const [day, setDay] = useState(() => toDateInputValue());
  const [month, setMonth] = useState(() => toMonthInputValue());
  const [fromDate, setFromDate] = useState(() => toDateInputValue(new Date(Date.now() - 7 * 86400000)));
  const [toDate, setToDate] = useState(() => toDateInputValue());
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [crashNoFilter, setCrashNoFilter] = useState('');
  const [detectionOn, setDetectionOn] = useState(() => isCrashDetectionEnabled());
  const [catalogCategory, setCatalogCategory] = useState('');
  const [catalogSection, setCatalogSection] = useState('');
  const [catalogQ, setCatalogQ] = useState('');
  const [modal, setModal] = useState(null);
  const [expandedKey, setExpandedKey] = useState(null);

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
      const params = buildQueryParams({
        rangeId, hours, day, month, from: fromDate, to: toDate, category, crashNoFilter,
      });

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
          setError(`Live feed unavailable. Browse All crash types (${CRASH_TOTAL}) — click How to fix for guidance.`);
          setRows([]);
          return;
        }
        const directParams = new URLSearchParams(params);
        if (QUERY_TOKEN) directParams.set('token', QUERY_TOKEN);
        const res = await fetch(`${WORKER_URL}/query?${directParams.toString()}`);
        next = await parseRows(res);
        if (next == null) throw new Error(`Query failed (${res.status})`);
      }

      setRows(next.map((r) => enrichRow(r)));

      try {
        const whoRes = await apiFetch('/v1/admin/who-emails');
        const maps = {
          byPhotographerId: whoRes?.byPhotographerId || {},
          byGallerySlug: whoRes?.byGallerySlug || {},
        };
        if (Object.keys(maps.byPhotographerId).length || Object.keys(maps.byGallerySlug).length) {
          setRows(next.map((r) => enrichRow(r, maps)));
        }
      } catch {
        try {
          const listRes = await apiFetch('/v1/admin/photographers?limit=500');
          const byPhotographerId = {};
          for (const p of listRes?.photographers || []) {
            if (p?.id && p?.email) byPhotographerId[String(p.id)] = String(p.email);
          }
          if (Object.keys(byPhotographerId).length) {
            setRows(next.map((r) => enrichRow(r, { byPhotographerId, byGallerySlug: {} })));
          }
        } catch { /* Who still shows stamped email when present */ }
      }
    } catch (e) {
      const msg = e.message || 'Failed to load';
      if (e.status === 401 || /unauthorized/i.test(msg)) {
        setError('Crash query unauthorized — set Pages CRASH_ADMIN_TOKEN.');
      } else setError(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [rangeId, hours, day, month, fromDate, toDate, category, crashNoFilter]);

  useEffect(() => { void load(); }, [load]);

  const filteredLive = useMemo(() => {
    const no = crashNoFilter.trim();
    const preset = RANGE_PRESETS.find((p) => p.id === rangeId) || RANGE_PRESETS[1];

    let fromMs = null;
    let toMs = null;
    if (preset.mode === 'today') {
      const d = toDateInputValue(new Date());
      fromMs = new Date(`${d}T00:00:00`).getTime();
      toMs = new Date(`${d}T23:59:59.999`).getTime();
    } else if (preset.mode === 'this-month') {
      const m = toMonthInputValue(new Date());
      const [y, mo] = m.split('-').map(Number);
      fromMs = new Date(y, mo - 1, 1).getTime();
      toMs = new Date(y, mo, 0, 23, 59, 59, 999).getTime();
    } else if (preset.mode === 'day' && day) {
      fromMs = new Date(`${day}T00:00:00`).getTime();
      toMs = new Date(`${day}T23:59:59.999`).getTime();
    } else if (preset.mode === 'month' && month) {
      const [y, mo] = month.split('-').map(Number);
      fromMs = new Date(y, mo - 1, 1).getTime();
      toMs = new Date(y, mo, 0, 23, 59, 59, 999).getTime();
    } else if (preset.mode === 'custom') {
      if (fromDate) fromMs = new Date(`${fromDate}T00:00:00`).getTime();
      if (toDate) toMs = new Date(`${toDate}T23:59:59.999`).getTime();
    }

    return rows.filter((r) => {
      if (no && String(r.crashNo) !== no) return false;
      if (!matchesQuery(r, q.trim().toLowerCase())) return false;
      if (fromMs != null || toMs != null) {
        const t = Date.parse(r.timestamp || 0);
        if (Number.isNaN(t)) return false;
        if (fromMs != null && t < fromMs) return false;
        if (toMs != null && t > toMs) return false;
      }
      return true;
    });
  }, [rows, q, crashNoFilter, rangeId, day, month, fromDate, toDate]);

  const liveViz = useMemo(() => {
    const byNo = {};
    const byWho = {};
    const byPage = {};
    const byDay = {};
    let knownAccounts = 0;
    let unknownAccounts = 0;
    for (const r of filteredLive) {
      const n = Number(r.crashNo) || 0;
      byNo[n] = (byNo[n] || 0) + 1;
      const whoKey = r.whoPrimary || 'Unknown account';
      byWho[whoKey] = (byWho[whoKey] || 0) + 1;
      if (r.whoKind === 'unknown' || !/@/.test(whoKey)) unknownAccounts += 1;
      else knownAccounts += 1;
      const page = getCrashGuidance(n, { route: r.route }).whichPage;
      byPage[page] = (byPage[page] || 0) + 1;
      const d = r.day || (r.timestamp ? String(r.timestamp).slice(0, 10) : 'unknown');
      byDay[d] = (byDay[d] || 0) + 1;
    }
    const toItems = (obj, mapLabel) => Object.entries(obj)
      .map(([key, count]) => ({ key, count, label: mapLabel ? mapLabel(key, count) : key }))
      .sort((a, b) => b.count - a.count);
    return {
      total: filteredLive.length,
      accounts: new Set(filteredLive.map((r) => r.whoPrimary)).size,
      knownAccounts,
      unknownAccounts,
      byCrash: toItems(byNo, (key) => `#${key} ${crashByNo(key).name}`),
      byWho: toItems(byWho),
      byPage: toItems(byPage),
      byDay: toItems(byDay).slice(0, 14),
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

  const openFix = (no, live = null) => setModal({ no: Number(no), live });

  const exportCsv = () => {
    const head = 'timestamp,who,accountEmail,studioName,gallerySlug,photographerId,crashNo,category,crashName,reason,stack,route,endpoint,method,code,httpStatus,ua,appVersion';
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const body = filteredLive.map((r) => [
      r.timestamp, r.whoPrimary, r.accountEmail, r.studioName, r.gallerySlug,
      r.photographerId, r.crashNo, r.category, r.crashName, r.reason, r.stack,
      r.route, r.endpoint, r.method, r.code, r.httpStatus, r.ua, r.appVersion,
    ].map(esc).join(',')).join('\n');
    const blob = new Blob([head + '\n' + body], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pixnxt_crashes_${rangeId}.csv`;
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
    ['catalog', `All types (${CRASH_TOTAL})`],
    ['sections', 'By area'],
  ];

  const activePreset = RANGE_PRESETS.find((p) => p.id === rangeId) || RANGE_PRESETS[1];

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Crash Report"
        subtitle="Detailed live causes, stack traces, and day/month filters. Click a row or How to fix for full diagnosis."
        actions={(
          <div className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border ${detectionOn ? 'bg-white border-[#eae8e4]' : 'bg-gray-50 border-gray-200'}`}>
            <button
              type="button"
              role="switch"
              aria-checked={detectionOn}
              aria-label="Crash detection"
              onClick={() => { setCrashDetectionEnabled(!detectionOn); setDetectionOn(!detectionOn); }}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full ${detectionOn ? 'bg-emerald-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${detectionOn ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
            <div className="leading-tight">
              <p className="text-[13px] font-bold text-gray-900">Detection</p>
              <p className="text-[11px] text-gray-500">{detectionOn ? 'Recording' : 'Paused'}</p>
            </div>
          </div>
        )}
      />

      <div className="flex gap-1 border-b border-[#eae8e4] overflow-x-auto">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
              tab === id ? 'border-[#1a1a1a] text-[#1a1a1a]' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'live' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <AdminStatCard label="Crashes" value={loading ? '—' : liveViz.total.toLocaleString()} loading={loading} />
            <AdminStatCard label="Accounts / galleries" value={loading ? '—' : liveViz.accounts.toLocaleString()} loading={loading} />
            <AdminStatCard label="Identified who" value={loading ? '—' : liveViz.knownAccounts.toLocaleString()} loading={loading} tone="ok" />
            <AdminStatCard
              label="Still unknown"
              value={loading ? '—' : liveViz.unknownAccounts.toLocaleString()}
              loading={loading}
              tone={liveViz.unknownAccounts > 0 ? 'warn' : undefined}
            />
          </div>

          <div className="rounded-2xl border border-[#eae8e4] bg-white p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {RANGE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setRangeId(p.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    rangeId === p.id
                      ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                      : 'bg-white text-gray-700 border-[#eae8e4] hover:border-gray-400'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 items-end">
              {activePreset.mode === 'day' && (
                <label className="text-sm text-gray-600">Day
                  <input
                    type="date"
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    className="ml-2 border border-[#eae8e4] rounded-lg px-2 py-1.5 bg-white"
                  />
                </label>
              )}
              {activePreset.mode === 'month' && (
                <label className="text-sm text-gray-600">Month
                  <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="ml-2 border border-[#eae8e4] rounded-lg px-2 py-1.5 bg-white"
                  />
                </label>
              )}
              {activePreset.mode === 'custom' && (
                <>
                  <label className="text-sm text-gray-600">From
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="ml-2 border border-[#eae8e4] rounded-lg px-2 py-1.5 bg-white"
                    />
                  </label>
                  <label className="text-sm text-gray-600">To
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="ml-2 border border-[#eae8e4] rounded-lg px-2 py-1.5 bg-white"
                    />
                  </label>
                </>
              )}
              <label className="text-sm text-gray-600">Type
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="ml-2 border border-[#eae8e4] rounded-lg px-2 py-1.5 bg-white max-w-[180px]">
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
              <label className="text-sm text-gray-600 flex-1 min-w-[160px]">Search
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="email, cause, stack, route, endpoint…"
                  className="ml-2 border border-[#eae8e4] rounded-lg px-2 py-1.5 w-full"
                />
              </label>
              <button type="button" onClick={load} disabled={loading} className="px-4 py-2 bg-[#1a1a1a] text-white rounded-xl text-sm disabled:opacity-50">
                {loading ? 'Loading…' : 'Refresh'}
              </button>
              <button type="button" onClick={exportCsv} className="px-4 py-2 border border-[#eae8e4] rounded-xl text-sm bg-white">CSV</button>
            </div>
          </div>

          {liveViz.byDay.length > 1 && (
            <div className="rounded-2xl border border-[#eae8e4] bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">By day</p>
              <div className="flex flex-wrap gap-2">
                {liveViz.byDay.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => {
                      setRangeId('day');
                      setDay(d.key);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-[#eae8e4] bg-[#faf9f7] px-3 py-1.5 text-xs hover:border-gray-400"
                  >
                    <span className="font-mono text-gray-600">{d.key}</span>
                    <span className="font-semibold text-gray-900">{d.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="rounded-2xl border border-[#eae8e4] bg-white overflow-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="text-left text-gray-500 border-b border-[#eae8e4] bg-[#faf9f7]">
                  {['When', 'Who (email)', 'Crash', 'Cause', 'Where', ''].map((h) => (
                    <th key={h || 'a'} className="px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLive.map((r, i) => {
                  const rowKey = `${r.timestamp}-${r.crashNo}-${i}`;
                  const open = expandedKey === rowKey;
                  return (
                    <React.Fragment key={rowKey}>
                      <tr
                        className="ad-row border-b border-[#f0eee9] last:border-0 hover:bg-[#faf9f7] cursor-pointer"
                        onClick={() => setExpandedKey(open ? null : rowKey)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                          {r.timestamp ? new Date(r.timestamp).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className={`font-medium truncate max-w-[200px] ${/@/.test(r.whoPrimary || '') ? 'text-gray-900' : 'text-amber-700'}`}
                            title={r.whoPrimary}
                          >
                            {r.whoPrimary}
                          </div>
                          {r.whoSecondary && (
                            <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]" title={r.whoSecondary}>
                              {r.whoSecondary}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-xs text-gray-400">#{r.crashNo}</span>
                            <span className="font-medium text-gray-900">{r.crashName}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{r.category}</div>
                        </td>
                        <td className="px-4 py-3 max-w-[320px]">
                          <p className="text-sm text-gray-800 line-clamp-2" title={r.causeSummary}>
                            {r.causeSummary}
                          </p>
                          {r.stack && (
                            <p className="text-[11px] text-amber-700 mt-1 font-medium">Stack captured</p>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-[180px] truncate font-mono text-xs text-gray-500" title={r.route}>
                          {r.route || '—'}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => openFix(r.crashNo, r)}
                            className="text-xs font-semibold text-white bg-[#1a1a1a] px-3 py-1.5 rounded-lg hover:bg-black"
                          >
                            How to fix
                          </button>
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-[#faf9f7] border-b border-[#eae8e4]">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="grid lg:grid-cols-2 gap-3">
                              <div className="rounded-xl border border-[#eae8e4] bg-white p-3">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Live cause</p>
                                <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{r.causeDetail || '—'}</p>
                                {r.taxonomyReason && r.taxonomyReason !== r.causeDetail && (
                                  <p className="mt-2 text-xs text-gray-500 border-t border-[#eee] pt-2">
                                    <span className="font-semibold">Catalog: </span>{r.taxonomyReason}
                                  </p>
                                )}
                              </div>
                              <div className="rounded-xl border border-[#eae8e4] bg-white p-3 space-y-2 text-xs text-gray-600">
                                {(r.method || r.endpoint) && (
                                  <p><span className="font-semibold text-gray-800">Request: </span>
                                    <span className="font-mono">{r.method ? `${r.method} ` : ''}{r.endpoint || '—'}</span>
                                  </p>
                                )}
                                {(r.httpStatus || r.code || r.status) && (
                                  <p><span className="font-semibold text-gray-800">Status: </span>
                                    {[r.httpStatus || null, r.status, r.code].filter(Boolean).join(' · ')}
                                  </p>
                                )}
                                {r.appVersion && <p><span className="font-semibold text-gray-800">App: </span>{r.appVersion}</p>}
                                {r.signal && <p><span className="font-semibold text-gray-800">Signal: </span><span className="font-mono">{r.signal}</span></p>}
                                {r.ua && <p className="font-mono break-all"><span className="font-semibold text-gray-800 font-sans">UA: </span>{r.ua}</p>}
                              </div>
                              {r.stack && (
                                <div className="lg:col-span-2 rounded-xl border border-amber-200 bg-amber-50/80 p-3">
                                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 mb-2">Stack</p>
                                  <pre className="font-mono text-[11px] text-gray-800 whitespace-pre-wrap break-all max-h-48 overflow-auto">{r.stack}</pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {!filteredLive.length && !loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      No live crashes for this range. Try Last 30 days, or open All types for catalog guidance.
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
          <div className="rounded-2xl border border-[#eae8e4] bg-white p-4 flex flex-wrap gap-3 items-end">
            <label className="text-sm text-gray-600">Area
              <select
                value={catalogSection}
                onChange={(e) => setCatalogSection(e.target.value)}
                className="ml-2 border border-[#eae8e4] rounded-lg px-2 py-1.5 bg-white max-w-[240px]"
              >
                <option value="">All areas</option>
                {CRASH_SECTIONS.map((s) => (
                  <option key={s.num} value={s.num}>{s.num}. {s.title}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-gray-600">Category
              <select
                value={catalogCategory}
                onChange={(e) => setCatalogCategory(e.target.value)}
                className="ml-2 border border-[#eae8e4] rounded-lg px-2 py-1.5 bg-white max-w-[200px]"
              >
                <option value="">All</option>
                {CRASH_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-sm text-gray-600 flex-1 min-w-[180px]">Search
              <input
                value={catalogQ}
                onChange={(e) => setCatalogQ(e.target.value)}
                placeholder="upload, 401, gallery…"
                className="ml-2 border border-[#eae8e4] rounded-lg px-2 py-1.5 w-full"
              />
            </label>
            <button
              type="button"
              onClick={() => { setCatalogCategory(''); setCatalogSection(''); setCatalogQ(''); }}
              className="px-3 py-2 text-sm text-gray-600 border border-[#eae8e4] rounded-xl bg-white"
            >
              Clear
            </button>
            <button type="button" onClick={exportCatalogCsv} className="px-4 py-2 border border-[#eae8e4] rounded-xl text-sm bg-white">CSV</button>
          </div>

          <div className="rounded-2xl border border-[#eae8e4] bg-white overflow-auto max-h-[65vh]">
            <table className="w-full text-sm min-w-[880px]">
              <thead className="sticky top-0 bg-[#faf9f7] z-10">
                <tr className="text-left text-gray-500 border-b border-[#eae8e4]">
                  {['No.', 'Crash type', 'What goes wrong', ''].map((h) => (
                    <th key={h || 'x'} className="px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catalogRows.map((c) => (
                  <tr key={c.no} className="ad-row border-b border-[#f0eee9] last:border-0 hover:bg-[#faf9f7]">
                    <td className="px-4 py-2.5 font-mono font-semibold">{c.no}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{c.category} · {c.sectionTitle}</div>
                    </td>
                    <td className="px-4 py-2.5 max-w-[420px] text-gray-600 line-clamp-2" title={c.reason}>{c.reason}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => openFix(c.no)}
                        className="text-xs font-semibold text-white bg-[#1a1a1a] px-3 py-1.5 rounded-lg hover:bg-black"
                      >
                        How to fix
                      </button>
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
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {CRASH_SECTIONS.map((s) => {
              const peak = Math.max(1, ...CRASH_SECTIONS.map((x) => x.count));
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    setCatalogSection(String(s.num));
                    setCatalogCategory('');
                    setCatalogQ('');
                    setTab('catalog');
                  }}
                  className="text-left rounded-2xl border border-[#eae8e4] bg-white p-4 hover:border-gray-400 transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-mono text-gray-400">§{s.num}</span>
                    <span className="text-xs font-semibold text-gray-700">{s.count} types</span>
                  </div>
                  <p className="font-semibold text-gray-900 mt-1.5 leading-snug">{s.title}</p>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">{s.focus}</p>
                  <div className="mt-3 h-1.5 rounded-full bg-[#efece6] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#1a1a1a]"
                      style={{ width: `${Math.max(8, (s.count / peak) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">IDs {s.idStart}–{s.idEnd}</p>
                </button>
              );
            })}
          </div>
        </>
      )}

      {modal && (
        <FixModal
          crashNo={modal.no}
          live={modal.live}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
