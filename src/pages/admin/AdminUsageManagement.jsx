import React, { useState, useEffect, useRef } from 'react';
import { Search, User, AlertCircle, X, Layers, Send, Pencil, ChevronDown, BookOpen } from 'lucide-react';
import { AppLoader, AppSpinner } from '../../components/ui/AppLoading';
import { apiFetch } from '../../lib/api/client';
import {
  broadcastPhotographerLimitsChanged,
  onPhotographerLimitsBroadcast,
  subscribeAllPhotographers,
} from '../../lib/photographerLiveSync';
import {
  AdminModal,
  AdminModalActions,
  AdminPageHeader,
  AdminStatCard,
} from '../../components/admin/AdminUi';

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
  if (cap === -1) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--ad-sunk)] ad-muted-text">Off</span>;
  const u = Number(used) || 0;
  const st = quotaState(used, limit);
  const text = cap > 0 ? `${u.toLocaleString()} / ${cap.toLocaleString()}` : `${u.toLocaleString()} / ∞`;
  const cls =
    st === 'exhausted'
      ? 'bg-[var(--ad-bad-bg)] text-[var(--ad-bad)] border-[color-mix(in_srgb,var(--ad-bad)_35%,var(--ad-line))]'
    : st === 'warning'
      ? 'bg-[var(--ad-warn-bg)] text-[var(--ad-warn)] border-[color-mix(in_srgb,var(--ad-warn)_35%,var(--ad-line))]'
    : 'bg-[var(--ad-ok-bg)] text-[var(--ad-ok)] border-[color-mix(in_srgb,var(--ad-ok)_35%,var(--ad-line))]';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>{text}</span>;
}

