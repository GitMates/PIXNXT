import { supabase } from '../lib/supabase/client';
import { storageService } from './storage.service';

function safePathSegment(value, fallback = 'item') {
  return String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || fallback;
}

/**
 * Service to calculate real-time storage used by a photographer across all 4 modules:
 * - clientgallery
 * - guestdelivery
 * - mobilegallery
 * - smart-album / smart-albums
 */
export const userStorageService = {
  async calculateUserStorageBytes(user, profile) {
    if (!user?.id) return 0;

    const uniqueFolders = new Set();
    uniqueFolders.add(user.id);

    if (user.email) {
      const emailPrefix = user.email.split('@')[0];
      if (emailPrefix) {
        uniqueFolders.add(emailPrefix);
        uniqueFolders.add(safePathSegment(emailPrefix));
      }
    }

    if (profile?.email) {
      const pEmailPrefix = profile.email.split('@')[0];
      if (pEmailPrefix) {
        uniqueFolders.add(pEmailPrefix);
        uniqueFolders.add(safePathSegment(pEmailPrefix));
      }
    }

    if (profile?.display_name) {
      const slug = safePathSegment(profile.display_name);
      if (slug) uniqueFolders.add(slug);
    }

    if (profile?.business_name) {
      const bSlug = safePathSegment(profile.business_name);
      if (bSlug) uniqueFolders.add(bSlug);
    }

    let r2TotalBytes = 0;
    const seenKeys = new Set();

    // Scan R2 object storage for each possible user folder prefix
    for (const folder of uniqueFolders) {
      if (!folder) continue;

      // Scan root user folder
      try {
        const objects = await storageService.listByPrefix(`users/${folder}/`, { maxKeys: 5000 });
        for (const obj of objects) {
          if (!seenKeys.has(obj.key)) {
            seenKeys.add(obj.key);
            r2TotalBytes += Number(obj.size) || 0;
          }
        }
      } catch (err) {
        // Explicit module subfolders fallback
        const modules = ['clientgallery', 'guestdelivery', 'mobilegallery', 'smart-album', 'smart-albums'];
        for (const mod of modules) {
          try {
            const objects = await storageService.listByPrefix(`users/${folder}/${mod}/`, { maxKeys: 5000 });
            for (const obj of objects) {
              if (!seenKeys.has(obj.key)) {
                seenKeys.add(obj.key);
                r2TotalBytes += Number(obj.size) || 0;
              }
            }
          } catch (_) {}
        }
      }
    }

    // Query Supabase collections / photos as a fallback or database measure
    let dbTotalBytes = 0;
    try {
      const { data: collections } = await supabase
        .from('collections')
        .select('storage_bytes')
        .eq('photographer_id', user.id);

      if (collections && Array.isArray(collections)) {
        dbTotalBytes += collections.reduce((acc, c) => acc + (Number(c.storage_bytes) || 0), 0);
      }
    } catch (_) {}

    const finalTotalBytes = Math.max(r2TotalBytes, dbTotalBytes);

    // Cache locally for instant loading
    try {
      localStorage.setItem(`user_real_storage_bytes_${user.id}`, String(finalTotalBytes));
    } catch (_) {}

    // Synchronize Supabase photographers table storage_used_bytes
    try {
      await supabase
        .from('photographers')
        .update({ storage_used_bytes: finalTotalBytes })
        .eq('id', user.id);
    } catch (_) {}

    return finalTotalBytes;
  },

  getCachedStorageBytes(userId) {
    if (!userId) return 0;
    try {
      const cached = localStorage.getItem(`user_real_storage_bytes_${userId}`);
      if (cached !== null) return Number(cached) || 0;
    } catch (_) {}
    return 0;
  },
};
