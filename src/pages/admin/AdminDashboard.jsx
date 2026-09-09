import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase/client';
import { AppSpinner } from '../../components/ui/AppLoading';
import {
  onPhotographerLimitsBroadcast,
  subscribeAllPhotographers,
} from '../../lib/photographerLiveSync';

const formatBytes = (bytes) => {
  if (!bytes || bytes <= 0) return '0 MB';
  const tb = 1024 * 1024 * 1024 * 1024;
  const gb = 1024 * 1024 * 1024;
  const mb = 1024 * 1024;
  if (bytes >= tb) return `${(bytes / tb).toFixed(2)} TB`;
  if (bytes >= gb) return `${(bytes / gb).toFixed(2)} GB`;
  return `${(bytes / mb).toFixed(1)} MB`;
};

const FULL_SELECT = [
  'id', 'display_name', 'email', 'plan', 'storage_used_bytes',
  'album_limit', 'album_used_count', 'delivery_limit', 'delivery_used_count',
  'face_normal_image_limit', 'face_normal_image_used',
  'face_guest_image_limit', 'face_guest_image_used',
  'face_normal_delivery_limit', 'face_normal_delivery_used',
  'face_guest_delivery_limit', 'face_guest_delivery_used',
  'face_normal_enabled', 'face_guest_enabled', 'ai_search_enabled',
].join(', ');
const BASIC_SELECT = 'id, display_name, email, plan, storage_used_bytes';

const isMissingColumnError = (err) => {
  const msg = String(err?.message || '');
  return err?.code === '42703' || /does not exist/i.test(msg);
};

const num = (v) => Number(v) || 0;
const isCapped = (limit) => Number(limit) > 0;
const isDisabledCap = (limit) => Number(limit) === -1;

function quotaPairsOf(p) {
  return [
    [p.face_normal_image_used, p.face_normal_image_limit],
    [p.face_guest_image_used, p.face_guest_image_limit],
    [p.face_normal_delivery_used, p.face_normal_delivery_limit],
    [p.face_guest_delivery_used, p.face_guest_delivery_limit],
  ];
}

function isAtLimit(p) {
  return quotaPairsOf(p).some(([used, limit]) => isCapped(limit) && num(used) >= Number(limit));
}

function isDisabled(p) {
  return (
    p.face_normal_enabled === false ||
    p.face_guest_enabled === false ||
    quotaPairsOf(p).some(([, limit]) => isDisabledCap(limit))
  );
}

function blockReason(p) {
  const reasons = [];
  if (p.face_normal_enabled === false) reasons.push('Find People off');
  if (p.face_guest_enabled === false) reasons.push('Guest matching off');
  if (p.ai_search_enabled === false) reasons.push('Library off');
  const labels = ['Normal images', 'Guest images', 'Normal deliveries', 'Guest deliveries'];
  quotaPairsOf(p).forEach(([used, limit], i) => {
    if (isDisabledCap(limit)) reasons.push(`${labels[i]} disabled`);
    else if (isCapped(limit) && num(used) >= Number(limit)) reasons.push(`${labels[i]} at limit`);
  });
  if (isCapped(p.album_limit) && num(p.album_used_count) >= Number(p.album_limit)) reasons.push('Albums at limit');
  if (isDisabledCap(p.album_limit)) reasons.push('Albums disabled');
  if (isCapped(p.delivery_limit) && num(p.delivery_used_count) >= Number(p.delivery_limit)) reasons.push('Deliveries at limit');
  if (isDisabledCap(p.delivery_limit)) reasons.push('Deliveries disabled');
  return reasons;
}

