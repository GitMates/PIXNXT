import { supabase } from '../lib/supabase/client';

const inFlightByUser = new Map();

async function sumStorageBytes(table, photographerId) {
  const { data, error } = await supabase
    .from(table)
    .select('storage_bytes')
    .eq('photographer_id', photographerId);
  if (error || !Array.isArray(data)) return 0;
  return data.reduce((acc, row) => acc + (Number(row.storage_bytes) || 0), 0);
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

/**
 * Studio storage footer: sum from the database.
 * Do not ListObjects on R2 from the browser — that floods Chrome with S3 GETs
 * (ERR_INSUFFICIENT_RESOURCES) and then every other fetch/upload/delete fails.
 */
export const userStorageService = {
  async calculateUserStorageBytes(user, profile) {
    if (!user?.id) return 0;

    const existing = inFlightByUser.get(user.id);
    if (existing) return existing;

    const run = (async () => {
      const cached = this.getCachedStorageBytes(user.id);
      let dbTotalBytes = 0;

      dbTotalBytes += await sumStorageBytes('deliveries', user.id);

      try {
        dbTotalBytes += await sumStorageBytes('smart_albums', user.id);
      } catch {
        /* table may not exist in this project */
      }

      let profileBytes = Number(profile?.storage_used_bytes) || 0;
      if (!profileBytes) {
        try {
          const { data } = await supabase
            .from('photographers')
            .select('storage_used_bytes')
            .eq('id', user.id)
            .maybeSingle();
          profileBytes = Number(data?.storage_used_bytes) || 0;
        } catch {
          /* ignore */
        }
      }

      const finalTotalBytes = Math.max(dbTotalBytes, profileBytes, cached);

      try {
        localStorage.setItem(`user_real_storage_bytes_${user.id}`, String(finalTotalBytes));
      } catch {
        /* ignore */
      }

      if (dbTotalBytes > 0 && dbTotalBytes !== profileBytes) {
        try {
          await supabase
            .from('photographers')
            .update({ storage_used_bytes: dbTotalBytes })
            .eq('id', user.id);
        } catch {
          /* ignore */
        }
      }

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
