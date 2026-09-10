import React, { useState, useEffect, useRef } from 'react';
import { Search, User, AlertCircle, X, Layers, Send, Pencil, ChevronDown, BookOpen } from 'lucide-react';
import { AppLoader, AppSpinner } from '../../components/ui/AppLoading';
import { supabase } from '../../lib/supabase/client';
import {
  broadcastPhotographerLimitsChanged,
  onPhotographerLimitsBroadcast,
  subscribeAllPhotographers,
} from '../../lib/photographerLiveSync';

function quotaState(used, limit) {
  const cap = Number(limit);
  const u = Number(used) || 0;
  if (cap === -1) return 'disabled';
  if (cap > 0 && u >= cap) return 'exhausted';
  if (cap > 0 && u / cap >= 0.8) return 'warning';
  return 'ok';
}

function QuotaPill({ used, limit }) {
  const cap = Number(limit);
  if (cap === -1) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-200 text-gray-500">OFF</span>;
  const u = Number(used) || 0;
  const st = quotaState(used, limit);
  const text = cap > 0 ? `${u.toLocaleString()} / ${cap.toLocaleString()}` : `${u.toLocaleString()} / ∞`;
  const cls =
    st === 'exhausted' ? 'bg-red-50 text-red-700 border-red-200'
    : st === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>{text}</span>;
}

function MiniBar({ used, limit }) {
  const cap = Number(limit);
  const pct = cap > 0 ? Math.min(100, ((Number(used) || 0) / cap) * 100) : 0;
  const st = quotaState(used, limit);
  const color = st === 'exhausted' ? 'bg-red-400' : st === 'warning' ? 'bg-amber-400' : st === 'disabled' ? 'bg-gray-300' : 'bg-emerald-500';
  return (
    <div className="h-1 w-full rounded-full bg-gray-100 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const NEW_SELECT = 'id, display_name, email, plan, album_limit, album_used_count, delivery_limit, delivery_used_count';
const BASIC_SELECT = 'id, display_name, email, plan';

const isMissingColumnError = (err) => {
  const msg = String(err?.message || '');
  return err?.code === '42703' || /does not exist|album_limit|album_used|delivery_limit|delivery_used/i.test(msg);
};

const initTriState = (limit) => {
  const isDisabled = Number(limit) === -1;
  return {
    enabled: !isDisabled,
    unlimited: !isDisabled && !(Number(limit) > 0),
    value: Number(limit) > 0 ? String(limit) : '',
  };
};

const parseTriState = (enabled, unlimited, raw, label) => {
  if (!enabled) return -1;
  if (unlimited) return 0;
  const v = Math.floor(Number(raw));
  if (!Number.isFinite(v) || v < 1) throw new Error(`Enter a ${label} limit of at least 1, or toggle unlimited.`);
  return v;
};

/** Small emerald on/off switch for quota cards. */
function CardSwitch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-gray-300'}`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-4' : 'left-0.5'}`} />
    </button>
  );
}

/** ∞ Unlimited pill — clearer than a bare checkbox. */
function UnlimitedPill({ unlimited, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!unlimited)}
      aria-pressed={unlimited}
      title="Toggle unlimited"
      className={`inline-flex shrink-0 items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${unlimited ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
    >
      <span className="text-sm leading-none">∞</span>
      {unlimited ? 'Unlimited' : 'Limited'}
    </button>
  );
}

/** Segmented 1 / Multiple / ∞ picker for creation limits. */
function LimitSegmented({ unlimited, limitValue, onPickOne, onPickMultiple, onPickUnlimited }) {
  const isOne = !unlimited && limitValue === '1';
  const isMultiple = !unlimited && Number(limitValue) > 1;
  const btn = (active) =>
    `flex-1 px-2 py-1.5 text-[11px] rounded-lg font-semibold transition-all ${active ? 'bg-white text-[#1a1a1a] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`;
  return (
    <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
      <button type="button" onClick={onPickOne} className={btn(isOne)}>1</button>
      <button type="button" onClick={onPickMultiple} className={btn(isMultiple)}>Multiple</button>
      <button type="button" onClick={onPickUnlimited} className={btn(unlimited)}>∞</button>
    </div>
  );
}

