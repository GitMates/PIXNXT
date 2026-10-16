import React, { useState, useEffect, useRef } from 'react';
import { Search, User, AlertCircle, X, HardDrive, ScanFace, Send, Pencil, Images, RotateCcw } from 'lucide-react';
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
  AdminUsageMeter,
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

/** Small on/off switch used inside quota cards. */
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

/** Feature row switch (modal master toggles). */
function FeatureSwitch({ checked, onChange, label }) {
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

const featureRowShell = (on) =>
  on
    ? 'border-[var(--ad-accent)] bg-[color-mix(in_srgb,var(--ad-accent)_8%,var(--ad-card))]'
    : 'border-[var(--ad-line)] bg-[var(--ad-sunk)]';

const onOffChip = (on) =>
  on ? 'bg-[var(--ad-ok-bg)] text-[var(--ad-ok)]' : 'bg-[var(--ad-sunk)] ad-muted-text';

const iconWell = (on) =>
  on ? 'bg-[var(--ad-ok-bg)] text-[var(--ad-ok)]' : 'bg-[var(--ad-sunk)] ad-muted-text';

const unlimitedBannerClass =
  'flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--ad-ok-bg)] border border-[color-mix(in_srgb,var(--ad-ok)_25%,var(--ad-line))] text-[var(--ad-ok)]';

const quotaInputClass =
  'ad-input w-full px-3 py-2 ad-sunk border border-[var(--ad-line)] rounded-xl text-sm outline-none';

/** "Reset used to 0" action with undo. Visible only when there is usage to clear. */
function ResetUsedButton({ flagged, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={flagged ? 'Undo reset' : 'Reset used count to 0 on save'}
      className={`inline-flex shrink-0 items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${flagged ? 'bg-[var(--ad-warn-bg)] text-[var(--ad-warn)] hover:opacity-90' : 'ad-faint-text hover:text-[var(--ad-bad)] hover:bg-[var(--ad-bad-bg)]'}`}
    >
      <RotateCcw className="w-3 h-3" />
      {flagged ? 'Undo' : 'Reset'}
    </button>
  );
}

/** "Used X" subtitle that reflects a pending reset. */
function UsedLabel({ used, wasUsed, resetFlag }) {
  if (resetFlag) {
    return (
      <span>
        Used 0{' '}
        <span className="text-[var(--ad-warn)] font-medium">
          (was {Number(wasUsed || 0).toLocaleString()} · resets on save)
        </span>
      </span>
    );
  }
  return <span>Used {Number(used || 0).toLocaleString()}</span>;
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

/** Quota card shell with toggle + icon header. */
function QuotaCard({ toggle, icon, title, usedLine, actions, children }) {
  return (
    <div className="ad-card rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        {toggle}
        {icon}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold ad-ink leading-tight">{title}</p>
          <p className="text-[11px] ad-faint-text">{usedLine}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

/** Segmented 1 / Multiple / ∞ picker for delivery limits. */
/** Map one photographers row (split or legacy) to the table/modal shape. */
function mapPhotographerRow(p) {
  // Legacy image_limit / face_matching_delivery_limit are single buckets.
  // Only Normal images and Guest deliveries may fall back to them — never both
  // tabs to the same column (that made Guest edits appear under Normal).
  const nImgLimit = p.face_normal_image_limit != null
    ? Number(p.face_normal_image_limit)
    : (p.image_limit != null ? Number(p.image_limit) : 0);
  const gImgLimit = p.face_guest_image_limit != null ? Number(p.face_guest_image_limit) : 0;
  const nFaceLimit = p.face_normal_delivery_limit != null ? Number(p.face_normal_delivery_limit) : 0;
  const gFaceLimit = p.face_guest_delivery_limit != null
    ? Number(p.face_guest_delivery_limit)
    : (p.face_matching_delivery_limit != null ? Number(p.face_matching_delivery_limit) : 0);
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
    // Split — when admin attached live_face_split, trust those counts so Guest
    // Delivery Face AI does not fall back into Normal via legacy columns.
    normalImageUsed: (() => {
      if (p.live_face_split) return Number(p.face_normal_image_used) || 0;
      const leg = Number(p.image_used_count) || 0;
      const q = p.face_normal_image_used;
      if (q == null || q === '') return leg;
      const n = Number(q) || 0;
      return n === 0 && leg > 0 ? leg : n;
    })(),
    normalImageLimit: nImgLimit,
    guestImageUsed: Number(p.face_guest_image_used) || 0,
    guestImageLimit: gImgLimit,
    normalFaceUsed: (() => {
      if (p.live_face_split) return Number(p.face_normal_delivery_used) || 0;
      const leg = Number(p.face_matching_delivery_used) || 0;
      const q = p.face_normal_delivery_used;
      if (q == null || q === '') return leg;
      const n = Number(q) || 0;
      return n === 0 && leg > 0 ? leg : n;
    })(),
    normalFaceLimit: nFaceLimit,
    guestFaceUsed: (() => {
      if (p.live_face_split) return Number(p.face_guest_delivery_used) || 0;
      const leg = Number(p.face_matching_delivery_used) || 0;
      const q = p.face_guest_delivery_used;
      if (q == null || q === '') return leg;
      const n = Number(q) || 0;
      return n === 0 && leg > 0 ? leg : n;
    })(),
    guestFaceLimit: gFaceLimit,
  };
}

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

const AdminQuotas = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [migrationWarning, setMigrationWarning] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [editingUser, setEditingUser] = useState(null);
  // Tracks which user's modal is open so the live-refresh below never
  // overwrites a closed modal or a different user.
  const editingIdRef = useRef(null);
  const closeLimitsEditor = () => {
    editingIdRef.current = null;
    setEditingUser(null);
  };
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
  // Pending "reset used to 0" flags (applied on Save, per counter)
  const [resetUsed, setResetUsed] = useState({
    normalImage: false,
    normalFace: false,
    guestImage: false,
    guestFace: false,
  });
  const toggleResetUsed = (key) =>
    setResetUsed((prev) => ({ ...prev, [key]: !prev[key] }));
  const [updating, setUpdating] = useState(false);
  const [activeLimitTab, setActiveLimitTab] = useState('normal');

  const fetchUsers = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    setMigrationWarning(null);

    // Workers: quotas are flattened onto each row.
    try {
      const res = await apiFetch('/v1/admin/photographers?limit=500');
      setUsers((res?.photographers || []).map(mapPhotographerRow));
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to load users.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Ref so the live subscription always calls the latest fetch without re-subscribing.
  const fetchUsersRef = useRef(fetchUsers);
  fetchUsersRef.current = fetchUsers;

  useEffect(() => {
    fetchUsersRef.current();
    // Instant sync both directions: photographer uploads (recount triggers bump
    // *_used on their row) and other admins' saves refresh this table live.
    // Debounced — bulk uploads fire one photographers UPDATE per photo.
    // Silent refresh so live polls never flash the full-page loader.
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

  const initTriState = (limit) => {
    const isDisabled = Number(limit) === -1;
    return {
      enabled: !isDisabled,
      unlimited: !isDisabled && !(Number(limit) > 0),
      value: Number(limit) > 0 ? String(limit) : '',
    };
  };

  const initEditorFromRow = (row) => {
    const storage = splitStorageDisplay(row.totalStorage);
    setEditingUser(row);
    setStorageValue(storage.value);
    setStorageUnit(storage.unit);

    const nImg = initTriState(row.normalImageLimit);
    setNormalImageEnabled(nImg.enabled);
    setNormalImageUnlimited(nImg.unlimited);
    setNormalImageLimit(nImg.value);

    const gImg = initTriState(row.guestImageLimit);
    setGuestImageEnabled(gImg.enabled);
    setGuestImageUnlimited(gImg.unlimited);
    setGuestImageLimit(gImg.value);

    const nFace = initTriState(row.normalFaceLimit);
    setNormalFaceEnabled(nFace.enabled);
    setNormalFaceUnlimited(nFace.unlimited);
    setNormalFaceLimit(nFace.value);

    const gFace = initTriState(row.guestFaceLimit);
    setGuestFaceEnabled(gFace.enabled);
    setGuestFaceUnlimited(gFace.unlimited);
    setGuestFaceLimit(gFace.value);

    setNormalFeature(row.normalFeature !== false);
    setGuestFeature(row.guestFeature !== false);
    setAiSearchEnabled(row.aiSearch !== false);
    setResetUsed({ normalImage: false, normalFace: false, guestImage: false, guestFace: false });
    setActiveLimitTab('normal');
  };

  const openLimitsEditor = (user) => {
    // Show instantly from the table row, then refetch that photographer's row
    // live — *_used counters are trigger-recomputed on every upload/delete,
    // so the table snapshot can be stale (e.g. modal said "0 of 1 used"
    // while the sidebar already showed "3/1").
    const userId = user.id;
    editingIdRef.current = userId;
    initEditorFromRow(user);
    (async () => {
      try {
        // No single-GET endpoint — refresh from the flattened list.
        const res = await apiFetch(`/v1/admin/photographers?limit=500&search=${encodeURIComponent(userId)}`);
        const row = (res?.photographers || []).find((p) => p.id === userId) || null;
        if (!row || editingIdRef.current !== userId) return;
        const mapped = mapPhotographerRow(row);
        initEditorFromRow(mapped);
        setUsers((prev) => prev.map((u) => (u.id === userId ? mapped : u)));
      } catch {
        /* keep table snapshot on failure */
      }
    })();
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

      // Legacy single-bucket columns must stay single-purpose so reads never
      // re-couple the tabs: image_limit → Normal, face_matching → Guest.
      const splitPayload = {
        storage_limit_bytes: Math.round(parsedStorage * multiplier),
        image_limit: parsedNormalImages,
        face_matching_delivery_limit: parsedGuestFace,
        face_normal_image_limit: parsedNormalImages,
        face_guest_image_limit: parsedGuestImages,
        face_normal_delivery_limit: parsedNormalFace,
        face_guest_delivery_limit: parsedGuestFace,
        face_normal_enabled: normalFeature,
        face_guest_enabled: guestFeature,
        ai_search_enabled: aiSearchEnabled,
        // Usage resets: zero only the counters the admin flagged. Note the DB
        // recounts these from source tables on the next upload/delete trigger,
        // so a reset gives fresh headroom until counts rebuild naturally.
        ...(resetUsed.normalImage ? { face_normal_image_used: 0 } : {}),
        ...(resetUsed.guestImage ? { face_guest_image_used: 0 } : {}),
        ...(resetUsed.normalFace ? { face_normal_delivery_used: 0 } : {}),
        ...(resetUsed.guestFace ? { face_guest_delivery_used: 0 } : {}),
        // Legacy mirrors (used by older clients as fallback).
        ...(resetUsed.normalImage && resetUsed.guestImage ? { image_used_count: 0 } : {}),
        ...(resetUsed.guestFace ? { face_matching_delivery_used: 0 } : {}),
      };
      // Quota keys pass straight through to the Workers backend.
      const res = await apiFetch(`/v1/admin/photographers/${editingUser.id}`, {
        method: 'PATCH',
        body: splitPayload,
      });
      if (Array.isArray(res?.warnings) && res.warnings.length) {
        alert(`Saved with warnings:\n${res.warnings.join('\n')}`);
      }
      closeLimitsEditor();
      fetchUsers();
      broadcastPhotographerLimitsChanged(editingUser.id);
    } catch (err) {
      alert(err.message || 'Failed to update account limits.');
    } finally {
      setUpdating(false);
    }
  };

  const isCappedLimit = (limit) => Number(limit) > 0;
  const isDisabledLimit = (limit) => Number(limit) === -1;

  const quotaPairsOf = (u) => [
    [u.normalImageUsed, u.normalImageLimit],
    [u.guestImageUsed, u.guestImageLimit],
    [u.normalFaceUsed, u.normalFaceLimit],
    [u.guestFaceUsed, u.guestFaceLimit],
  ];

  const isUserAtLimit = (u) =>
    quotaPairsOf(u).some(([used, limit]) => isCappedLimit(limit) && Number(used || 0) >= Number(limit));

  const isUserDisabled = (u) =>
    u.normalFeature === false ||
    u.guestFeature === false ||
    quotaPairsOf(u).some(([, limit]) => isDisabledLimit(limit));

  // Analysis strip (click a card to filter).
  const analysis = {
    total: users.length,
    atLimit: users.filter(isUserAtLimit).length,
    disabled: users.filter(isUserDisabled).length,
    aiSearchOff: users.filter((u) => u.aiSearch === false).length,
  };

  const planOptions = [...new Set(users.map((u) => u.plan || 'Unknown'))];

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    if (q && !(u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))) return false;
    if (planFilter !== 'all' && (u.plan || 'Unknown') !== planFilter) return false;
    if (statusFilter === 'at-limit' && !isUserAtLimit(u)) return false;
    if (statusFilter === 'disabled' && !isUserDisabled(u)) return false;
    if (statusFilter === 'ai-search-off' && u.aiSearch !== false) return false;
    if (statusFilter === 'face-off' && !(u.normalFeature === false || u.guestFeature === false)) return false;
    return true;
  });

  const filtersActive = Boolean(searchQuery) || planFilter !== 'all' || statusFilter !== 'all';
  const clearFilters = () => {
    setSearchQuery('');
    setPlanFilter('all');
    setStatusFilter('all');
  };

  return (
    <div className="space-y-6 relative">
      <AdminPageHeader
        title="Quotas & Limits"
        subtitle="Storage, face images, and delivery caps for every photographer."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { key: 'all', label: 'Photographers', value: analysis.total, tone: undefined },
          { key: 'at-limit', label: 'At quota limit', value: analysis.atLimit, tone: 'danger' },
          { key: 'disabled', label: 'Quotas disabled', value: analysis.disabled, tone: undefined },
          { key: 'ai-search-off', label: 'Library off', value: analysis.aiSearchOff, tone: 'warn' },
        ].map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setStatusFilter((prev) => (prev === s.key ? 'all' : s.key))}
            className={`text-left rounded-2xl transition-all ${statusFilter === s.key ? 'ring-2 ring-[var(--ad-accent)] ring-offset-2' : ''}`}
          >
            <AdminStatCard
              label={s.label}
              value={loading ? '—' : s.value.toLocaleString()}
              loading={loading}
              tone={s.tone}
              meter={analysis.total ? (s.value / Math.max(1, analysis.total)) * 100 : 0}
            />
          </button>
        ))}
      </div>

      <div className="ad-card p-4 rounded-2xl shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ad-faint-text" />
            <input
              type="text"
              placeholder="Search users by name or email..."
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
              aria-label="Filter by status"
              className="ad-input px-3 py-2 ad-sunk border border-[var(--ad-line)] rounded-xl text-sm outline-none"
            >
              <option value="all">All statuses</option>
              <option value="at-limit">At quota limit</option>
              <option value="disabled">Quotas disabled</option>
              <option value="ai-search-off">Library off</option>
              <option value="face-off">Face recognition off</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs ad-muted-text">
            Showing <span className="font-semibold ad-ink">{filteredUsers.length}</span> of <span className="font-semibold ad-ink">{users.length}</span> photographers
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
          <h3 className="text-[var(--ad-bad)] font-semibold mb-1">Failed to load users</h3>
          <p className="text-[var(--ad-bad)] text-sm max-w-md opacity-90">{error}</p>
        </div>
      )}

      {!error && loading && (
        <AppLoader label="Fetching user records" variant="page-short" />
      )}

      {!error && !loading && (
        <div className="ad-panel ad-card overflow-hidden">
          {/* No horizontal scroll: grouped columns fit the container */}
          <div className="overflow-hidden">
            <table className="w-full text-left text-sm" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-[var(--ad-sunk)] border-b border-[var(--ad-line)]">
                <tr>
                  <th className="px-5 py-3.5 font-semibold ad-muted-text text-xs uppercase tracking-wider" style={{ width: '26%' }}>Photographer</th>
                  <th className="px-4 py-3.5 font-semibold ad-muted-text text-xs uppercase tracking-wider" style={{ width: '20%' }}>
                    <span className="inline-flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5" />Storage</span>
                  </th>
                  <th className="px-4 py-3.5 font-semibold ad-muted-text text-xs uppercase tracking-wider" style={{ width: '22%' }}>
                    <span className="inline-flex items-center gap-1.5"><ScanFace className="w-3.5 h-3.5" />Face images</span>
                    <span className="block text-[10px] font-normal normal-case ad-faint-text mt-0.5">Normal / Guest</span>
                  </th>
                  <th className="px-4 py-3.5 font-semibold ad-muted-text text-xs uppercase tracking-wider" style={{ width: '22%' }}>
                    <span className="inline-flex items-center gap-1.5"><Send className="w-3.5 h-3.5" />Deliveries</span>
                    <span className="block text-[10px] font-normal normal-case ad-faint-text mt-0.5">Normal / Guest</span>
                  </th>
                  <th className="px-4 py-3.5 font-semibold ad-muted-text text-xs uppercase tracking-wider text-right" style={{ width: '10%' }}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ad-line)]">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <p className="ad-muted-text">
                        {filtersActive ? 'No photographers match the current filters.' : 'No photographers yet.'}
                      </p>
                      {filtersActive && (
                        <button type="button" onClick={clearFilters} className="ad-btn-primary mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-colors">
                          <X className="w-3.5 h-3.5" />Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="ad-row transition-colors align-top">
                      <td className="px-5 py-4 min-w-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="ad-avatar w-9 h-9 rounded-full flex items-center justify-center bg-[var(--ad-ink)] text-[var(--ad-card)] shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold ad-ink truncate">{user.name}</p>
                            <p className="ad-muted-text text-xs truncate">{user.email}</p>
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--ad-sunk)] ad-muted-text capitalize">
                              {user.plan} · {user.role}
                            </span>
                            {user.aiSearch === false && (
                              <span className="flex items-center gap-1.5 mt-1.5 text-[11px] font-medium ad-muted-text">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--ad-meter-track)]" />
                                Library off
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 min-w-0">
                        <p className="text-[13px] font-semibold ad-ink">{formatStorageShort(user.usedStorage, user.totalStorage)}</p>
                        <div className="mt-1.5 max-w-[160px]">
                          <MiniBar used={user.rawUsedBytes} limit={user.rawLimitBytes} />
                        </div>
                      </td>
                      <td className="px-4 py-4 min-w-0">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium ad-muted-text w-14 shrink-0">
                              Normal <span className={`w-1.5 h-1.5 rounded-full ${user.normalFeature !== false ? 'bg-[var(--ad-ok)]' : 'bg-[var(--ad-meter-track)]'}`} />
                            </span>
                            {user.normalFeature !== false ? (
                              <QuotaPill used={user.normalImageUsed} limit={user.normalImageLimit} />
                            ) : (
                              <span className="ad-pill ad-pill--muted">OFF</span>
                            )}
                          </div>
                          <MiniBar used={user.normalImageUsed} limit={user.normalFeature !== false ? user.normalImageLimit : -1} />
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium ad-muted-text w-14 shrink-0">
                              Guest <span className={`w-1.5 h-1.5 rounded-full ${user.guestFeature !== false ? 'bg-[var(--ad-ok)]' : 'bg-[var(--ad-meter-track)]'}`} />
                            </span>
                            {user.guestFeature !== false ? (
                              <QuotaPill used={user.guestImageUsed} limit={user.guestImageLimit} />
                            ) : (
                              <span className="ad-pill ad-pill--muted">OFF</span>
                            )}
                          </div>
                          <MiniBar used={user.guestImageUsed} limit={user.guestFeature !== false ? user.guestImageLimit : -1} />
                        </div>
                      </td>
                      <td className="px-4 py-4 min-w-0">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium ad-muted-text w-14 shrink-0">
                              Normal <span className={`w-1.5 h-1.5 rounded-full ${user.normalFeature !== false ? 'bg-[var(--ad-ok)]' : 'bg-[var(--ad-meter-track)]'}`} />
                            </span>
                            {user.normalFeature !== false ? (
                              <QuotaPill used={user.normalFaceUsed} limit={user.normalFaceLimit} />
                            ) : (
                              <span className="ad-pill ad-pill--muted">OFF</span>
                            )}
                          </div>
                          <MiniBar used={user.normalFaceUsed} limit={user.normalFeature !== false ? user.normalFaceLimit : -1} />
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium ad-muted-text w-14 shrink-0">
                              Guest <span className={`w-1.5 h-1.5 rounded-full ${user.guestFeature !== false ? 'bg-[var(--ad-ok)]' : 'bg-[var(--ad-meter-track)]'}`} />
                            </span>
                            {user.guestFeature !== false ? (
                              <QuotaPill used={user.guestFaceUsed} limit={user.guestFaceLimit} />
                            ) : (
                              <span className="ad-pill ad-pill--muted">OFF</span>
                            )}
                          </div>
                          <MiniBar used={user.guestFaceUsed} limit={user.guestFeature !== false ? user.guestFaceLimit : -1} />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => openLimitsEditor(user)}
                          className="ad-action-btn ad-btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors"
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
        <AdminModal
          open
          onClose={closeLimitsEditor}
          title="Edit limits"
          subtitle={`${editingUser.name} · ${editingUser.email}`}
          avatar={(editingUser.name || editingUser.email || 'U').charAt(0).toUpperCase()}
          size="md"
          footer={(
            <AdminModalActions
              onCancel={closeLimitsEditor}
              onSave={() => document.getElementById('admin-edit-limits-form')?.requestSubmit()}
              saving={updating}
            />
          )}
        >
          <form id="admin-edit-limits-form" onSubmit={handleUpdateLimits} className="space-y-5">
                {/* Storage */}
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <span className="ad-field-label">Storage</span>
                    <span className="text-xs ad-faint-text">Used {editingUser.usedStorage}</span>
                  </div>
                  <AdminUsageMeter
                    className="mb-3"
                    used={editingUser.rawUsedBytes}
                    limit={editingUser.rawLimitBytes}
                  />
                  <div className="flex gap-2">
                    <input type="number" required min="1" step="any" value={storageValue} onChange={(e) => setStorageValue(e.target.value)} className="ad-input flex-1 px-3 py-2.5 border border-[var(--ad-line)] bg-[var(--ad-card)] rounded-xl text-sm outline-none" placeholder="e.g. 10" />
                    <select value={storageUnit} onChange={(e) => setStorageUnit(e.target.value)} className="ad-input w-20 px-2 py-2.5 border border-[var(--ad-line)] bg-[var(--ad-card)] rounded-xl text-sm outline-none">
                      <option value="MB">MB</option>
                      <option value="GB">GB</option>
                      <option value="TB">TB</option>
                    </select>
                  </div>
                </section>

                {/* Features — account-wide switches */}
                <section>
                  <p className="ad-field-label mb-2">Features</p>
                  <div className="space-y-3">
                    <div className={`p-3.5 rounded-xl border transition-colors ${featureRowShell(aiSearchEnabled)}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FeatureSwitch checked={aiSearchEnabled} onChange={setAiSearchEnabled} label="AI search" />
                          <span className={`flex w-8 h-8 shrink-0 items-center justify-center rounded-lg ${iconWell(aiSearchEnabled)}`}>
                            <Search className="w-4 h-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold ad-ink leading-tight">AI search</p>
                            <p className="text-[11px] ad-muted-text">{aiSearchEnabled ? 'Library + keyword search is visible' : 'Library is hidden, search is disabled'}</p>
                          </div>
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold ${onOffChip(aiSearchEnabled)}`}>{aiSearchEnabled ? 'ON' : 'OFF'}</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Delivery limits — per delivery-type quotas */}
                <section>
                  <p className="ad-field-label mb-2">Delivery limits</p>
                  {/* Tabs */}
                  <div className="grid grid-cols-2 gap-1 p-1 ad-sunk rounded-xl">
                    <button type="button" onClick={() => setActiveLimitTab('normal')} className={`px-3 py-2 text-[13px] font-semibold rounded-lg transition-all ${activeLimitTab === 'normal' ? 'bg-[var(--ad-card)] ad-ink shadow-sm' : 'ad-muted-text hover:text-[var(--ad-ink)]'}`}>
                      Normal delivery
                      <span className="block text-[10px] font-normal opacity-70">Find People</span>
                    </button>
                    <button type="button" onClick={() => setActiveLimitTab('guest')} className={`px-3 py-2 text-[13px] font-semibold rounded-lg transition-all ${activeLimitTab === 'guest' ? 'bg-[var(--ad-card)] ad-ink shadow-sm' : 'ad-muted-text hover:text-[var(--ad-ink)]'}`}>
                      Guest delivery
                      <span className="block text-[10px] font-normal opacity-70">Face matching</span>
                    </button>
                  </div>
                  <div className="mt-3 space-y-3">
                {activeLimitTab === 'normal' ? (
                  <>
                    <div className={`p-3.5 rounded-xl border transition-colors ${featureRowShell(normalFeature)}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FeatureSwitch checked={normalFeature} onChange={toggleNormalFeature} label="Normal face recognition" />
                          <span className={`flex w-8 h-8 shrink-0 items-center justify-center rounded-lg ${iconWell(normalFeature)}`}>
                            <ScanFace className="w-4 h-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold ad-ink leading-tight">Face recognition</p>
                            <p className="text-[11px] ad-muted-text">{normalFeature ? 'Find People button is visible' : 'Find People button is hidden'}</p>
                          </div>
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold ${onOffChip(normalFeature)}`}>{normalFeature ? 'ON' : 'OFF'}</span>
                      </div>
                    </div>
                    <div className={normalFeature ? '' : 'opacity-50 pointer-events-none'}>
                    <QuotaCard
                      toggle={<CardSwitch checked={normalImageEnabled} onChange={setNormalImageEnabled} label="Normal face images" />}
                      icon={<span className="flex w-8 h-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ad-sunk)] ad-muted-text"><Images className="w-4 h-4" /></span>}
                      title="Face images"
                      usedLine={<UsedLabel used={resetUsed.normalImage ? 0 : editingUser.normalImageUsed} wasUsed={editingUser.normalImageUsed} resetFlag={resetUsed.normalImage} />}
                      actions={<>
                        {normalImageEnabled && (editingUser.normalImageUsed > 0 || resetUsed.normalImage) && (
                          <ResetUsedButton flagged={resetUsed.normalImage} onClick={() => toggleResetUsed('normalImage')} />
                        )}
                        {normalImageEnabled && (
                          <UnlimitedPill unlimited={normalImageUnlimited} onChange={setNormalImageUnlimited} />
                        )}
                      </>}
                    >
                      {normalImageEnabled ? (
                        normalImageUnlimited ? (
                          <div className={unlimitedBannerClass}>
                            <span className="text-lg leading-none font-bold">∞</span>
                            <span className="text-[13px] font-semibold">Unlimited</span>
                            <span className="ml-auto text-[11px] font-normal opacity-80">no cap on uploads</span>
                          </div>
                        ) : (
                          <>
                            <label className="block ad-field-label mb-1.5">Max images</label>
                            <input type="number" min="1" step="1" value={normalImageLimit} onChange={(e) => setNormalImageLimit(e.target.value)} className={quotaInputClass} placeholder="e.g. 500" />
                            {Number(normalImageLimit) > 0 && (
                              <div className="mt-2.5">
                                <MiniBar used={resetUsed.normalImage ? 0 : editingUser.normalImageUsed} limit={Number(normalImageLimit)} />
                                <p className="mt-1 text-[11px] ad-faint-text">
                                  {(resetUsed.normalImage ? 0 : editingUser.normalImageUsed).toLocaleString()} of {Number(normalImageLimit).toLocaleString()} used
                                </p>
                              </div>
                            )}
                          </>
                        )
                      ) : (
                        <p className="text-[11px] font-medium ad-muted-text bg-[var(--ad-sunk)] rounded-xl px-3 py-2.5">Disabled for this user</p>
                      )}
                    </QuotaCard>
                    <QuotaCard
                      toggle={<CardSwitch checked={normalFaceEnabled} onChange={setNormalFaceEnabled} label="Normal deliveries" />}
                      icon={<span className="flex w-8 h-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ad-sunk)] ad-muted-text"><Send className="w-4 h-4" /></span>}
                      title="Deliveries"
                      usedLine={<UsedLabel used={resetUsed.normalFace ? 0 : editingUser.normalFaceUsed} wasUsed={editingUser.normalFaceUsed} resetFlag={resetUsed.normalFace} />}
                      actions={<>
                        {normalFaceEnabled && (editingUser.normalFaceUsed > 0 || resetUsed.normalFace) && (
                          <ResetUsedButton flagged={resetUsed.normalFace} onClick={() => toggleResetUsed('normalFace')} />
                        )}
                      </>}
                    >
                      {normalFaceEnabled ? (
                        <>
                          <LimitSegmented
                            unlimited={normalFaceUnlimited}
                            limitValue={normalFaceLimit}
                            onPickOne={() => { setNormalFaceUnlimited(false); setNormalFaceLimit('1'); }}
                            onPickMultiple={() => { setNormalFaceUnlimited(false); if (normalFaceLimit === '1' || !normalFaceLimit) setNormalFaceLimit('5'); }}
                            onPickUnlimited={() => { setNormalFaceUnlimited(true); setNormalFaceLimit(''); }}
                          />
                          {normalFaceUnlimited ? (
                            <div className={`mt-2.5 ${unlimitedBannerClass}`}>
                              <span className="text-lg leading-none font-bold">∞</span>
                              <span className="text-[13px] font-semibold">Unlimited</span>
                              <span className="ml-auto text-[11px] font-normal opacity-80">no cap on deliveries</span>
                            </div>
                          ) : (
                            <>
                              <label className="mt-2.5 block ad-field-label mb-1.5">Max deliveries</label>
                              <input type="number" min="1" step="1" value={normalFaceLimit} onChange={(e) => setNormalFaceLimit(e.target.value)} className={quotaInputClass} placeholder="e.g. 5" />
                              {Number(normalFaceLimit) > 0 && (
                                <div className="mt-2.5">
                                  <MiniBar used={resetUsed.normalFace ? 0 : editingUser.normalFaceUsed} limit={Number(normalFaceLimit)} />
                                  <p className="mt-1 text-[11px] ad-faint-text">
                                    {(resetUsed.normalFace ? 0 : editingUser.normalFaceUsed).toLocaleString()} of {Number(normalFaceLimit).toLocaleString()} used
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                        </>
                      ) : (
                        <p className="text-[11px] font-medium ad-muted-text bg-[var(--ad-sunk)] rounded-xl px-3 py-2.5">Disabled for this user</p>
                      )}
                    </QuotaCard>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`p-3.5 rounded-xl border transition-colors ${featureRowShell(guestFeature)}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FeatureSwitch checked={guestFeature} onChange={toggleGuestFeature} label="Guest face recognition" />
                          <span className={`flex w-8 h-8 shrink-0 items-center justify-center rounded-lg ${iconWell(guestFeature)}`}>
                            <ScanFace className="w-4 h-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold ad-ink leading-tight">Face recognition</p>
                            <p className="text-[11px] ad-muted-text">{guestFeature ? 'Face matching is active' : 'Face matching is hidden'}</p>
                          </div>
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold ${onOffChip(guestFeature)}`}>{guestFeature ? 'ON' : 'OFF'}</span>
                      </div>
                    </div>
                    <div className={guestFeature ? '' : 'opacity-50 pointer-events-none'}>
                    <QuotaCard
                      toggle={<CardSwitch checked={guestImageEnabled} onChange={setGuestImageEnabled} label="Guest face images" />}
                      icon={<span className="flex w-8 h-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ad-sunk)] ad-muted-text"><Images className="w-4 h-4" /></span>}
                      title="Face images"
                      usedLine={<UsedLabel used={resetUsed.guestImage ? 0 : editingUser.guestImageUsed} wasUsed={editingUser.guestImageUsed} resetFlag={resetUsed.guestImage} />}
                      actions={<>
                        {guestImageEnabled && (editingUser.guestImageUsed > 0 || resetUsed.guestImage) && (
                          <ResetUsedButton flagged={resetUsed.guestImage} onClick={() => toggleResetUsed('guestImage')} />
                        )}
                        {guestImageEnabled && (
                          <UnlimitedPill unlimited={guestImageUnlimited} onChange={setGuestImageUnlimited} />
                        )}
                      </>}
                    >
                      {guestImageEnabled ? (
                        guestImageUnlimited ? (
                          <div className={unlimitedBannerClass}>
                            <span className="text-lg leading-none font-bold">∞</span>
                            <span className="text-[13px] font-semibold">Unlimited</span>
                            <span className="ml-auto text-[11px] font-normal opacity-80">no cap on uploads</span>
                          </div>
                        ) : (
                          <>
                            <label className="block ad-field-label mb-1.5">Max images</label>
                            <input type="number" min="1" step="1" value={guestImageLimit} onChange={(e) => setGuestImageLimit(e.target.value)} className={quotaInputClass} placeholder="e.g. 500" />
                            {Number(guestImageLimit) > 0 && (
                              <div className="mt-2.5">
                                <MiniBar used={resetUsed.guestImage ? 0 : editingUser.guestImageUsed} limit={Number(guestImageLimit)} />
                                <p className="mt-1 text-[11px] ad-faint-text">
                                  {(resetUsed.guestImage ? 0 : editingUser.guestImageUsed).toLocaleString()} of {Number(guestImageLimit).toLocaleString()} used
                                </p>
                              </div>
                            )}
                          </>
                        )
                      ) : (
                        <p className="text-[11px] font-medium ad-muted-text bg-[var(--ad-sunk)] rounded-xl px-3 py-2.5">Disabled for this user</p>
                      )}
                    </QuotaCard>
                    <QuotaCard
                      toggle={<CardSwitch checked={guestFaceEnabled} onChange={setGuestFaceEnabled} label="Guest deliveries" />}
                      icon={<span className="flex w-8 h-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ad-sunk)] ad-muted-text"><Send className="w-4 h-4" /></span>}
                      title="Deliveries"
                      usedLine={<UsedLabel used={resetUsed.guestFace ? 0 : editingUser.guestFaceUsed} wasUsed={editingUser.guestFaceUsed} resetFlag={resetUsed.guestFace} />}
                      actions={<>
                        {guestFaceEnabled && (editingUser.guestFaceUsed > 0 || resetUsed.guestFace) && (
                          <ResetUsedButton flagged={resetUsed.guestFace} onClick={() => toggleResetUsed('guestFace')} />
                        )}
                      </>}
                    >
                      {guestFaceEnabled ? (
                        <>
                          <LimitSegmented
                            unlimited={guestFaceUnlimited}
                            limitValue={guestFaceLimit}
                            onPickOne={() => { setGuestFaceUnlimited(false); setGuestFaceLimit('1'); }}
                            onPickMultiple={() => { setGuestFaceUnlimited(false); if (guestFaceLimit === '1' || !guestFaceLimit) setGuestFaceLimit('5'); }}
                            onPickUnlimited={() => { setGuestFaceUnlimited(true); setGuestFaceLimit(''); }}
                          />
                          {guestFaceUnlimited ? (
                            <div className={`mt-2.5 ${unlimitedBannerClass}`}>
                              <span className="text-lg leading-none font-bold">∞</span>
                              <span className="text-[13px] font-semibold">Unlimited</span>
                              <span className="ml-auto text-[11px] font-normal opacity-80">no cap on deliveries</span>
                            </div>
                          ) : (
                            <>
                              <label className="mt-2.5 block ad-field-label mb-1.5">Max deliveries</label>
                              <input type="number" min="1" step="1" value={guestFaceLimit} onChange={(e) => setGuestFaceLimit(e.target.value)} className={quotaInputClass} placeholder="e.g. 1" />
                              {Number(guestFaceLimit) > 0 && (
                                <div className="mt-2.5">
                                  <MiniBar used={resetUsed.guestFace ? 0 : editingUser.guestFaceUsed} limit={Number(guestFaceLimit)} />
                                  <p className="mt-1 text-[11px] ad-faint-text">
                                    {(resetUsed.guestFace ? 0 : editingUser.guestFaceUsed).toLocaleString()} of {Number(guestFaceLimit).toLocaleString()} used
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                        </>
                      ) : (
                        <p className="text-[11px] font-medium ad-muted-text bg-[var(--ad-sunk)] rounded-xl px-3 py-2.5">Disabled for this user</p>
                      )}
                    </QuotaCard>
                    </div>
                  </>
                )}
                  </div>
                </section>
              </form>
        </AdminModal>
      )}
    </div>
  );
};

export default AdminQuotas;
