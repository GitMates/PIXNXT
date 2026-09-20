import { formatStorageBytes } from '../utils/formatStorageBytes';

const inFlightByUser = new Map();

export const STORAGE_CHANGED_EVENT = 'pixnxt-storage-changed';

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

/** Plan cap used by the global sidebar storage meter. */
export function getStorageLimitBytes(profile) {
  const limitBytes = Number(profile?.storage_limit_bytes);
  if (limitBytes > 0) return limitBytes;
  const limitGb = Number(profile?.storage_limit_gb);
  if (limitGb > 0) return limitGb * GB;
  const tier = String(profile?.plan || '').toLowerCase();
  if (tier === 'pro') return 100 * GB;
  if (tier === 'premium') return 500 * GB;
  if (tier === 'free') return 5 * GB;
  return 10 * GB;
}

/** Compact label piece for one side of the storage meter. */
function formatMeterPart(bytes, { asGbUnit = false } = {}) {
  const n = Math.max(0, Number(bytes) || 0);
  if (n <= 0) return asGbUnit ? '0' : '0';
  if (n < GB) {
    if (n < MB) return formatStorageBytes(n).replace(/ /g, '');
    const mb = n / MB;
    if (mb >= 100) return `${Math.round(mb)} MB`;
    return `${mb.toFixed(mb >= 10 ? 1 : 1).replace(/\.0$/, '')} MB`;
  }
  const gb = n / GB;
  if (gb >= 10) return `${Math.round(gb)}`;
  return gb.toFixed(1).replace(/\.0$/, '');
}

/** Sidebar meter label, e.g. "42 MB / 1 GB" or "1.2 / 5 GB". */
export function formatStorageMeter(used, max) {
  const usedBytes = Math.max(0, Number(used) || 0);
  const maxBytes = Number(max) > 0 ? Number(max) : GB;
  const usedLabel = formatMeterPart(usedBytes);
  const maxLabel = formatMeterPart(maxBytes);
  if (maxBytes >= GB) {
    // "42 MB / 1 GB" when under 1 GB used; "1.2 / 5 GB" when both in GB.
    if (usedBytes > 0 && usedBytes < GB) return `${usedLabel} / ${maxLabel} GB`;
    return `${usedLabel} / ${maxLabel} GB`;
  }
  return `${usedLabel} / ${maxLabel}`;
}

function cacheStorageBytes(userId, bytes) {
  try {
    localStorage.setItem(`user_real_storage_bytes_${userId}`, String(bytes));
  } catch {
    /* ignore */
  }
}

/**
 * Studio storage footer across all PIXNXT products (Workers: GET /v1/me/storage).
 */
export const userStorageService = {
  notifyStorageChanged() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(STORAGE_CHANGED_EVENT));
  },

  invalidateCachedStorage(userId) {
    if (!userId) return;
    try {
      localStorage.removeItem(`user_real_storage_bytes_${userId}`);
    } catch {
      /* ignore */
    }
  },

  async calculateUserStorageBytes(user) {
    if (!user?.id) return 0;

    const existing = inFlightByUser.get(user.id);
    if (existing) return existing;

    const run = (async () => {
      const { apiFetch } = await import('../lib/api/client');
      const data = await apiFetch('/v1/me/storage').catch(() => null);
      if (!data || data.totalBytes == null) {
        // Keep last known cache on failure — never overwrite with 0.
        return userStorageService.getCachedStorageBytes(user.id);
      }
      const finalTotalBytes = Math.max(0, Number(data.totalBytes) || 0);
      cacheStorageBytes(user.id, finalTotalBytes);
      return finalTotalBytes;
    })().finally(() => {
      inFlightByUser.delete(user.id);
    });

    inFlightByUser.set(user.id, run);
    return run;
  },

  getCachedStorageBytes(userId) {
    if (!userId) return 0;
    try {
      const cached = localStorage.getItem(`user_real_storage_bytes_${userId}`);
      if (cached !== null) return Number(cached) || 0;
    } catch {
      /* ignore */
    }
    return 0;
  },
};
