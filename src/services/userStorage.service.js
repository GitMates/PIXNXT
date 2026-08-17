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