/** One creation-limit quota card (albums or deliveries). */
function CreationLimitCard({
  icon, title, created, enabled, onEnabledChange, unlimited, onUnlimitedChange,
  limit, onLimitChange, placeholder, onPickOne, onPickMultiple, used, inactiveNote,
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        <CardSwitch checked={enabled} onChange={onEnabledChange} label={title} />
        <span className="flex w-8 h-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-gray-800 leading-tight">{title}</p>
          <p className="text-[11px] text-gray-400">Created {Number(created || 0).toLocaleString()}</p>
        </div>
        {enabled && <UnlimitedPill unlimited={unlimited} onChange={onUnlimitedChange} />}
      </div>
      <div className="mt-3">
        {enabled ? (
          <>
            <LimitSegmented
              unlimited={unlimited}
              limitValue={limit}
              onPickOne={onPickOne}
              onPickMultiple={onPickMultiple}
              onPickUnlimited={() => { onUnlimitedChange(true); onLimitChange(''); }}
            />
            {unlimited ? (
              <div className="mt-2.5 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700">
                <span className="text-lg leading-none font-bold">∞</span>
                <span className="text-[13px] font-semibold">Unlimited</span>
                <span className="ml-auto text-[11px] font-normal text-emerald-600">no cap on creation</span>
              </div>
            ) : (
              <>
                <label className="mt-2.5 block text-[11px] font-medium text-gray-500 mb-1.5">Max allowed</label>
                <input type="number" min="1" step="1" value={limit} onChange={(e) => onLimitChange(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-[#1a1a1a] transition-all" placeholder={placeholder} />
                {Number(limit) > 0 && (
                  <div className="mt-2.5">
                    <MiniBar used={used} limit={Number(limit)} />
                    <p className="mt-1 text-[11px] text-gray-400">
                      {Number(used || 0).toLocaleString()} of {Number(limit).toLocaleString()} used
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <p className="text-[11px] font-medium text-gray-500 bg-gray-100 rounded-xl px-3 py-2.5">{inactiveNote}</p>
        )}
      </div>
    </div>
  );
}

function formatDateMed(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function deliveryTone(status) {
  const s = String(status || 'draft').toLowerCase();
  if (s === 'published') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (s === 'archived' || s === 'hidden') return 'bg-gray-100 text-gray-500 border-gray-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

function deliveryLabel(status) {
  const s = String(status || 'draft').toLowerCase();
  if (s === 'published') return 'Published';
  if (s === 'archived' || s === 'hidden') return 'Hidden';
  return 'Draft';
}

function albumTone(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('approv') || s === 'published' || s === 'live') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (s.includes('draft')) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-gray-100 text-gray-500 border-gray-200';
}

function albumLabel(status) {
  const s = String(status || '').trim();
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const AdminUsageManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [migrationWarning, setMigrationWarning] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [editingUser, setEditingUser] = useState(null);
  const [albumEnabled, setAlbumEnabled] = useState(true);
  const [albumLimit, setAlbumLimit] = useState('');
  const [albumUnlimited, setAlbumUnlimited] = useState(true);
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [deliveryLimit, setDeliveryLimit] = useState('');
  const [deliveryUnlimited, setDeliveryUnlimited] = useState(true);
  const [updating, setUpdating] = useState(false);
  // Expanded row -> { albums, deliveries, loading, error, loaded }
  const [expandedId, setExpandedId] = useState(null);
  const [detailsByUser, setDetailsByUser] = useState({});

  const toggleExpand = async (user) => {
    if (expandedId === user.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(user.id);
    if (detailsByUser[user.id]?.loaded) return;
    setDetailsByUser((prev) => ({ ...prev, [user.id]: { ...(prev[user.id] || {}), loading: true, error: null } }));
    try {
      const [albumsRes, deliveriesRes] = await Promise.all([
        supabase
          .from('album_proofer_albums')
          .select('id, name, status, created_at, event_date')
          .eq('photographer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('deliveries')
          .select('id, name, slug, status, created_at')
          .eq('photographer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100),
      ]);
      const albumError = albumsRes.error && albumsRes.error.code !== 'PGRST116' ? albumsRes.error : null;
      if (deliveriesRes.error) throw deliveriesRes.error;
      setDetailsByUser((prev) => ({
        ...prev,
        [user.id]: {
          albums: albumsRes.data || [],
          albumsUnavailable: Boolean(albumError),
          deliveries: deliveriesRes.data || [],
          loading: false,
          error: null,
          loaded: true,
        },
      }));
    } catch (err) {
      setDetailsByUser((prev) => ({
        ...prev,
        [user.id]: { albums: [], deliveries: [], loading: false, error: err.message || 'Failed to load items.', loaded: false },
      }));
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    setMigrationWarning(null);
    try {
      const res = await supabase.from('photographers').select(NEW_SELECT).order('created_at', { ascending: false });
      if (!res.error) {
        const mapped = (res.data || []).map((p) => ({
          id: p.id,
          name: p.display_name || 'Unnamed',
          email: p.email,
          plan: p.plan || 'Free',
          albumUsed: Number(p.album_used_count) || 0,
          albumLimit: p.album_limit != null ? Number(p.album_limit) : 0,
          deliveryUsed: Number(p.delivery_used_count) || 0,
          deliveryLimit: p.delivery_limit != null ? Number(p.delivery_limit) : 0,
        }));
        setUsers(mapped);
        return;
      }
      if (!isMissingColumnError(res.error)) throw res.error;

      // Migration pending — fall back to live counts per photographer.
      setMigrationWarning('Database migration pending: run supabase/migrations/20260912000000_album_delivery_creation_limits.sql in Supabase SQL Editor. Showing live counts with unlimited limits.');
      const basic = await supabase.from('photographers').select(BASIC_SELECT).order('created_at', { ascending: false });
      if (basic.error) throw basic.error;
      const rows = basic.data || [];
      const mapped = await Promise.all(
        rows.map(async (p) => {
          let albums = 0;
          let deliveries = 0;
          try {
            const a = await supabase.from('album_proofer_albums').select('id', { count: 'exact', head: true }).eq('photographer_id', p.id);
            if (!a.error && typeof a.count === 'number') albums = a.count;
          } catch { /* ignore */ }
          try {
            const d = await supabase.from('deliveries').select('id', { count: 'exact', head: true }).eq('photographer_id', p.id);
            if (!d.error && typeof d.count === 'number') deliveries = d.count;
          } catch { /* ignore */ }
          return {
            id: p.id,
            name: p.display_name || 'Unnamed',
            email: p.email,
            plan: p.plan || 'Free',
            albumUsed: albums,
            albumLimit: 0,
            deliveryUsed: deliveries,
            deliveryLimit: 0,
          };
        })
      );
      setUsers(mapped);
    } catch (err) {
      console.error('Error fetching usage:', err);
      setError(err.message || 'Failed to load usage.');
    } finally {
      setLoading(false);
    }
  };

  // Ref so the live subscription always calls the latest fetch without re-subscribing.
  const fetchUsersRef = useRef(fetchUsers);
  fetchUsersRef.current = fetchUsers;

  useEffect(() => {
    fetchUsersRef.current();
    // Instant sync both directions (see AdminUserManagement): debounced because
    // bulk uploads fire one photographers UPDATE per photo.
    let timer = null;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => fetchUsersRef.current(), 1200);
    };
    const offLive = subscribeAllPhotographers(schedule);
    const offBroadcast = onPhotographerLimitsBroadcast(null, schedule);
    return () => {
      clearTimeout(timer);
      offLive();
      offBroadcast();
    };
  }, []);

  const openEditor = (user) => {
    setEditingUser(user);
    const a = initTriState(user.albumLimit);
    setAlbumEnabled(a.enabled);
    setAlbumUnlimited(a.unlimited);
    setAlbumLimit(a.value);
    const d = initTriState(user.deliveryLimit);
    setDeliveryEnabled(d.enabled);
    setDeliveryUnlimited(d.unlimited);
    setDeliveryLimit(d.value);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setUpdating(true);
    try {
      const parsedAlbum = parseTriState(albumEnabled, albumUnlimited, albumLimit, 'album');
      const parsedDelivery = parseTriState(deliveryEnabled, deliveryUnlimited, deliveryLimit, 'delivery');
      const { error: updateError } = await supabase
        .from('photographers')
        .update({ album_limit: parsedAlbum, delivery_limit: parsedDelivery })
        .eq('id', editingUser.id);
      if (updateError) {
        if (isMissingColumnError(updateError)) {
          throw new Error('Migration missing: run 20260912000000_album_delivery_creation_limits.sql in Supabase SQL Editor first.');
        }
        throw updateError;
      }
      setEditingUser(null);
      fetchUsers();
      // Instant admin -> photographer (and admin -> admin tabs).
      broadcastPhotographerLimitsChanged(editingUser.id);
    } catch (err) {
      alert(err.message || 'Failed to update limits.');
    } finally {
      setUpdating(false);
    }
  };

  const capStateOf = (used, limit) => {
    const cap = Number(limit);
    if (cap === -1) return 'disabled';
    if (cap > 0 && Number(used || 0) >= cap) return 'at-limit';
    return 'ok';
  };
  const isBlocked = (used, limit) => capStateOf(used, limit) !== 'ok';

  const planOptions = [...new Set(users.map((u) => u.plan || 'Free'))];

  const filtered = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    if (q && !(u.name.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))) return false;
    if (planFilter !== 'all' && (u.plan || 'Free') !== planFilter) return false;
    if (statusFilter === 'blocked' && !(isBlocked(u.albumUsed, u.albumLimit) || isBlocked(u.deliveryUsed, u.deliveryLimit))) return false;
    if (statusFilter === 'albums-blocked' && !isBlocked(u.albumUsed, u.albumLimit)) return false;
    if (statusFilter === 'deliveries-blocked' && !isBlocked(u.deliveryUsed, u.deliveryLimit)) return false;
    return true;
  });

  const filtersActive = Boolean(searchQuery) || planFilter !== 'all' || statusFilter !== 'all';
  const clearFilters = () => {
    setSearchQuery('');
    setPlanFilter('all');
    setStatusFilter('all');
  };
  const totalAlbums = users.reduce((s, u) => s + (Number(u.albumUsed) || 0), 0);
  const totalDeliveries = users.reduce((s, u) => s + (Number(u.deliveryUsed) || 0), 0);
  const atLimit = users.filter((u) => {
    const aCap = Number(u.albumLimit);
    const dCap = Number(u.deliveryLimit);
    return (aCap === -1 || (aCap > 0 && u.albumUsed >= aCap)) || (dCap === -1 || (dCap > 0 && u.deliveryUsed >= dCap));
  }).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-serif uppercase">Albums &amp; Deliveries</h1>
        <p className="text-gray-500 mt-1 text-sm">See how many albums and deliveries each photographer created — and set creation limits.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#fdfdfc] p-5 rounded-2xl shadow-sm border border-[#eae8e4]">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 inline-flex items-center gap-2">
            <span className="flex w-7 h-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><Layers className="w-3.5 h-3.5" /></span>Total albums
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-3">{loading ? '—' : totalAlbums.toLocaleString()}</p>
          <p className="text-[11px] text-gray-400 mt-1">across {loading ? '—' : users.length.toLocaleString()} photographers</p>
        </div>
        <div className="bg-[#fdfdfc] p-5 rounded-2xl shadow-sm border border-[#eae8e4]">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 inline-flex items-center gap-2">
            <span className="flex w-7 h-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700"><Send className="w-3.5 h-3.5" /></span>Total deliveries
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-3">{loading ? '—' : totalDeliveries.toLocaleString()}</p>
          <p className="text-[11px] text-gray-400 mt-1">client galleries shipped</p>
        </div>
        <div className="bg-[#fdfdfc] p-5 rounded-2xl shadow-sm border border-[#eae8e4]">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Content mix</p>
          {loading ? (
            <p className="text-3xl font-bold text-gray-900 mt-3">—</p>
          ) : (totalAlbums + totalDeliveries) === 0 ? (
            <p className="text-sm text-gray-400 mt-3">No content yet.</p>
          ) : (
            <div className="flex items-center gap-3 mt-3">
              <span
                className="w-12 h-12 shrink-0 rounded-full"
                role="img"
                aria-label={`${totalAlbums} albums, ${totalDeliveries} deliveries`}
                style={{
                  background: `conic-gradient(#10b981 0 ${(totalAlbums / (totalAlbums + totalDeliveries)) * 100}%, #3b82f6 ${(totalAlbums / (totalAlbums + totalDeliveries)) * 100}% 100%)`,
                  mask: 'radial-gradient(circle, transparent 55%, black 56%)',
                  WebkitMask: 'radial-gradient(circle, transparent 55%, black 56%)',
                }}
              />
              <div className="min-w-0 space-y-1 text-[11px]">
                <p className="flex items-center gap-1.5 text-gray-600"><span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />Albums · <strong className="text-gray-900">{totalAlbums.toLocaleString()}</strong></p>
                <p className="flex items-center gap-1.5 text-gray-600"><span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />Deliveries · <strong className="text-gray-900">{totalDeliveries.toLocaleString()}</strong></p>
              </div>
            </div>
          )}
        </div>
        <div className="bg-[#fdfdfc] p-5 rounded-2xl shadow-sm border border-[#eae8e4]">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 inline-flex items-center gap-2">
            <span className={`flex w-7 h-7 items-center justify-center rounded-lg ${!loading && atLimit > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}><AlertCircle className="w-3.5 h-3.5" /></span>At limit / disabled
          </p>
          <p className={`text-3xl font-bold mt-3 ${!loading && atLimit > 0 ? 'text-red-700' : 'text-gray-900'}`}>{loading ? '—' : atLimit.toLocaleString()}</p>
          <p className="text-[11px] text-gray-400 mt-1">0 / NULL = unlimited · −1 = cannot create</p>
        </div>
      </div>

      <div className="bg-[#fdfdfc] p-4 rounded-2xl shadow-sm border border-[#eae8e4] space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search photographers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#f8f7f4] border border-[#eae8e4] rounded-xl text-sm outline-none focus:border-[#1a1a1a] focus:bg-white transition-all"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              aria-label="Filter by plan"
              className="px-3 py-2 bg-[#f8f7f4] border border-[#eae8e4] rounded-xl text-sm outline-none focus:border-[#1a1a1a] focus:bg-white transition-all"
            >
              <option value="all">All plans</option>
              {planOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by creation status"
              className="px-3 py-2 bg-[#f8f7f4] border border-[#eae8e4] rounded-xl text-sm outline-none focus:border-[#1a1a1a] focus:bg-white transition-all"
            >
              <option value="all">All statuses</option>
              <option value="blocked">At limit / disabled</option>
              <option value="albums-blocked">Albums blocked</option>
              <option value="deliveries-blocked">Deliveries blocked</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Showing <span className="font-semibold text-gray-800">{filtered.length}</span> of <span className="font-semibold text-gray-800">{users.length}</span> photographers
          </p>
          {filtersActive && (
            <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors">
              <X className="w-3.5 h-3.5" />Clear filters
            </button>
          )}
        </div>
      </div>

      {migrationWarning && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-amber-800 text-sm">{migrationWarning}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {!error && loading && <AppLoader label="Loading usage" variant="page-short" />}

      {!error && !loading && (
        <div className="bg-[#fdfdfc] rounded-2xl shadow-sm border border-[#eae8e4] overflow-hidden">
          <div className="overflow-hidden">
            <table className="w-full text-left text-sm" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-[#f9f8f5]/85 border-b border-[#eae8e4]">
                <tr>
                  <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider" style={{ width: '34%' }}>Photographer</th>
                  <th className="px-4 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider" style={{ width: '28%' }}>
                    <span className="inline-flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" />Albums</span>
                    <span className="block text-[10px] font-normal normal-case text-gray-400 mt-0.5">created / limit</span>
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider" style={{ width: '28%' }}>
                    <span className="inline-flex items-center gap-1.5"><Send className="w-3.5 h-3.5" />Deliveries</span>
                    <span className="block text-[10px] font-normal normal-case text-gray-400 mt-0.5">created / limit</span>
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right" style={{ width: '10%' }}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <p className="text-gray-500">{filtersActive ? 'No photographers match the current filters.' : 'No photographers found.'}</p>
                      {filtersActive && (
                        <button type="button" onClick={clearFilters} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#1a1a1a] text-white rounded-lg hover:bg-black transition-colors">
                          <X className="w-3.5 h-3.5" />Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => {
                    const expanded = expandedId === u.id;
                    const detail = detailsByUser[u.id] || {};
                    return (
                      <React.Fragment key={u.id}>
                      <tr className={`transition-colors align-top ${expanded ? 'bg-[#f8f7f4]/70' : 'hover:bg-[#f8f7f4]/60'}`}>
                      <td className="px-5 py-4 min-w-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#1a1a1a] text-white shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{u.name}</p>
                            <p className="text-gray-500 text-xs truncate">{u.email}</p>
                            <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 capitalize">{u.plan}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[11px] font-medium text-gray-500">Albums</span>
                          <QuotaPill used={u.albumUsed} limit={u.albumLimit} />
                        </div>
                        <MiniBar used={u.albumUsed} limit={u.albumLimit} />
                      </td>
                      <td className="px-4 py-4 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[11px] font-medium text-gray-500">Deliveries</span>
                          <QuotaPill used={u.deliveryUsed} limit={u.deliveryLimit} />
                        </div>
                        <MiniBar used={u.deliveryUsed} limit={u.deliveryLimit} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleExpand(u)}
                            title={expanded ? 'Hide albums & deliveries' : 'Show album & delivery names'}
                            aria-expanded={expanded}
                            className={`p-2 rounded-lg transition-colors ${expanded ? 'bg-[#1a1a1a] text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                          </button>
                          <button onClick={() => openEditor(u)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#1a1a1a] text-white rounded-lg hover:bg-black transition-colors">
                            <Pencil className="w-3.5 h-3.5" />Edit
                          </button>
                        </div>
                      </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-[#f8f7f4]/50">
                          <td colSpan="4" className="px-5 pb-5 pt-1">
                            {detail.loading ? (
                              <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
                                <AppSpinner size="xs" />Loading albums &amp; deliveries…
                              </div>
                            ) : detail.error ? (
                              <p className="py-3 text-sm text-red-600">{detail.error}</p>
                            ) : (
                              <div className="grid md:grid-cols-2 gap-4">
                                <div className="rounded-xl border border-[#eae8e4] bg-white overflow-hidden">
                                  <div className="flex items-center gap-2 px-4 py-2.5 bg-[#f9f8f5]/80 border-b border-[#eae8e4]">
                                    <BookOpen className="w-3.5 h-3.5 text-gray-500" />
                                    <p className="text-xs font-semibold text-gray-700">Albums · {(detail.albums || []).length}</p>
                                  </div>
                                  <ul className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                                    {(detail.albums || []).length === 0 ? (
                                      <li className="px-4 py-4 text-[13px] text-gray-400">
                                        {detail.albumsUnavailable ? 'Album data unavailable.' : 'No albums yet.'}
                                      </li>
                                    ) : (
                                      detail.albums.map((a) => (
                                        <li key={a.id} className="flex items-center gap-2.5 px-4 py-2.5">
                                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${albumTone(a.status)}`}>{albumLabel(a.status)}</span>
                                          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-gray-800" title={a.name || 'Untitled'}>{a.name || 'Untitled album'}</span>
                                          <span className="shrink-0 text-[11px] text-gray-400">{formatDateMed(a.created_at)}</span>
                                        </li>
                                      ))
                                    )}
                                  </ul>
                                </div>
                                <div className="rounded-xl border border-[#eae8e4] bg-white overflow-hidden">
                                  <div className="flex items-center gap-2 px-4 py-2.5 bg-[#f9f8f5]/80 border-b border-[#eae8e4]">
                                    <Send className="w-3.5 h-3.5 text-gray-500" />
                                    <p className="text-xs font-semibold text-gray-700">Deliveries · {(detail.deliveries || []).length}</p>
                                  </div>
                                  <ul className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                                    {(detail.deliveries || []).length === 0 ? (
                                      <li className="px-4 py-4 text-[13px] text-gray-400">No deliveries yet.</li>
                                    ) : (
                                      detail.deliveries.map((d) => (
                                        <li key={d.id} className="flex items-center gap-2.5 px-4 py-2.5">
                                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${deliveryTone(d.status)}`}>{deliveryLabel(d.status)}</span>
                                          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-gray-800" title={d.name || d.slug || 'Untitled'}>{d.name || d.slug || 'Untitled delivery'}</span>
                                          <span className="shrink-0 text-[11px] text-gray-400">{formatDateMed(d.created_at)}</span>
                                        </li>
                                      ))
                                    )}
                                  </ul>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#eae8e4] overflow-hidden flex flex-col" style={{ maxHeight: '88vh' }}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center font-semibold shrink-0">
                {(editingUser.name || editingUser.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-[#1a1a1a] leading-tight">Creation limits</h3>
                <p className="text-xs text-gray-500 truncate">{editingUser.name} · {editingUser.email}</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col min-h-0">
              <div className="px-5 py-4 space-y-3 flex-1 min-h-0 overflow-y-auto">
                <CreationLimitCard
                  icon={<Layers className="w-4 h-4" />}
                  title="Albums"
                  created={editingUser.albumUsed}
                  enabled={albumEnabled}
                  onEnabledChange={setAlbumEnabled}
                  unlimited={albumUnlimited}
                  onUnlimitedChange={setAlbumUnlimited}
                  limit={albumLimit}
                  onLimitChange={setAlbumLimit}
                  placeholder="e.g. 10"
                  used={editingUser.albumUsed}
                  inactiveNote="Cannot create new albums"
                  onPickOne={() => { setAlbumUnlimited(false); setAlbumLimit('1'); }}
                  onPickMultiple={() => { setAlbumUnlimited(false); if (albumLimit === '1' || !albumLimit) setAlbumLimit('5'); }}
                />
                <CreationLimitCard
                  icon={<Send className="w-4 h-4" />}
                  title="Deliveries"
                  created={editingUser.deliveryUsed}
                  enabled={deliveryEnabled}
                  onEnabledChange={setDeliveryEnabled}
                  unlimited={deliveryUnlimited}
                  onUnlimitedChange={setDeliveryUnlimited}
                  limit={deliveryLimit}
                  onLimitChange={setDeliveryLimit}
                  placeholder="e.g. 10"
                  used={editingUser.deliveryUsed}
                  inactiveNote="Cannot create new deliveries"
                  onPickOne={() => { setDeliveryUnlimited(false); setDeliveryLimit('1'); }}
                  onPickMultiple={() => { setDeliveryUnlimited(false); if (deliveryLimit === '1' || !deliveryLimit) setDeliveryLimit('5'); }}
                />
                <p className="text-[11px] text-gray-400">Toggle off = cannot create new · ∞ = unlimited · number = max allowed. Usage counts update automatically.</p>
              </div>

              <div className="px-5 py-4 flex items-center justify-end gap-2.5 border-t border-gray-100 shrink-0 bg-gray-50/60">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 border border-gray-200 bg-white text-gray-700 text-[13px] font-semibold rounded-xl hover:bg-gray-100">Cancel</button>
                <button type="submit" disabled={updating} className="px-5 py-2 bg-[#1a1a1a] text-white text-[13px] font-semibold rounded-xl hover:bg-black disabled:opacity-60 flex items-center gap-2">
                  {updating && <AppSpinner size="xs" />}Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsageManagement;
