import { supabase } from '../lib/supabase/client';

const inFlightByUser = new Map();
const PAGE_SIZE = 1000;

export const STORAGE_CHANGED_EVENT = 'pixnxt-storage-changed';

async function sumColumnPaginated(table, photographerId, column) {
  let total = 0;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .eq('photographer_id', photographerId)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const batch = data || [];
    for (const row of batch) {
      total += Number(row[column]) || 0;
    }

    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return total;
}

async function trySumTableBytes(table, photographerId, column = 'size_bytes') {
  try {
    return await sumColumnPaginated(table, photographerId, column);
  } catch {
    return 0;
  }
}

async function sumAlbumProoferBytes(photographerId) {
  const fromRenamed = await trySumTableBytes('album_proofer_albums', photographerId, 'storage_bytes');
  if (fromRenamed > 0) return fromRenamed;
  return trySumTableBytes('smart_albums', photographerId, 'storage_bytes');
}

/** Client Gallery / Deliveries — maintained by DB trigger on public.photos. */
async function fetchDeliveryPhotoBytes(photographerId) {
  const { data, error } = await supabase
    .from('photographers')
    .select('storage_used_bytes')
    .eq('id', photographerId)
    .maybeSingle();
  if (error) return 0;
  return Number(data?.storage_used_bytes) || 0;
}

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
 * Studio storage footer across all PIXNXT products:
 * - Deliveries (public.photos → photographers.storage_used_bytes)
 * - Album Proofer (album_proofer_albums.storage_bytes)
 * - Guest Delivery standalone uploads (guest_delivery_photos.size_bytes)
 * - Mobile Gallery (mobile_gallery_photos.size_bytes)
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

  async calculateUserStorageBytes(user, profile) {
    if (!user?.id) return 0;

    const existing = inFlightByUser.get(user.id);
    if (existing) return existing;

    const run = (async () => {
      const [deliveryBytes, albumProoferBytes, guestDeliveryBytes, mobileGalleryBytes] =
        await Promise.all([
          fetchDeliveryPhotoBytes(user.id),
          sumAlbumProoferBytes(user.id),
          trySumTableBytes('guest_delivery_photos', user.id, 'size_bytes'),
          trySumTableBytes('mobile_gallery_photos', user.id, 'size_bytes'),
        ]);

      const finalTotalBytes =
        deliveryBytes + albumProoferBytes + guestDeliveryBytes + mobileGalleryBytes;

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
