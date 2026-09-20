import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { HardDrive, Images, Layers, ScanFace, Users } from 'lucide-react';
import { apiFetch } from '../../lib/api/client';
import { AppSpinner } from '../../components/ui/AppLoading';
import {
  onPhotographerLimitsBroadcast,
  subscribeAllPhotographers,
} from '../../lib/photographerLiveSync';
import {
  AdminPageHeader,
  AdminSection,
  AdminStatCard,
} from '../../components/admin/AdminUi';

const formatBytes = (bytes) => {
  if (!bytes || bytes <= 0) return '0 MB';
  const tb = 1024 * 1024 * 1024 * 1024;
  const gb = 1024 * 1024 * 1024;
  const mb = 1024 * 1024;
  if (bytes >= tb) return `${(bytes / tb).toFixed(2)} TB`;
  if (bytes >= gb) return `${(bytes / gb).toFixed(2)} GB`;
  return `${(bytes / mb).toFixed(1)} MB`;
};

const num = (v) => Number(v) || 0;
const isCapped = (limit) => Number(limit) > 0;
const isDisabledCap = (limit) => Number(limit) === -1;
const isOff = (v) => v === false || v === 0 || v === '0';

/** Same coalesce rules as Admin Quotas / backend flattenAdminPhotographer. */
function faceNormalUsed(p) {
  const leg = num(p.image_used_count);
  if (p.face_normal_image_used == null || p.face_normal_image_used === '') return leg;
  const q = num(p.face_normal_image_used);
  if (q === 0 && leg > 0) return leg;
  return q;
}
function faceGuestUsed(p) {
  return num(p.face_guest_image_used);
}
function faceNormalDeliveryUsed(p) {
  const leg = num(p.face_matching_delivery_used);
  if (p.face_normal_delivery_used == null || p.face_normal_delivery_used === '') return leg;
  const q = num(p.face_normal_delivery_used);
  if (q === 0 && leg > 0) return leg;
  return q;
}
function faceGuestDeliveryUsed(p) {
  const leg = num(p.face_matching_delivery_used);
  if (p.face_guest_delivery_used == null || p.face_guest_delivery_used === '') return leg;
  const q = num(p.face_guest_delivery_used);
  if (q === 0 && leg > 0) return leg;
  return q;
}

function quotaPairsOf(p) {
  return [
    [faceNormalUsed(p), p.face_normal_image_limit],
    [faceGuestUsed(p), p.face_guest_image_limit],
    [faceNormalDeliveryUsed(p), p.face_normal_delivery_limit],
    [faceGuestDeliveryUsed(p), p.face_guest_delivery_limit],
  ];
}

function isAtLimit(p) {
  return quotaPairsOf(p).some(([used, limit]) => isCapped(limit) && num(used) >= Number(limit));
}

function isDisabled(p) {
  return (
    isOff(p.face_normal_enabled) ||
    isOff(p.face_guest_enabled) ||
    quotaPairsOf(p).some(([, limit]) => isDisabledCap(limit))
  );
}

function accountDisabled(p) {
  return p.is_disabled === true || Number(p.is_disabled) === 1;
}

function blockReason(p) {
  const reasons = [];
  if (accountDisabled(p)) reasons.push('Account disabled');
  if (isOff(p.face_normal_enabled)) reasons.push('Find People off');
  if (isOff(p.face_guest_enabled)) reasons.push('Guest matching off');
  if (isOff(p.ai_search_enabled)) reasons.push('Library off');
  const labels = ['Normal images', 'Guest images', 'Normal deliveries', 'Guest deliveries'];
  quotaPairsOf(p).forEach(([used, limit], i) => {
    if (isDisabledCap(limit)) reasons.push(`${labels[i]} disabled`);
    else if (isCapped(limit) && num(used) >= Number(limit)) reasons.push(`${labels[i]} at limit`);
  });
  if (isCapped(p.album_limit) && num(p.album_used_count) >= Number(p.album_limit)) reasons.push('Albums at limit');
  if (isDisabledCap(p.album_limit)) reasons.push('Albums disabled');
  if (isCapped(p.delivery_limit) && num(p.delivery_used_count) >= Number(p.delivery_limit)) reasons.push('Deliveries at limit');
  if (isDisabledCap(p.delivery_limit)) reasons.push('Deliveries disabled');
  if (isCapped(p.storage_limit_bytes) && num(p.storage_used_bytes) >= Number(p.storage_limit_bytes)) {
    reasons.push('Storage at limit');
  }
  return reasons;
}