function MiniBar({ used, limit }) {
  const cap = Number(limit);
  const pct = cap > 0 ? Math.min(100, ((Number(used) || 0) / cap) * 100) : 0;
  const st = quotaState(used, limit);
  const color =
    st === 'exhausted' ? 'bg-[var(--ad-bad)]'
    : st === 'warning' ? 'bg-[var(--ad-warn)]'
    : st === 'disabled' ? 'bg-[var(--ad-meter-track)]'
    : 'bg-[var(--ad-ok)]';
  return (
    <div className="h-1 w-full rounded-full bg-[var(--ad-meter-track)] overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

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

const unlimitedBannerClass =
  'flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--ad-ok-bg)] border border-[color-mix(in_srgb,var(--ad-ok)_25%,var(--ad-line))] text-[var(--ad-ok)]';

const quotaInputClass =
  'ad-input w-full px-3 py-2 ad-sunk border border-[var(--ad-line)] rounded-xl text-sm outline-none';

/** Small on/off switch for quota cards. */
function CardSwitch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-on={checked ? 'true' : 'false'}
      onClick={() => onChange(!checked)}
      className="ad-toggle"
    >
      <span className="ad-toggle-thumb" />
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
      className={`inline-flex shrink-0 items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${unlimited ? 'bg-[var(--ad-ok-bg)] text-[var(--ad-ok)]' : 'bg-[var(--ad-sunk)] ad-muted-text hover:opacity-90'}`}
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
    `flex-1 px-2 py-1.5 text-[11px] rounded-lg font-semibold transition-all ${active ? 'bg-[var(--ad-card)] ad-ink shadow-sm' : 'ad-muted-text hover:text-[var(--ad-ink)]'}`;
  return (
    <div className="flex gap-1 p-1 ad-sunk rounded-xl">
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
    <div className="ad-card rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        <CardSwitch checked={enabled} onChange={onEnabledChange} label={title} />
        <span className="flex w-8 h-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ad-sunk)] ad-muted-text">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold ad-ink leading-tight">{title}</p>
          <p className="text-[11px] ad-faint-text">Created {Number(created || 0).toLocaleString()}</p>
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
              <div className={`mt-2.5 ${unlimitedBannerClass}`}>
                <span className="text-lg leading-none font-bold">∞</span>
                <span className="text-[13px] font-semibold">Unlimited</span>
                <span className="ml-auto text-[11px] font-normal opacity-90">no cap on creation</span>
              </div>
            ) : (
              <>
                <label className="mt-2.5 block text-[11px] font-medium ad-muted-text mb-1.5">Max allowed</label>
                <input type="number" min="1" step="1" value={limit} onChange={(e) => onLimitChange(e.target.value)} className={quotaInputClass} placeholder={placeholder} />
                {Number(limit) > 0 && (
                  <div className="mt-2.5">
                    <MiniBar used={used} limit={Number(limit)} />
                    <p className="mt-1 text-[11px] ad-faint-text">
                      {Number(used || 0).toLocaleString()} of {Number(limit).toLocaleString()} used
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <p className="text-[11px] font-medium ad-muted-text bg-[var(--ad-sunk)] rounded-xl px-3 py-2.5">{inactiveNote}</p>
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
  if (s === 'published') return 'bg-[var(--ad-ok-bg)] text-[var(--ad-ok)] border-[color-mix(in_srgb,var(--ad-ok)_35%,var(--ad-line))]';
  if (s === 'archived' || s === 'hidden') return 'bg-[var(--ad-sunk)] ad-muted-text border-[var(--ad-line)]';
  return 'bg-[var(--ad-warn-bg)] text-[var(--ad-warn)] border-[color-mix(in_srgb,var(--ad-warn)_35%,var(--ad-line))]';
}

function deliveryLabel(status) {
  const s = String(status || 'draft').toLowerCase();
  if (s === 'published') return 'Published';
  if (s === 'archived' || s === 'hidden') return 'Hidden';
  return 'Draft';
}

function albumTone(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('approv') || s === 'published' || s === 'live') return 'bg-[var(--ad-ok-bg)] text-[var(--ad-ok)] border-[color-mix(in_srgb,var(--ad-ok)_35%,var(--ad-line))]';
  if (s.includes('draft')) return 'bg-[var(--ad-warn-bg)] text-[var(--ad-warn)] border-[color-mix(in_srgb,var(--ad-warn)_35%,var(--ad-line))]';
  return 'bg-[var(--ad-sunk)] ad-muted-text border-[var(--ad-line)]';
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
    // Per-photographer album/delivery names via the admin galleries endpoint.
    try {
      const data = await apiFetch(`/v1/admin/photographers/${user.id}/galleries`);
      const albums = Array.isArray(data?.albums) ? data.albums : [];
      const deliveries = Array.isArray(data?.deliveries) ? data.deliveries : [];
      setDetailsByUser((prev) => ({
        ...prev,
        [user.id]: {
          albums,
          deliveries,
          albumCount: albums.length,
          deliveryCount: deliveries.length,
          countsOnly: false,
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

  const fetchUsers = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    setMigrationWarning(null);
    // Workers: quotas flattened onto each row.
    try {
      const res = await apiFetch('/v1/admin/photographers?limit=500');
      setUsers(
        (res?.photographers || []).map((p) => ({
          id: p.id,
          name: p.display_name || 'Unnamed',
          email: p.email,
          plan: p.plan || 'Free',
          albumUsed: Number(p.album_count ?? p.album_used_count) || 0,
          albumLimit: p.album_limit != null ? Number(p.album_limit) : 0,
          deliveryUsed: Number(p.delivery_count ?? p.delivery_used_count) || 0,
          deliveryLimit: p.delivery_limit != null ? Number(p.delivery_limit) : 0,
        }))
      );
    } catch (err) {
      console.error('Error fetching usage:', err);
      setError(err.message || 'Failed to load usage.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Ref so the live subscription always calls the latest fetch without re-subscribing.
  const fetchUsersRef = useRef(fetchUsers);
  fetchUsersRef.current = fetchUsers;

  useEffect(() => {
    fetchUsersRef.current();
    // Instant sync both directions (see AdminUserManagement): debounced because
    // bulk uploads fire one photographers UPDATE per photo.
    // Silent so live polls never flash the full-page loader.
    let timer = null;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => fetchUsersRef.current({ silent: true }), 1200);
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
      const res = await apiFetch(`/v1/admin/photographers/${editingUser.id}`, {
        method: 'PATCH',
        body: { album_limit: parsedAlbum, delivery_limit: parsedDelivery },
      });
      if (Array.isArray(res?.warnings) && res.warnings.length) {
        alert(`Saved with warnings:\n${res.warnings.join('\n')}`);
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
      <AdminPageHeader
        title="Albums & Deliveries"
        subtitle="See how many albums and deliveries each photographer created — and set creation limits."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminStatCard
          label="Total albums"
          value={loading ? '—' : totalAlbums.toLocaleString()}
          loading={loading}
          sub={`Across ${loading ? '—' : users.length.toLocaleString()} photographers`}
          icon={Layers}
          meter={totalAlbums + totalDeliveries ? (totalAlbums / (totalAlbums + totalDeliveries)) * 100 : 0}
        />
        <AdminStatCard
          label="Total deliveries"
          value={loading ? '—' : totalDeliveries.toLocaleString()}
          loading={loading}
          sub="Client galleries shipped"
          icon={Send}
          meter={totalAlbums + totalDeliveries ? (totalDeliveries / (totalAlbums + totalDeliveries)) * 100 : 0}
        />
        <AdminStatCard
          label="At creation limit"
          value={loading ? '—' : atLimit.toLocaleString()}
          loading={loading}
          sub="Albums or deliveries blocked"
          tone={atLimit > 0 ? 'danger' : undefined}
          meter={users.length ? (atLimit / users.length) * 100 : 0}
        />
        <AdminStatCard
          label="Photographers"
          value={loading ? '—' : users.length.toLocaleString()}
          loading={loading}
          sub="On this roster"
        />
      </div>

      <div className="ad-card p-4 rounded-2xl shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ad-faint-text" />
            <input
              type="text"
              placeholder="Search photographers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ad-input w-full pl-9 pr-4 py-2 ad-sunk border border-[var(--ad-line)] rounded-xl text-sm outline-none"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              aria-label="Filter by plan"
              className="ad-input px-3 py-2 ad-sunk border border-[var(--ad-line)] rounded-xl text-sm outline-none"
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
              className="ad-input px-3 py-2 ad-sunk border border-[var(--ad-line)] rounded-xl text-sm outline-none"
            >
              <option value="all">All statuses</option>
              <option value="blocked">At limit / disabled</option>
              <option value="albums-blocked">Albums blocked</option>
              <option value="deliveries-blocked">Deliveries blocked</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs ad-muted-text">
            Showing <span className="font-semibold ad-ink">{filtered.length}</span> of <span className="font-semibold ad-ink">{users.length}</span> photographers
          </p>
          {filtersActive && (
            <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-xs font-semibold ad-muted-text hover:text-[var(--ad-ink)] transition-colors">
              <X className="w-3.5 h-3.5" />Clear filters
            </button>
          )}
        </div>
      </div>

      {migrationWarning && !loading && (
        <div className="rounded-2xl p-4 flex items-start gap-3 border border-[color-mix(in_srgb,var(--ad-warn)_35%,var(--ad-line))] bg-[var(--ad-warn-bg)]">
          <AlertCircle className="w-5 h-5 text-[var(--ad-warn)] mt-0.5 shrink-0" />
          <p className="text-[var(--ad-warn)] text-sm">{migrationWarning}</p>
        </div>
      )}

      {error && (
        <div className="ad-error-card rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-8 h-8 text-[var(--ad-bad)] mb-3" />
          <h3 className="text-[var(--ad-bad)] font-semibold mb-1">Failed to load usage</h3>
          <p className="text-[var(--ad-bad)] text-sm max-w-md opacity-90">{error}</p>
        </div>
      )}

      {!error && loading && <AppLoader label="Loading usage" variant="page-short" />}

      {!error && !loading && (
        <div className="ad-panel ad-card overflow-hidden">
          <div className="overflow-hidden">
            <table className="w-full text-left text-sm" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-[var(--ad-sunk)] border-b border-[var(--ad-line)]">
                <tr>
                  <th className="px-5 py-3.5 font-semibold ad-muted-text text-xs uppercase tracking-wider" style={{ width: '34%' }}>Photographer</th>
                  <th className="px-4 py-3.5 font-semibold ad-muted-text text-xs uppercase tracking-wider" style={{ width: '28%' }}>
                    <span className="inline-flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" />Albums</span>
                    <span className="block text-[10px] font-normal normal-case ad-faint-text mt-0.5">created / limit</span>
                  </th>
                  <th className="px-4 py-3.5 font-semibold ad-muted-text text-xs uppercase tracking-wider" style={{ width: '28%' }}>
                    <span className="inline-flex items-center gap-1.5"><Send className="w-3.5 h-3.5" />Deliveries</span>
                    <span className="block text-[10px] font-normal normal-case ad-faint-text mt-0.5">created / limit</span>
                  </th>
                  <th className="px-4 py-3.5 font-semibold ad-muted-text text-xs uppercase tracking-wider text-right" style={{ width: '10%' }}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ad-line)]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <p className="ad-muted-text">{filtersActive ? 'No photographers match the current filters.' : 'No photographers found.'}</p>
                      {filtersActive && (
                        <button type="button" onClick={clearFilters} className="ad-btn-primary mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-colors">
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
                      <tr className={`ad-row transition-colors align-top ${expanded ? 'bg-[var(--ad-sunk)]' : ''}`}>
                      <td className="px-5 py-4 min-w-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="ad-avatar w-9 h-9 rounded-full flex items-center justify-center bg-[var(--ad-ink)] text-[var(--ad-card)] shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold ad-ink truncate">{u.name}</p>
                            <p className="ad-muted-text text-xs truncate">{u.email}</p>
                            <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--ad-sunk)] ad-muted-text capitalize">{u.plan}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[11px] font-medium ad-muted-text">Albums</span>
                          <QuotaPill used={u.albumUsed} limit={u.albumLimit} />
                        </div>
                        <MiniBar used={u.albumUsed} limit={u.albumLimit} />
                      </td>
                      <td className="px-4 py-4 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[11px] font-medium ad-muted-text">Deliveries</span>
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
                            className={`p-2 rounded-lg transition-colors ${expanded ? 'bg-[var(--ad-ink)] text-[var(--ad-card)]' : 'ad-muted-text hover:bg-[var(--ad-sunk)]'}`}
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                          </button>
                          <button onClick={() => openEditor(u)} className="ad-action-btn ad-btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors">
                            <Pencil className="w-3.5 h-3.5" />Edit
                          </button>
                        </div>
                      </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-[color-mix(in_srgb,var(--ad-sunk)_55%,var(--ad-card))]">
                          <td colSpan="4" className="px-5 pb-5 pt-1">
                            {detail.loading ? (
                              <div className="flex items-center gap-2 py-4 text-sm ad-muted-text">
                                <AppSpinner size="xs" />Loading albums &amp; deliveries…
                              </div>
                            ) : detail.error ? (
                              <p className="py-3 text-sm text-[var(--ad-bad)]">{detail.error}</p>
                            ) : detail.countsOnly ? (
                              <div className="flex flex-wrap items-center gap-x-8 gap-y-2 py-3 text-sm ad-muted-text">
                                <p><strong className="ad-ink">{Number(detail.albumCount ?? 0).toLocaleString()}</strong> albums created</p>
                                <p><strong className="ad-ink">{Number(detail.deliveryCount ?? 0).toLocaleString()}</strong> deliveries created</p>
                                <p className="text-[11px] ad-faint-text">Per-item names are unavailable via the Workers API.</p>
                              </div>
                            ) : (
                              <div className="grid md:grid-cols-2 gap-4">
                                <div className="ad-card rounded-xl overflow-hidden">
                                  <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--ad-sunk)] border-b border-[var(--ad-line)]">
                                    <BookOpen className="w-3.5 h-3.5 ad-muted-text" />
                                    <p className="text-xs font-semibold ad-ink">Albums · {(detail.albums || []).length}</p>
                                  </div>
                                  <ul className="max-h-64 overflow-y-auto divide-y divide-[var(--ad-line)]">
                                    {(detail.albums || []).length === 0 ? (
                                      <li className="px-4 py-4 text-[13px] ad-faint-text">
                                        {detail.albumsUnavailable ? 'Album data unavailable.' : 'No albums yet.'}
                                      </li>
                                    ) : (
                                      detail.albums.map((a) => (
                                        <li key={a.id} className="flex items-center gap-2.5 px-4 py-2.5">
                                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${albumTone(a.status)}`}>{albumLabel(a.status)}</span>
                                          <span className="min-w-0 flex-1 truncate text-[13px] font-medium ad-ink" title={a.name || 'Untitled'}>{a.name || 'Untitled album'}</span>
                                          <span className="shrink-0 text-[11px] ad-faint-text">{formatDateMed(a.created_at)}</span>
                                        </li>
                                      ))
                                    )}
                                  </ul>
                                </div>
                                <div className="ad-card rounded-xl overflow-hidden">
                                  <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--ad-sunk)] border-b border-[var(--ad-line)]">
                                    <Send className="w-3.5 h-3.5 ad-muted-text" />
                                    <p className="text-xs font-semibold ad-ink">Deliveries · {(detail.deliveries || []).length}</p>
                                  </div>
                                  <ul className="max-h-64 overflow-y-auto divide-y divide-[var(--ad-line)]">
                                    {(detail.deliveries || []).length === 0 ? (
                                      <li className="px-4 py-4 text-[13px] ad-faint-text">No deliveries yet.</li>
                                    ) : (
                                      detail.deliveries.map((d) => (
                                        <li key={d.id} className="flex items-center gap-2.5 px-4 py-2.5">
                                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${deliveryTone(d.status)}`}>{deliveryLabel(d.status)}</span>
                                          <span className="min-w-0 flex-1 truncate text-[13px] font-medium ad-ink" title={d.name || d.slug || 'Untitled'}>{d.name || d.slug || 'Untitled delivery'}</span>
                                          <span className="shrink-0 text-[11px] ad-faint-text">{formatDateMed(d.created_at)}</span>
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
        <AdminModal
          open
          onClose={() => setEditingUser(null)}
          title="Creation limits"
          subtitle={`${editingUser.name} · ${editingUser.email}`}
          avatar={(editingUser.name || editingUser.email || 'U').charAt(0).toUpperCase()}
          footer={(
            <AdminModalActions
              onCancel={() => setEditingUser(null)}
              onSave={() => document.getElementById('admin-creation-limits-form')?.requestSubmit()}
              saving={updating}
            />
          )}
        >
          <form id="admin-creation-limits-form" onSubmit={handleSave} className="space-y-3">
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
                <p className="text-[11px] ad-faint-text">Toggle off = cannot create new · ∞ = unlimited · number = max allowed. Usage counts update automatically.</p>
          </form>
        </AdminModal>
      )}
    </div>
  );
};

export default AdminUsageManagement;
