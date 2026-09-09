import { supabase } from './supabase/client';
import { photographerQuotaService, QUOTA_CHANGED_EVENT } from '../services/photographerQuota.service';
import { userStorageService, STORAGE_CHANGED_EVENT } from '../services/userStorage.service';

export const PHOTOGRAPHER_LIVE_CHANNEL = 'pixnxt-photographer-live';
export const PHOTOGRAPHER_LIMITS_EVENT = 'pixnxt-photographer-limits';
const PROFILE_CACHE_PREFIX = 'photographer_profile_';

/**
 * Instant quota/feature sync between admin and photographer, both directions.
 *
 * - Admin saves limits in User Management -> photographer's open app updates
 *   within ~a second (Supabase Realtime postgres_changes on `photographers`).
 * - Photographer uploads / creates deliveries (DB recount triggers bump the
 *   `*_used` counters on their `photographers` row) -> admin tables refresh.
 * - Same-browser tabs also sync instantly via BroadcastChannel + window event,
 *   so no reload is needed even before the realtime event arrives.
 *
 * All subscriptions fail soft: if Realtime is unavailable, the existing
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

function subscribePhotographers(filter, callback) {
  if (typeof callback !== 'function') return () => {};
  let channel = null;
  let closed = false;
  try {
    channel = supabase.channel(
      filter ? `photographer-live:${filter}` : 'photographer-live:all'
    );
    const config = {
      event: 'UPDATE',
      schema: 'public',
      table: 'photographers',
    };
    if (filter) config.filter = filter;
    channel
      .on('postgres_changes', config, (payload) => {
        if (closed) return;
        callback(payload.new || null, payload);
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          try {
            channel?.unsubscribe();
          } catch {
            /* ignore */
          }
        }
      });
  } catch {
    /* Realtime unavailable: callers keep their existing refresh behavior */
  }
  return () => {
    closed = true;
    try {
      channel?.unsubscribe();
    } catch {
      /* ignore */
    }
  };
}

/** Live UPDATEs for one photographer's row (photographer app + admin editor). */
export function subscribePhotographerRow(photographerId, onRow) {
  if (!photographerId) return () => {};
  return subscribePhotographers(`id=eq.${photographerId}`, onRow);
}

/** Live UPDATEs for every photographer row (admin list pages + dashboard). */
export function subscribeAllPhotographers(onAny) {
  return subscribePhotographers(null, onAny);
}