const AdminDashboard = () => {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async ({ silent = false } = {}) => {
    try {
      const [listRes, statsRes] = await Promise.all([
        apiFetch('/v1/admin/photographers?limit=500'),
        apiFetch('/v1/admin/stats'),
      ]);
      setRows(listRes?.photographers || []);
      setStats(statsRes || null);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      if (!silent) setLoading(false);
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
    let timer = null;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => loadRef.current({ silent: true }), 1500);
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

  const sumLive = (liveKey, usedKey) =>
    rows.reduce((s, p) => s + (p[liveKey] != null ? num(p[liveKey]) : num(p[usedKey])), 0);

  const fromRows = {
    normalImages: rows.reduce((s, p) => s + faceNormalUsed(p), 0),
    guestImages: rows.reduce((s, p) => s + faceGuestUsed(p), 0),
    normalDeliveries: rows.reduce((s, p) => s + faceNormalDeliveryUsed(p), 0),
    guestDeliveries: rows.reduce((s, p) => s + faceGuestDeliveryUsed(p), 0),
  };

  const face = stats?.face || {};
  const normalImages = face.normalImagesUsed != null ? num(face.normalImagesUsed) : fromRows.normalImages;
  const guestImages = face.guestImagesUsed != null ? num(face.guestImagesUsed) : fromRows.guestImages;
  const normalDeliveries = face.normalDeliveriesUsed != null ? num(face.normalDeliveriesUsed) : fromRows.normalDeliveries;
  const guestDeliveries = face.guestDeliveriesUsed != null ? num(face.guestDeliveriesUsed) : fromRows.guestDeliveries;

  const photographerCount = stats?.photographers != null ? num(stats.photographers) : rows.length;
  const deliveryCount = stats?.deliveries != null ? num(stats.deliveries) : 0;
  const storageUsed = stats?.storageUsedBytes != null
    ? num(stats.storageUsedBytes)
    : rows.reduce((s, p) => s + num(p.storage_used_bytes), 0);

  const atLimitRows = rows.filter(
    (p) =>
      accountDisabled(p) ||
      isAtLimit(p) ||
      isDisabled(p) ||
      (isCapped(p.album_limit) && num(p.album_used_count) >= Number(p.album_limit)) ||
      isDisabledCap(p.album_limit) ||
      (isCapped(p.delivery_limit) && num(p.delivery_used_count) >= Number(p.delivery_limit)) ||
      isDisabledCap(p.delivery_limit) ||
      (isCapped(p.storage_limit_bytes) && num(p.storage_used_bytes) >= Number(p.storage_limit_bytes))
  );
  const needsAttention = rows
    .map((p) => ({ p, reasons: blockReason(p) }))
    .filter((r) => r.reasons.length > 0)
    .slice(0, 8);

  return (
    <div className="space-y-7">
      <AdminPageHeader
        title="Overview"
        subtitle="Platform health, Face AI usage, and studios that need attention."
      />

      <AdminSection title="Platform">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <AdminStatCard label="Photographers" value={loading ? '—' : photographerCount.toLocaleString()} loading={loading} to="/admin/users" icon={Users} />
          <AdminStatCard label="Active deliveries" value={loading ? '—' : deliveryCount.toLocaleString()} loading={loading} to="/admin/usage" icon={Images} />
          <AdminStatCard label="Storage used" value={loading ? '—' : formatBytes(storageUsed)} loading={loading} to="/admin/quotas" icon={HardDrive} />
        </div>
      </AdminSection>

      <AdminSection title="Creation">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <AdminStatCard
            label="Albums created"
            value={loading ? '—' : (stats?.albums != null ? num(stats.albums) : sumLive('album_count', 'album_used_count')).toLocaleString()}
            loading={loading}
            to="/admin/usage"
            icon={Layers}
          />
          <AdminStatCard
            label="Deliveries created"
            value={loading ? '—' : (stats?.deliveries != null ? num(stats.deliveries) : sumLive('delivery_count', 'delivery_used_count')).toLocaleString()}
            loading={loading}
            to="/admin/usage"
          />
          <AdminStatCard
            label="At limit / disabled"
            value={loading ? '—' : atLimitRows.length.toLocaleString()}
            sub="Storage, face, albums, deliveries"
            loading={loading}
            to="/admin/quotas"
            tone={atLimitRows.length > 0 ? 'danger' : undefined}
            meter={photographerCount ? (atLimitRows.length / photographerCount) * 100 : 0}
          />
        </div>
      </AdminSection>

      <AdminSection title="Face AI usage">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <AdminStatCard
            label="Normal images used"
            value={loading ? '—' : normalImages.toLocaleString()}
            loading={loading}
            to="/admin/quotas"
            sub="Find People scans"
            icon={ScanFace}
            meter={normalImages + guestImages ? (normalImages / (normalImages + guestImages)) * 100 : 0}
          />
          <AdminStatCard
            label="Guest images used"
            value={loading ? '—' : guestImages.toLocaleString()}
            loading={loading}
            to="/admin/quotas"
            sub="Guest face matching"
            meter={normalImages + guestImages ? (guestImages / (normalImages + guestImages)) * 100 : 0}
          />
          <AdminStatCard
            label="Face deliveries used"
            value={loading ? '—' : (normalDeliveries + guestDeliveries).toLocaleString()}
            loading={loading}
            to="/admin/quotas"
            sub={`Normal ${normalDeliveries.toLocaleString()} · Guest ${guestDeliveries.toLocaleString()}`}
          />
        </div>
      </AdminSection>

      <AdminSection title="Needs attention">
        <div className="bg-white rounded-2xl shadow-sm border border-[#eae8e4] overflow-hidden">
          {loading ? (
            <div className="px-6 py-8 flex justify-center">
              <AppSpinner size="sm" />
            </div>
          ) : needsAttention.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-gray-500">All clear — no photographer is at a limit or disabled.</p>
          ) : (
            <ul className="divide-y divide-[#f0eee9]">
              {needsAttention.map(({ p, reasons }) => (
                <li key={p.id}>
                  <Link to="/admin/quotas" className="ad-row flex items-center gap-3 px-5 py-3.5 hover:bg-[#faf9f7] transition-colors">
                    <div className="ad-avatar w-9 h-9 rounded-full flex items-center justify-center bg-[#1a1a1a] text-white shrink-0 text-sm font-semibold">
                      {(p.display_name || p.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm truncate">{p.display_name || 'Unnamed'}</p>
                      <p className="text-gray-500 text-xs truncate">{p.email}</p>
                      <p className="text-red-700/80 text-xs truncate mt-0.5">{reasons.join(' · ')}</p>
                    </div>
                    <span className="ad-pill ad-pill--bad">
                      Review
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </AdminSection>
    </div>
  );
};

export default AdminDashboard;
