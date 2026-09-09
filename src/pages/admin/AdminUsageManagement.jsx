import React, { useState, useEffect, useRef } from 'react';
import { Search, User, AlertCircle, X, Layers, Send, Pencil } from 'lucide-react';
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

  const presetBtn = (active) =>
    `flex-1 px-2 py-1.5 text-[11px] rounded-lg border font-semibold ${active ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]' : 'bg-white text-gray-600 border-gray-200'}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-serif uppercase">Albums &amp; Deliveries</h1>
        <p className="text-gray-500 mt-1 text-sm">See how many albums and deliveries each photographer created — and set creation limits.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#fdfdfc] p-5 rounded-2xl shadow-sm border border-[#eae8e4]">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 inline-flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" />Total albums</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{loading ? '—' : totalAlbums.toLocaleString()}</p>
        </div>
        <div className="bg-[#fdfdfc] p-5 rounded-2xl shadow-sm border border-[#eae8e4]">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 inline-flex items-center gap-1.5"><Send className="w-3.5 h-3.5" />Total deliveries</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{loading ? '—' : totalDeliveries.toLocaleString()}</p>
        </div>
        <div className="bg-[#fdfdfc] p-5 rounded-2xl shadow-sm border border-[#eae8e4]">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">At limit / disabled</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{loading ? '—' : atLimit.toLocaleString()}</p>
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
                  filtered.map((u) => (
                    <tr key={u.id} className="hover:bg-[#f8f7f4]/60 transition-colors align-top">
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
                      <td className="px-4 py-4 text-right">
                        <button onClick={() => openEditor(u)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#1a1a1a] text-white rounded-lg hover:bg-black transition-colors">
                          <Pencil className="w-3.5 h-3.5" />Edit
                        </button>
                      </td>
                    </tr>
                  ))
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
              <div className="px-5 py-4 space-y-3 overflow-hidden">
                <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/60">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <button type="button" role="switch" aria-checked={albumEnabled} onClick={() => setAlbumEnabled(!albumEnabled)} className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${albumEnabled ? 'bg-[#1a1a1a]' : 'bg-gray-300'}`}>
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${albumEnabled ? 'left-4' : 'left-0.5'}`} />
                      </button>
                      <div>
                        <p className="text-[13px] font-semibold text-gray-800 leading-tight">Albums</p>
                        <p className="text-[11px] text-gray-400">Created {editingUser.albumUsed.toLocaleString()}</p>
                      </div>
                    </div>
                    {albumEnabled && (
                      <label className="flex items-center gap-1 text-[11px] text-gray-500 cursor-pointer shrink-0"><input type="checkbox" checked={albumUnlimited} onChange={(e) => setAlbumUnlimited(e.target.checked)} className="rounded" />∞</label>
                    )}
                  </div>
                  {albumEnabled ? (
                    <div className="space-y-2">
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => { setAlbumUnlimited(false); setAlbumLimit('1'); }} className={presetBtn(!albumUnlimited && albumLimit === '1')}>1</button>
                        <button type="button" onClick={() => { setAlbumUnlimited(false); if (albumLimit === '1' || !albumLimit) setAlbumLimit('5'); }} className={presetBtn(!albumUnlimited && Number(albumLimit) > 1)}>Multiple</button>
                        <button type="button" onClick={() => { setAlbumUnlimited(true); setAlbumLimit(''); }} className={presetBtn(albumUnlimited)}>∞</button>
                      </div>
                      {!albumUnlimited && (
                        <input type="number" min="1" step="1" value={albumLimit} onChange={(e) => setAlbumLimit(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1a1a1a]" placeholder="e.g. 10" />
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] font-medium text-gray-500 bg-gray-100 rounded-lg px-2.5 py-2">Cannot create new albums</p>
                  )}
                </div>

                <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/60">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <button type="button" role="switch" aria-checked={deliveryEnabled} onClick={() => setDeliveryEnabled(!deliveryEnabled)} className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${deliveryEnabled ? 'bg-[#1a1a1a]' : 'bg-gray-300'}`}>
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${deliveryEnabled ? 'left-4' : 'left-0.5'}`} />
                      </button>
                      <div>
                        <p className="text-[13px] font-semibold text-gray-800 leading-tight">Deliveries</p>
                        <p className="text-[11px] text-gray-400">Created {editingUser.deliveryUsed.toLocaleString()}</p>
                      </div>
                    </div>
                    {deliveryEnabled && (
                      <label className="flex items-center gap-1 text-[11px] text-gray-500 cursor-pointer shrink-0"><input type="checkbox" checked={deliveryUnlimited} onChange={(e) => setDeliveryUnlimited(e.target.checked)} className="rounded" />∞</label>
                    )}
                  </div>
                  {deliveryEnabled ? (
                    <div className="space-y-2">
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => { setDeliveryUnlimited(false); setDeliveryLimit('1'); }} className={presetBtn(!deliveryUnlimited && deliveryLimit === '1')}>1</button>
                        <button type="button" onClick={() => { setDeliveryUnlimited(false); if (deliveryLimit === '1' || !deliveryLimit) setDeliveryLimit('5'); }} className={presetBtn(!deliveryUnlimited && Number(deliveryLimit) > 1)}>Multiple</button>
                        <button type="button" onClick={() => { setDeliveryUnlimited(true); setDeliveryLimit(''); }} className={presetBtn(deliveryUnlimited)}>∞</button>
                      </div>
                      {!deliveryUnlimited && (
                        <input type="number" min="1" step="1" value={deliveryLimit} onChange={(e) => setDeliveryLimit(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1a1a1a]" placeholder="e.g. 10" />
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] font-medium text-gray-500 bg-gray-100 rounded-lg px-2.5 py-2">Cannot create new deliveries</p>
                  )}
                </div>
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