function StatCard({ label, value, sub, loading, to, tone }) {
  const inner = (
    <>
      <h3 className="text-sm font-medium text-gray-500">{label}</h3>
      <p className={`text-3xl font-bold mt-4 ${tone || 'text-gray-900'}`}>
        {loading ? <AppSpinner size="sm" /> : value}
      </p>
      {sub ? <p className="text-[11px] text-gray-400 mt-1">{sub}</p> : null}
    </>
  );
  const cls =
    'bg-[#fdfdfc] p-6 rounded-2xl shadow-sm border border-[#eae8e4] flex flex-col justify-between min-h-[130px]';
  return to ? (
    <Link to={to} className={`${cls} transition-shadow hover:shadow`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{children}</div>
    </section>
  );
}

const AdminDashboard = () => {
  const [rows, setRows] = useState([]);
  const [deliveryCount, setDeliveryCount] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      const [photographersRes, deliveriesRes] = await Promise.all([
        supabase.from('photographers').select(FULL_SELECT),
        supabase.from('deliveries').select('*', { count: 'exact', head: true }),
      ]);
      let list = photographersRes.data || [];
      if (photographersRes.error) {
        if (!isMissingColumnError(photographersRes.error)) throw photographersRes.error;
        // Quota columns not migrated yet — show platform stats only.
        const basic = await supabase.from('photographers').select(BASIC_SELECT);
        if (basic.error) throw basic.error;
        list = basic.data || [];
      }
      setRows(list);
      setDeliveryCount(deliveriesRes.count ?? 0);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    }
  };

  const loadRef = useRef(loadStats);
  loadRef.current = loadStats;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    loadRef.current().finally(() => {
      if (isMounted) setLoading(false);
    });
    // Live overview: photographer uploads / admin saves update the numbers.
    // Debounced — bulk uploads fire one photographers UPDATE per photo.
    let timer = null;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => loadRef.current(), 1500);
    };
    const offLive = subscribeAllPhotographers(schedule);
    const offBroadcast = onPhotographerLimitsBroadcast(null, schedule);
    return () => {
      isMounted = false;
      clearTimeout(timer);
      offLive();
      offBroadcast();
    };
  }, []);

  const sum = (key) => rows.reduce((s, p) => s + num(p[key]), 0);
  const storageUsed = rows.reduce((s, p) => s + num(p.storage_used_bytes), 0);
  const atLimitRows = rows.filter(
    (p) =>
      isAtLimit(p) ||
      isDisabled(p) ||
      (isCapped(p.album_limit) && num(p.album_used_count) >= Number(p.album_limit)) ||
      isDisabledCap(p.album_limit) ||
      (isCapped(p.delivery_limit) && num(p.delivery_used_count) >= Number(p.delivery_limit)) ||
      isDisabledCap(p.delivery_limit)
  );
  const needsAttention = rows
    .map((p) => ({ p, reasons: blockReason(p) }))
    .filter((r) => r.reasons.length > 0)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-serif uppercase">Overview</h1>
        <p className="text-gray-500 mt-1">Welcome to the PIXNXT administrative control panel.</p>
      </div>

      <Section title="Platform">
        <StatCard label="Total Photographers" value={loading ? '---' : rows.length.toLocaleString()} loading={loading} to="/admin/users" />
        <StatCard label="Active Deliveries" value={loading ? '---' : (deliveryCount ?? 0).toLocaleString()} loading={loading} to="/admin/usage" />
        <StatCard label="Storage Used" value={loading ? '---' : formatBytes(storageUsed)} loading={loading} />
      </Section>

      <Section title="Creation quotas">
        <StatCard
          label="Albums Created"
          value={loading ? '---' : sum('album_used_count').toLocaleString()}
          loading={loading}
          to="/admin/usage"
        />
        <StatCard
          label="Deliveries Created"
          value={loading ? '---' : sum('delivery_used_count').toLocaleString()}
          loading={loading}
          to="/admin/usage"
        />
        <StatCard
          label="At Limit / Disabled"
          value={loading ? '---' : atLimitRows.length.toLocaleString()}
          sub="0 / NULL = unlimited · −1 = cannot create"
          loading={loading}
          to="/admin/usage"
          tone={atLimitRows.length > 0 ? 'text-red-700' : 'text-gray-900'}
        />
      </Section>

      <Section title="Face AI usage">
        <StatCard label="Normal Images Used" value={loading ? '---' : sum('face_normal_image_used').toLocaleString()} loading={loading} to="/admin/users" sub="Find People scans" />
        <StatCard label="Guest Images Used" value={loading ? '---' : sum('face_guest_image_used').toLocaleString()} loading={loading} to="/admin/users" sub="Guest face matching scans" />
        <StatCard
          label="Face Deliveries Used"
          value={loading ? '---' : (sum('face_normal_delivery_used') + sum('face_guest_delivery_used')).toLocaleString()}
          loading={loading}
          to="/admin/users"
          sub={`Normal ${sum('face_normal_delivery_used').toLocaleString()} · Guest ${sum('face_guest_delivery_used').toLocaleString()}`}
        />
      </Section>

      <Section title="Features">
        <StatCard
          label="Library Off"
          value={loading ? '---' : rows.filter((p) => p.ai_search_enabled === false).length.toLocaleString()}
          loading={loading}
          to="/admin/users"
          sub="AI search disabled"
        />
        <StatCard
          label="Find People Off"
          value={loading ? '---' : rows.filter((p) => p.face_normal_enabled === false).length.toLocaleString()}
          loading={loading}
          to="/admin/users"
          sub="Normal delivery feature"
        />
        <StatCard
          label="Guest Matching Off"
          value={loading ? '---' : rows.filter((p) => p.face_guest_enabled === false).length.toLocaleString()}
          loading={loading}
          to="/admin/users"
          sub="Guest delivery feature"
        />
      </Section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Needs attention</h2>
        <div className="bg-[#fdfdfc] rounded-2xl shadow-sm border border-[#eae8e4] overflow-hidden">
          {loading ? (
            <div className="px-6 py-8 flex justify-center">
              <AppSpinner size="sm" />
            </div>
          ) : needsAttention.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-gray-500">All clear — no photographer is at a limit or disabled.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {needsAttention.map(({ p, reasons }) => (
                <li key={p.id}>
                  <Link to="/admin/users" className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#f8f7f4]/60 transition-colors">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#1a1a1a] text-white shrink-0 text-sm font-semibold">
                      {(p.display_name || p.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm truncate">{p.display_name || 'Unnamed'}</p>
                      <p className="text-gray-500 text-xs truncate">{reasons.join(' · ')}</p>
                    </div>
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                      Review
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
