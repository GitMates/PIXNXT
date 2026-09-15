const inFlightByUser = new Map();

export const STORAGE_CHANGED_EVENT = 'pixnxt-storage-changed';

const GB = 1024 * 1024 * 1024;

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

function formatGb(bytes) {
  const gb = Math.max(0, Number(bytes) / GB);
  if (gb >= 10) return `${Math.round(gb)}`;
  if (gb >= 1) return gb.toFixed(1).replace(/\.0$/, '');
  if (gb < 0.05) return '0';
  return gb.toFixed(1);
}

/** Sidebar meter label, e.g. "0.4 / 1 GB". */
export function formatStorageMeter(used, max) {
  const usedBytes = Number(used) || 0;
  const maxBytes = Number(max) > 0 ? Number(max) : GB;
  return `${formatGb(usedBytes)} / ${formatGb(maxBytes)} GB`;
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
      const finalTotalBytes = Number(data?.totalBytes) || 0;
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
