import React, { useState, useEffect } from 'react';
import { Search, User, AlertCircle, X, HardDrive, ScanFace, Send, Pencil } from 'lucide-react';
import { AppLoader, AppSpinner } from '../../components/ui/AppLoading';
import { supabase } from '../../lib/supabase/client';

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
  if (cap === -1) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500">Off</span>;
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

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0.00 MB';
  const tbLimit = 1024 * 1024 * 1024 * 1024;
  const gbLimit = 1024 * 1024 * 1024;
  if (bytes >= tbLimit) return `${(bytes / tbLimit).toFixed(2)} TB`;
  if (bytes >= gbLimit) return `${(bytes / gbLimit).toFixed(2)} GB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatStorageShort(usedLabel, totalLabel) {
  return `${usedLabel} / ${totalLabel}`;
}

function splitStorageDisplay(label) {
  const parts = String(label || '').trim().split(' ');
  return { value: parts[0] || '', unit: parts[1] || 'GB' };
}

const AdminUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [migrationWarning, setMigrationWarning] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [editingUser, setEditingUser] = useState(null);
  const [storageValue, setStorageValue] = useState('');
  const [storageUnit, setStorageUnit] = useState('GB');
  // Split limits: normal delivery vs guest delivery
  const [normalImageEnabled, setNormalImageEnabled] = useState(true);
  const [normalImageLimit, setNormalImageLimit] = useState('');
  const [normalImageUnlimited, setNormalImageUnlimited] = useState(true);
  const [guestImageEnabled, setGuestImageEnabled] = useState(true);
  const [guestImageLimit, setGuestImageLimit] = useState('');
  const [guestImageUnlimited, setGuestImageUnlimited] = useState(true);

  const [normalFaceEnabled, setNormalFaceEnabled] = useState(true);
  const [normalFaceLimit, setNormalFaceLimit] = useState('');
  const [normalFaceUnlimited, setNormalFaceUnlimited] = useState(true);
  const [guestFaceEnabled, setGuestFaceEnabled] = useState(true);
  const [guestFaceLimit, setGuestFaceLimit] = useState('');
  const [guestFaceUnlimited, setGuestFaceUnlimited] = useState(true);
  // Master feature switches: OFF hides Find People / blocks matching
  const [normalFeature, setNormalFeature] = useState(true);
  const [guestFeature, setGuestFeature] = useState(true);
  // AI search master switch: OFF hides Library nav + disables /photos search
  const [aiSearchEnabled, setAiSearchEnabled] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeLimitTab, setActiveLimitTab] = useState('normal');

  const LEGACY_SELECT =
    'id, display_name, email, plan, storage_used_bytes, storage_limit_bytes, image_used_count, image_limit, face_matching_delivery_used, face_matching_delivery_limit';
  const SPLIT_SELECT = `${LEGACY_SELECT}, face_normal_image_limit, face_normal_image_used, face_guest_image_limit, face_guest_image_used, face_normal_delivery_limit, face_normal_delivery_used, face_guest_delivery_limit, face_guest_delivery_used, face_normal_enabled, face_guest_enabled, ai_search_enabled`;

  const isMissingColumnError = (err) => {
    const msg = String(err?.message || '');
    return err?.code === '42703' || /does not exist|face_normal|face_guest|ai_search/i.test(msg);
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    setMigrationWarning(null);

    try {
      let data = null;
      let splitAvailable = true;
      const splitRes = await supabase.from('photographers').select(SPLIT_SELECT).order('created_at', { ascending: false });
      if (splitRes.error) {
        if (isMissingColumnError(splitRes.error)) {
          // Newest column (ai_search_enabled) may be missing while split quotas exist —
          // retry without it so split limits still load, defaulting AI search ON.
          if (/ai_search/i.test(String(splitRes.error.message || ''))) {
            const withoutAi = SPLIT_SELECT.replace(', ai_search_enabled', '');
            const retryRes = await supabase.from('photographers').select(withoutAi).order('created_at', { ascending: false });
            if (!retryRes.error) {
              data = (retryRes.data || []).map((p) => ({ ...p, ai_search_enabled: true }));
              setMigrationWarning(
                'Database migration pending: run supabase/migrations/20260912000000_ai_search_enabled.sql in Supabase SQL Editor to enable the AI search toggle. Showing AI search as ON.'
              );
            } else if (isMissingColumnError(retryRes.error)) {
              splitAvailable = false;
              const legacyRes = await supabase.from('photographers').select(LEGACY_SELECT).order('created_at', { ascending: false });
              if (legacyRes.error) throw legacyRes.error;
              data = (legacyRes.data || []).map((p) => ({ ...p, ai_search_enabled: true }));
            } else {
              throw retryRes.error;
            }
          } else {
            splitAvailable = false;
            const legacyRes = await supabase.from('photographers').select(LEGACY_SELECT).order('created_at', { ascending: false });
            if (legacyRes.error) throw legacyRes.error;
            data = (legacyRes.data || []).map((p) => ({ ...p, ai_search_enabled: true }));
          }
        } else {
          throw splitRes.error;
        }
      } else {
        data = splitRes.data;
      }

      if (!splitAvailable) {
        setMigrationWarning(
          'Database migration pending: run supabase/migrations/20260910000000_split_face_quotas_normal_guest.sql in Supabase SQL Editor, then refresh. Showing legacy limits.'
        );
      }

      const mappedPhotographers = (data || []).map((p) => {
        const nImgLimit = p.face_normal_image_limit != null ? Number(p.face_normal_image_limit) : (p.image_limit != null ? Number(p.image_limit) : 0);
        const gImgLimit = p.face_guest_image_limit != null ? Number(p.face_guest_image_limit) : (p.image_limit != null ? Number(p.image_limit) : 0);
        const nFaceLimit = p.face_normal_delivery_limit != null ? Number(p.face_normal_delivery_limit) : 0;
        const gFaceLimit = p.face_guest_delivery_limit != null ? Number(p.face_guest_delivery_limit) : (p.face_matching_delivery_limit != null ? Number(p.face_matching_delivery_limit) : 0);
        const nFeature = p.face_normal_enabled != null ? p.face_normal_enabled !== false : !(nImgLimit === -1 && nFaceLimit === -1);
        const gFeature = p.face_guest_enabled != null ? p.face_guest_enabled !== false : !(gImgLimit === -1 && gFaceLimit === -1);
        return {
          normalFeature: nFeature,
          guestFeature: gFeature,
          aiSearch: p.ai_search_enabled !== false,
          id: p.id,
          name: p.display_name || 'Unnamed',
          email: p.email,
          plan: p.plan || 'Unknown',
          role: 'Photographer',
          usedStorage: formatBytes(p.storage_used_bytes),
          totalStorage: formatBytes(p.storage_limit_bytes),
          rawLimitBytes: p.storage_limit_bytes || 0,
          rawUsedBytes: p.storage_used_bytes || 0,
          // Legacy combined (for fallback)
          imageUsed: Number(p.image_used_count) || 0,
          imageLimit: p.image_limit != null ? Number(p.image_limit) : 0,
          faceUsed: Number(p.face_matching_delivery_used) || 0,
          faceLimit: p.face_matching_delivery_limit != null ? Number(p.face_matching_delivery_limit) : 0,
          // Split
          normalImageUsed: Number(p.face_normal_image_used ?? p.image_used_count) || 0,
          normalImageLimit: nImgLimit,
          guestImageUsed: Number(p.face_guest_image_used) || 0,
          guestImageLimit: gImgLimit,
          normalFaceUsed: Number(p.face_normal_delivery_used) || 0,
          normalFaceLimit: nFaceLimit,
          guestFaceUsed: Number(p.face_guest_delivery_used ?? p.face_matching_delivery_used) || 0,
          guestFaceLimit: gFaceLimit,
        };
      });

      setUsers(mappedPhotographers);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to load users. Ensure RLS policies allow reading.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const initTriState = (limit) => {
    const isDisabled = Number(limit) === -1;
    return {
      enabled: !isDisabled,
      unlimited: !isDisabled && !(Number(limit) > 0),
      value: Number(limit) > 0 ? String(limit) : '',
    };
  };

  const openLimitsEditor = (user) => {
    const storage = splitStorageDisplay(user.totalStorage);
    setEditingUser(user);
    setStorageValue(storage.value);
    setStorageUnit(storage.unit);

    const nImg = initTriState(user.normalImageLimit);
    setNormalImageEnabled(nImg.enabled);
    setNormalImageUnlimited(nImg.unlimited);
    setNormalImageLimit(nImg.value);

    const gImg = initTriState(user.guestImageLimit);
    setGuestImageEnabled(gImg.enabled);
    setGuestImageUnlimited(gImg.unlimited);
    setGuestImageLimit(gImg.value);

    const nFace = initTriState(user.normalFaceLimit);
    setNormalFaceEnabled(nFace.enabled);
    setNormalFaceUnlimited(nFace.unlimited);
    setNormalFaceLimit(nFace.value);

    const gFace = initTriState(user.guestFaceLimit);
    setGuestFaceEnabled(gFace.enabled);
    setGuestFaceUnlimited(gFace.unlimited);
    setGuestFaceLimit(gFace.value);

    setNormalFeature(user.normalFeature !== false);
    setGuestFeature(user.guestFeature !== false);
    setAiSearchEnabled(user.aiSearch !== false);
    setActiveLimitTab('normal');
  };

  // Master toggle drives both sub-toggles so ON/OFF always matches Face images + Deliveries.
  const toggleNormalFeature = (next) => {
    setNormalFeature(next);
    if (!next) {
      setNormalImageEnabled(false);
      setNormalFaceEnabled(false);
    } else {
      setNormalImageEnabled(true);
      setNormalFaceEnabled(true);
      setNormalImageUnlimited((prev) => (normalImageLimit ? prev : true));
      setNormalFaceUnlimited((prev) => (normalFaceLimit ? prev : true));
    }
  };

  const toggleGuestFeature = (next) => {
    setGuestFeature(next);
    if (!next) {
      setGuestImageEnabled(false);
      setGuestFaceEnabled(false);
    } else {
      setGuestImageEnabled(true);
      setGuestFaceEnabled(true);
      setGuestImageUnlimited((prev) => (guestImageLimit ? prev : true));
      setGuestFaceUnlimited((prev) => (guestFaceLimit ? prev : true));
    }
  };

  // Keep master in sync when sub-toggles are flipped manually:
  // both ON => master ON, both OFF => master OFF.
  useEffect(() => {
    if (!editingUser) return;
    if (normalImageEnabled && normalFaceEnabled) setNormalFeature(true);
    else if (!normalImageEnabled && !normalFaceEnabled) setNormalFeature(false);
  }, [normalImageEnabled, normalFaceEnabled, editingUser]);

  useEffect(() => {
    if (!editingUser) return;
    if (guestImageEnabled && guestFaceEnabled) setGuestFeature(true);
    else if (!guestImageEnabled && !guestFaceEnabled) setGuestFeature(false);
  }, [guestImageEnabled, guestFaceEnabled, editingUser]);

  const parseTriState = (enabled, unlimited, raw, label) => {
    if (!enabled) return -1;
    if (unlimited) return 0;
    const v = Math.floor(Number(raw));
    if (!Number.isFinite(v) || v < 1) {
      throw new Error(`Enter a ${label} limit of at least 1, or toggle unlimited.`);
    }
    return v;
  };

  const handleUpdateLimits = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    setUpdating(true);
    try {
      let multiplier = 1024 * 1024 * 1024;
      if (storageUnit === 'MB') multiplier = 1024 * 1024;
      if (storageUnit === 'TB') multiplier = 1024 * 1024 * 1024 * 1024;

      const parsedStorage = parseFloat(storageValue);
      if (!Number.isFinite(parsedStorage) || parsedStorage <= 0) {
        throw new Error('Enter a storage limit greater than zero.');
      }

      const parsedNormalImages = parseTriState(normalImageEnabled, normalImageUnlimited, normalImageLimit, 'normal face image');
      const parsedGuestImages = parseTriState(guestImageEnabled, guestImageUnlimited, guestImageLimit, 'guest face image');
      const parsedNormalFace = parseTriState(normalFaceEnabled, normalFaceUnlimited, normalFaceLimit, 'normal face matching delivery');
      const parsedGuestFace = parseTriState(guestFaceEnabled, guestFaceUnlimited, guestFaceLimit, 'guest face matching delivery');

      // Legacy compat: image_limit = sum (or 0/-1 edge cases), face_matching_delivery_limit = guest
      let legacyImage = 0;
      if (parsedNormalImages === -1 && parsedGuestImages === -1) legacyImage = -1;
      else if (parsedNormalImages <= 0 && parsedGuestImages <= 0) legacyImage = 0;
      else legacyImage = Math.max(0, parsedNormalImages) + Math.max(0, parsedGuestImages);

      const splitPayload = {
        storage_limit_bytes: Math.round(parsedStorage * multiplier),
        image_limit: legacyImage,
        face_matching_delivery_limit: parsedGuestFace,
        face_normal_image_limit: parsedNormalImages,
        face_guest_image_limit: parsedGuestImages,
        face_normal_delivery_limit: parsedNormalFace,
        face_guest_delivery_limit: parsedGuestFace,
        face_normal_enabled: normalFeature,
        face_guest_enabled: guestFeature,
        ai_search_enabled: aiSearchEnabled,
      };
      const { error: updateError } = await supabase.from('photographers').update(splitPayload).eq('id', editingUser.id);

      if (updateError) {
        if (isMissingColumnError(updateError)) {
          // Try without the newest columns (older migration applied, newest not yet).
          const { face_normal_enabled: _n, face_guest_enabled: _g, ai_search_enabled: _a, ...withoutFlags } = splitPayload;
          const { error: retryError } = await supabase.from('photographers').update(withoutFlags).eq('id', editingUser.id);
          if (!retryError) {
            alert('Saved, but run 20260911000000_face_feature_master_toggles.sql and 20260912000000_ai_search_enabled.sql to enable the master on/off switches.');
          } else {
            if (!isMissingColumnError(retryError)) throw retryError;
            // DB migration not applied yet — persist legacy columns so nothing is lost.
            const { error: legacyError } = await supabase
              .from('photographers')
              .update({
                storage_limit_bytes: splitPayload.storage_limit_bytes,
                image_limit: legacyImage,
                face_matching_delivery_limit: parsedGuestFace,
              })
              .eq('id', editingUser.id);
            if (legacyError) throw legacyError;
            alert('Saved to legacy columns. Run the split-quota migration SQL to enable separate Normal/Guest storage.');
          }
        } else {
          throw updateError;
        }
      }

      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to update account limits.');
    } finally {
      setUpdating(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a] tracking-tight font-serif uppercase">User Management</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage administrators and platform users.</p>
        </div>
      </div>

      <div className="bg-[#fdfdfc] p-4 rounded-2xl shadow-sm border border-[#eae8e4] flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#f8f7f4] border border-[#eae8e4] hover:border-[#eae8e4]/80 focus:border-[#1a1a1a] focus:bg-white rounded-xl text-sm outline-none transition-all focus:ring-1 focus:ring-[#1a1a1a]"
          />
        </div>
      </div>

      {migrationWarning && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-amber-800 text-sm">{migrationWarning}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
          <h3 className="text-red-800 font-semibold mb-1">Failed to load users</h3>
          <p className="text-red-600 text-sm max-w-md">{error}</p>
        </div>
      )}

      {!error && loading && (
        <AppLoader label="Fetching user records" variant="page-short" />
      )}

      {!error && !loading && (
        <div className="bg-[#fdfdfc] rounded-2xl shadow-sm border border-[#eae8e4] overflow-hidden">
          {/* No horizontal scroll: grouped columns fit the container */}
          <div className="overflow-hidden">
            <table className="w-full text-left text-sm" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-[#f9f8f5]/85 border-b border-[#eae8e4]">
                <tr>
                  <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider" style={{ width: '26%' }}>Photographer</th>
                  <th className="px-4 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider" style={{ width: '20%' }}>
                    <span className="inline-flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5" />Storage</span>
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider" style={{ width: '22%' }}>
                    <span className="inline-flex items-center gap-1.5"><ScanFace className="w-3.5 h-3.5" />Face images</span>
                    <span className="block text-[10px] font-normal normal-case text-gray-400 mt-0.5">Normal / Guest</span>
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider" style={{ width: '22%' }}>
                    <span className="inline-flex items-center gap-1.5"><Send className="w-3.5 h-3.5" />Deliveries</span>
                    <span className="block text-[10px] font-normal normal-case text-gray-400 mt-0.5">Normal / Guest</span>
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right" style={{ width: '10%' }}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      No users found matching "{searchQuery}"
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-[#f8f7f4]/60 transition-colors align-top">
                      <td className="px-5 py-4 min-w-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#1a1a1a] text-white shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                            <p className="text-gray-500 text-xs truncate">{user.email}</p>
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 capitalize">
                              {user.plan} · {user.role}
                            </span>
                            {user.aiSearch === false && (
                              <span className="flex items-center gap-1.5 mt-1.5 text-[11px] font-medium text-gray-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                Library off
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-800">{formatStorageShort(user.usedStorage, user.totalStorage)}</p>
                        <div className="mt-1.5 max-w-[160px]">
                          <MiniBar used={user.rawUsedBytes} limit={user.rawLimitBytes} />
                        </div>
                      </td>
                      <td className="px-4 py-4 min-w-0">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 w-14 shrink-0">
                              Normal <span className={`w-1.5 h-1.5 rounded-full ${user.normalFeature !== false ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                            </span>
                            {user.normalFeature !== false ? (
                              <QuotaPill used={user.normalImageUsed} limit={user.normalImageLimit} />
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-200 text-gray-500">OFF</span>
                            )}
                          </div>
                          <MiniBar used={user.normalImageUsed} limit={user.normalFeature !== false ? user.normalImageLimit : -1} />
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 w-14 shrink-0">
                              Guest <span className={`w-1.5 h-1.5 rounded-full ${user.guestFeature !== false ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                            </span>
                            {user.guestFeature !== false ? (
                              <QuotaPill used={user.guestImageUsed} limit={user.guestImageLimit} />
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-200 text-gray-500">OFF</span>
                            )}
                          </div>
                          <MiniBar used={user.guestImageUsed} limit={user.guestFeature !== false ? user.guestImageLimit : -1} />
                        </div>
                      </td>
                      <td className="px-4 py-4 min-w-0">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 w-14 shrink-0">
                              Normal <span className={`w-1.5 h-1.5 rounded-full ${user.normalFeature !== false ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                            </span>
                            {user.normalFeature !== false ? (
                              <QuotaPill used={user.normalFaceUsed} limit={user.normalFaceLimit} />
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-200 text-gray-500">OFF</span>
                            )}
                          </div>
                          <MiniBar used={user.normalFaceUsed} limit={user.normalFeature !== false ? user.normalFaceLimit : -1} />
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 w-14 shrink-0">
                              Guest <span className={`w-1.5 h-1.5 rounded-full ${user.guestFeature !== false ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                            </span>
                            {user.guestFeature !== false ? (
                              <QuotaPill used={user.guestFaceUsed} limit={user.guestFaceLimit} />
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-200 text-gray-500">OFF</span>
                            )}
                          </div>
                          <MiniBar used={user.guestFaceUsed} limit={user.guestFeature !== false ? user.guestFaceLimit : -1} />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => openLimitsEditor(user)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#1a1a1a] text-white rounded-lg hover:bg-[#2a2a2a] transition-colors"
                        >
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
                <h3 className="font-semibold text-[#1a1a1a] leading-tight">Edit limits</h3>
                <p className="text-xs text-gray-500 truncate">{editingUser.name} · {editingUser.email}</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateLimits} className="flex flex-col min-h-0">
              <div className="px-5 py-4 space-y-5 flex-1 min-h-0 overflow-y-auto">
                {/* Storage */}
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Storage</span>
                    <span className="text-xs text-gray-400">Used {editingUser.usedStorage}</span>
                  </div>
                  <div className="flex gap-2">
                    <input type="number" required min="1" step="any" value={storageValue} onChange={(e) => setStorageValue(e.target.value)} className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-[#1a1a1a] transition-all" placeholder="e.g. 10" />
                    <select value={storageUnit} onChange={(e) => setStorageUnit(e.target.value)} className="w-20 px-2 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm outline-none">
                      <option value="MB">MB</option>
                      <option value="GB">GB</option>
                      <option value="TB">TB</option>
                    </select>
                  </div>
                </section>

                {/* Features — account-wide switches */}
                <section>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Features</p>
                  <div className="space-y-3">
                    <div className={`p-3.5 rounded-xl border transition-colors ${aiSearchEnabled ? 'border-[#1a1a1a] bg-[#1a1a1a]/[0.03]' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button type="button" role="switch" aria-checked={aiSearchEnabled} aria-label="AI search" onClick={() => setAiSearchEnabled(!aiSearchEnabled)} className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${aiSearchEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${aiSearchEnabled ? 'left-[22px]' : 'left-0.5'}`} />
                          </button>
                          <span className={`flex w-8 h-8 shrink-0 items-center justify-center rounded-lg ${aiSearchEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                            <Search className="w-4 h-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-gray-900 leading-tight">AI search</p>
                            <p className="text-[11px] text-gray-500">{aiSearchEnabled ? 'Library + keyword search is visible' : 'Library is hidden, search is disabled'}</p>
                          </div>
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold ${aiSearchEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>{aiSearchEnabled ? 'ON' : 'OFF'}</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Delivery limits — per delivery-type quotas */}
                <section>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Delivery limits</p>
                  {/* Tabs */}
                  <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-xl">
                    <button type="button" onClick={() => setActiveLimitTab('normal')} className={`px-3 py-2 text-[13px] font-semibold rounded-lg transition-all ${activeLimitTab === 'normal' ? 'bg-white text-[#1a1a1a] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      Normal delivery
                      <span className="block text-[10px] font-normal opacity-70">Find People</span>
                    </button>
                    <button type="button" onClick={() => setActiveLimitTab('guest')} className={`px-3 py-2 text-[13px] font-semibold rounded-lg transition-all ${activeLimitTab === 'guest' ? 'bg-white text-[#1a1a1a] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      Guest delivery
                      <span className="block text-[10px] font-normal opacity-70">Face matching</span>
                    </button>
                  </div>
                  <div className="mt-3 space-y-3">
                {activeLimitTab === 'normal' ? (
                  <>
                    <div className={`p-3.5 rounded-xl border transition-colors ${normalFeature ? 'border-[#1a1a1a] bg-[#1a1a1a]/[0.03]' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button type="button" role="switch" aria-checked={normalFeature} onClick={() => toggleNormalFeature(!normalFeature)} className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${normalFeature ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${normalFeature ? 'left-[22px]' : 'left-0.5'}`} />
                          </button>
                          <span className={`flex w-8 h-8 shrink-0 items-center justify-center rounded-lg ${normalFeature ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                            <ScanFace className="w-4 h-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-gray-900 leading-tight">Face recognition</p>
                            <p className="text-[11px] text-gray-500">{normalFeature ? 'Find People button is visible' : 'Find People button is hidden'}</p>
                          </div>
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold ${normalFeature ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>{normalFeature ? 'ON' : 'OFF'}</span>
                      </div>
                    </div>
                    <div className={normalFeature ? '' : 'opacity-50 pointer-events-none'}>
                    <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/60">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <button type="button" role="switch" aria-checked={normalImageEnabled} onClick={() => setNormalImageEnabled(!normalImageEnabled)} className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${normalImageEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${normalImageEnabled ? 'left-4' : 'left-0.5'}`} />
                          </button>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-gray-800 leading-tight">Face images</p>
                            <p className="text-[11px] text-gray-400">Used {editingUser.normalImageUsed.toLocaleString()}</p>
                          </div>
                        </div>
                        {normalImageEnabled && (
                          <label className="flex items-center gap-1 text-[11px] text-gray-500 cursor-pointer shrink-0"><input type="checkbox" checked={normalImageUnlimited} onChange={(e) => setNormalImageUnlimited(e.target.checked)} className="rounded" />∞</label>
                        )}
                      </div>
                      {normalImageEnabled ? (
                        <input type="number" min="1" step="1" disabled={normalImageUnlimited} value={normalImageLimit} onChange={(e) => setNormalImageLimit(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1a1a1a] disabled:bg-gray-100 disabled:text-gray-400" placeholder={normalImageUnlimited ? 'Unlimited' : 'e.g. 500'} />
                      ) : (
                        <p className="text-[11px] font-medium text-gray-500 bg-gray-100 rounded-lg px-2.5 py-2">Disabled for this user</p>
                      )}
                    </div>
                    <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/60">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <button type="button" role="switch" aria-checked={normalFaceEnabled} onClick={() => setNormalFaceEnabled(!normalFaceEnabled)} className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${normalFaceEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${normalFaceEnabled ? 'left-4' : 'left-0.5'}`} />
                          </button>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-gray-800 leading-tight">Deliveries</p>
                            <p className="text-[11px] text-gray-400">Used {editingUser.normalFaceUsed.toLocaleString()}</p>
                          </div>
                        </div>
                        {normalFaceEnabled && (
                          <label className="flex items-center gap-1 text-[11px] text-gray-500 cursor-pointer shrink-0"><input type="checkbox" checked={normalFaceUnlimited} onChange={(e) => setNormalFaceUnlimited(e.target.checked)} className="rounded" />∞</label>
                        )}
                      </div>
                      {normalFaceEnabled ? (
                        <div className="space-y-2">
                          <div className="flex gap-1.5">
                            <button type="button" onClick={() => { setNormalFaceUnlimited(false); setNormalFaceLimit('1'); }} className={`flex-1 px-2 py-1.5 text-[11px] rounded-lg border font-semibold ${!normalFaceUnlimited && normalFaceLimit === '1' ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]' : 'bg-white text-gray-600 border-gray-200'}`}>1</button>
                            <button type="button" onClick={() => { setNormalFaceUnlimited(false); if (normalFaceLimit === '1' || !normalFaceLimit) setNormalFaceLimit('5'); }} className={`flex-1 px-2 py-1.5 text-[11px] rounded-lg border font-semibold ${!normalFaceUnlimited && Number(normalFaceLimit) > 1 ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]' : 'bg-white text-gray-600 border-gray-200'}`}>Multiple</button>
                            <button type="button" onClick={() => { setNormalFaceUnlimited(true); setNormalFaceLimit(''); }} className={`flex-1 px-2 py-1.5 text-[11px] rounded-lg border font-semibold ${normalFaceUnlimited ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]' : 'bg-white text-gray-600 border-gray-200'}`}>∞</button>
                          </div>
                          {!normalFaceUnlimited && (
                            <input type="number" min="1" step="1" value={normalFaceLimit} onChange={(e) => setNormalFaceLimit(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1a1a1a]" placeholder="e.g. 5" />
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] font-medium text-gray-500 bg-gray-100 rounded-lg px-2.5 py-2">Disabled for this user</p>
                      )}
                    </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`p-3.5 rounded-xl border transition-colors ${guestFeature ? 'border-[#1a1a1a] bg-[#1a1a1a]/[0.03]' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button type="button" role="switch" aria-checked={guestFeature} onClick={() => toggleGuestFeature(!guestFeature)} className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${guestFeature ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${guestFeature ? 'left-[22px]' : 'left-0.5'}`} />
                          </button>
                          <span className={`flex w-8 h-8 shrink-0 items-center justify-center rounded-lg ${guestFeature ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                            <ScanFace className="w-4 h-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-gray-900 leading-tight">Face recognition</p>
                            <p className="text-[11px] text-gray-500">{guestFeature ? 'Face matching is active' : 'Face matching is hidden'}</p>
                          </div>
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold ${guestFeature ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>{guestFeature ? 'ON' : 'OFF'}</span>
                      </div>
                    </div>
                    <div className={guestFeature ? '' : 'opacity-50 pointer-events-none'}>
                    <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/60">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <button type="button" role="switch" aria-checked={guestImageEnabled} onClick={() => setGuestImageEnabled(!guestImageEnabled)} className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${guestImageEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${guestImageEnabled ? 'left-4' : 'left-0.5'}`} />
                          </button>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-gray-800 leading-tight">Face images</p>
                            <p className="text-[11px] text-gray-400">Used {editingUser.guestImageUsed.toLocaleString()}</p>
                          </div>
                        </div>
                        {guestImageEnabled && (
                          <label className="flex items-center gap-1 text-[11px] text-gray-500 cursor-pointer shrink-0"><input type="checkbox" checked={guestImageUnlimited} onChange={(e) => setGuestImageUnlimited(e.target.checked)} className="rounded" />∞</label>
                        )}
                      </div>
                      {guestImageEnabled ? (
                        <input type="number" min="1" step="1" disabled={guestImageUnlimited} value={guestImageLimit} onChange={(e) => setGuestImageLimit(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1a1a1a] disabled:bg-gray-100 disabled:text-gray-400" placeholder={guestImageUnlimited ? 'Unlimited' : 'e.g. 500'} />
                      ) : (
                        <p className="text-[11px] font-medium text-gray-500 bg-gray-100 rounded-lg px-2.5 py-2">Disabled for this user</p>
                      )}
                    </div>
                    <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/60">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <button type="button" role="switch" aria-checked={guestFaceEnabled} onClick={() => setGuestFaceEnabled(!guestFaceEnabled)} className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${guestFaceEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${guestFaceEnabled ? 'left-4' : 'left-0.5'}`} />
                          </button>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-gray-800 leading-tight">Deliveries</p>
                            <p className="text-[11px] text-gray-400">Used {editingUser.guestFaceUsed.toLocaleString()}</p>
                          </div>
                        </div>
                        {guestFaceEnabled && (
                          <label className="flex items-center gap-1 text-[11px] text-gray-500 cursor-pointer shrink-0"><input type="checkbox" checked={guestFaceUnlimited} onChange={(e) => setGuestFaceUnlimited(e.target.checked)} className="rounded" />∞</label>
                        )}
                      </div>
                      {guestFaceEnabled ? (
                        <div className="space-y-2">
                          <div className="flex gap-1.5">
                            <button type="button" onClick={() => { setGuestFaceUnlimited(false); setGuestFaceLimit('1'); }} className={`flex-1 px-2 py-1.5 text-[11px] rounded-lg border font-semibold ${!guestFaceUnlimited && guestFaceLimit === '1' ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]' : 'bg-white text-gray-600 border-gray-200'}`}>1</button>
                            <button type="button" onClick={() => { setGuestFaceUnlimited(false); if (guestFaceLimit === '1' || !guestFaceLimit) setGuestFaceLimit('5'); }} className={`flex-1 px-2 py-1.5 text-[11px] rounded-lg border font-semibold ${!guestFaceUnlimited && Number(guestFaceLimit) > 1 ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]' : 'bg-white text-gray-600 border-gray-200'}`}>Multiple</button>
                            <button type="button" onClick={() => { setGuestFaceUnlimited(true); setGuestFaceLimit(''); }} className={`flex-1 px-2 py-1.5 text-[11px] rounded-lg border font-semibold ${guestFaceUnlimited ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]' : 'bg-white text-gray-600 border-gray-200'}`}>∞</button>
                          </div>
                          {!guestFaceUnlimited && (
                            <input type="number" min="1" step="1" value={guestFaceLimit} onChange={(e) => setGuestFaceLimit(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1a1a1a]" placeholder="e.g. 1" />
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] font-medium text-gray-500 bg-gray-100 rounded-lg px-2.5 py-2">Disabled for this user</p>
                      )}
                    </div>
                    </div>
                  </>
                )}
                  </div>
                </section>
              </div>

              <div className="px-5 py-4 flex items-center justify-end gap-2.5 border-t border-gray-100 shrink-0 bg-gray-50/60">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-gray-200 bg-white text-gray-700 text-[13px] font-semibold rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 bg-[#1a1a1a] text-white text-[13px] font-semibold rounded-xl hover:bg-black transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  {updating && <AppSpinner size="xs" />}
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagement;
