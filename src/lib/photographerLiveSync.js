import { subscribeSse, apiFetch } from './api/client';
import { photographerQuotaService, QUOTA_CHANGED_EVENT } from '../services/photographerQuota.service';
import { userStorageService, STORAGE_CHANGED_EVENT } from '../services/userStorage.service';

export const PHOTOGRAPHER_LIVE_CHANNEL = 'pixnxt-photographer-live';
export const PHOTOGRAPHER_LIMITS_EVENT = 'pixnxt-photographer-limits';
const PROFILE_CACHE_PREFIX = 'photographer_profile_';

/**
 * Instant quota/feature sync between admin and photographer, both directions.
 *
 * - Admin saves limits in User Management -> photographer's open app updates
 *   within ~a second (Workers SSE photographer events).
 * - Photographer uploads / creates deliveries (usage counters bump on their
 *   profile row) -> admin tables refresh.
 * - Same-browser tabs also sync instantly via BroadcastChannel + window event,
 *   so no reload is needed even before the SSE event arrives.
 *
 * All subscriptions fail soft: if SSE is unavailable, the existing
 * quota-cache TTL + manual refreshes keep working as before.
 */
export function handlePhotographerLiveUpdate(photographerId, row) {
  if (!photographerId) return;
  try {
    if (row && typeof row === 'object') {
      localStorage.setItem(`${PROFILE_CACHE_PREFIX}${photographerId}`, JSON.stringify(row));
    }
  } catch {
    /* ignore quota */
  }
  try {
    photographerQuotaService.invalidate(photographerId);
  } catch {
    /* ignore */
  }
  try {
    userStorageService.invalidateCachedStorage(photographerId);
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent(QUOTA_CHANGED_EVENT));
    window.dispatchEvent(new CustomEvent(STORAGE_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

/** Detect whether admin-facing limit/feature fields changed (skip no-op polls). */
export function photographerLimitsFingerprint(row) {
  if (!row || typeof row !== 'object') return '';
  const keys = [
    'storage_limit_bytes', 'storage_limit_gb', 'plan',
    'image_limit', 'face_matching_delivery_limit',
    'face_normal_image_limit', 'face_guest_image_limit',
    'face_normal_delivery_limit', 'face_guest_delivery_limit',
    'face_normal_enabled', 'face_guest_enabled', 'ai_search_enabled',
    'album_limit', 'delivery_limit',
    'face_normal_image_used', 'face_guest_image_used',
    'face_normal_delivery_used', 'face_guest_delivery_used',
    'album_used_count', 'delivery_used_count', 'storage_used_bytes',
  ];
  return keys.map((k) => `${k}:${row[k] ?? ''}`).join('|');
}

/** Tell other tabs on this browser that a photographer's limits changed. */
export function broadcastPhotographerLimitsChanged(photographerId) {
  if (!photographerId) return;
  handlePhotographerLiveUpdate(photographerId);
  const payload = { photographerId, at: Date.now() };
  try {
    localStorage.setItem(`${PHOTOGRAPHER_LIMITS_EVENT}:${photographerId}`, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
  try {
    window.dispatchEvent(new CustomEvent(PHOTOGRAPHER_LIMITS_EVENT, { detail: payload }));
  } catch {
    /* ignore */
  }
  try {
    const channel = new BroadcastChannel(PHOTOGRAPHER_LIVE_CHANNEL);
    channel.postMessage({ type: 'LIMITS_CHANGED', ...payload });
    channel.close();
  } catch {
    /* BroadcastChannel optional */
  }
}

/** Listen for same-browser limit broadcasts for one photographer (or all when id is null). */
export function onPhotographerLimitsBroadcast(photographerIdOrNull, callback) {
  if (typeof callback !== 'function') return () => {};
  const matches = (id) => !photographerIdOrNull || String(id) === String(photographerIdOrNull);
  const handlePayload = (payload) => {
    if (!payload || !matches(payload.photographerId)) return;
    callback(payload);
  };
  const onCustom = (event) => handlePayload(event.detail);
  window.addEventListener(PHOTOGRAPHER_LIMITS_EVENT, onCustom);
  const onStorage = (event) => {
    if (!event.key?.startsWith(`${PHOTOGRAPHER_LIMITS_EVENT}:`) || !event.newValue) return;
    try {
      handlePayload(JSON.parse(event.newValue));
    } catch {
      /* ignore */
    }
  };
  window.addEventListener('storage', onStorage);
  let channel = null;
  try {
    channel = new BroadcastChannel(PHOTOGRAPHER_LIVE_CHANNEL);
    channel.onmessage = (event) => {
      if (event.data?.type === 'LIMITS_CHANGED') handlePayload(event.data);
    };
  } catch {
    /* BroadcastChannel optional */
  }
  return () => {
    window.removeEventListener(PHOTOGRAPHER_LIMITS_EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
    try {
      channel?.close();
    } catch {
      /* ignore */
    }
  };
}

function subscribePhotographers(filter, callback, { galleryId = null, pollMs = 5000 } = {}) {
  if (typeof callback !== 'function') return () => {};
  // Workers-only backend: use SSE (GET /v1/public/gallery/:id/events → gallery-updated)
  // with a polling fallback; otherwise poll the merged profile (includes quotas)
  // every few seconds so admin limit edits show in the studio without a reload.
  let stopped = false;
  let stopSse = () => {};
  let pollTimer = null;
  const refresh = async () => {
    if (stopped) return;
    try {
      if (galleryId) {
        await apiFetch(`/v1/public/gallery/${encodeURIComponent(galleryId)}/photos?limit=1`, { auth: false }).catch(() => null);
      } else if (filter && filter.startsWith('id=eq.')) {
        const id = filter.slice('id=eq.'.length);
        const data = await apiFetch('/v1/me/profile').catch(() => null);
        if (data?.profile && (!id || data.profile.id === id)) callback(data.profile, { source: 'poll' });
        return;
      } else {
        await apiFetch('/v1/me/profile').catch(() => null);
      }
      callback(null, { source: 'poll' });
    } catch {
      // polling is best-effort
    }
  };
  try {
    if (galleryId) {
      stopSse = subscribeSse(`/v1/public/gallery/${encodeURIComponent(galleryId)}/events`, {
        onEvent: (_data, _event, type) => {
          if (stopped) return;
          if (!type || type === 'gallery-updated') callback(null, { source: 'sse', type: type || 'gallery-updated' });
        },
      });
    }
  } catch {
    // SSE optional — polling covers it
  }
  // Immediate poll so the first admin change is not delayed by pollMs.
  void refresh();
  pollTimer = setInterval(refresh, Math.max(3000, Number(pollMs) || 5000));
  return () => {
    stopped = true;
    try {
      stopSse?.();
    } catch {
      /* ignore */
    }
    if (pollTimer) clearInterval(pollTimer);
  };
}

/** Live UPDATEs for one photographer's row (photographer app + admin editor). */
export function subscribePhotographerRow(photographerId, onRow, options) {
  if (!photographerId) return () => {};
  return subscribePhotographers(`id=eq.${photographerId}`, onRow, options);
}

/** Live UPDATEs for every photographer row (admin list pages + dashboard). */
export function subscribeAllPhotographers(onAny, options) {
  return subscribePhotographers(null, onAny, options);
}
