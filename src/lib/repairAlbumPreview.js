import { supabase } from '../lib/supabase/client';

async function getAccessToken() {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  } catch {
    return null;
  }
}

async function postRepair(body) {
  const accessToken = await getAccessToken();
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch('/api/album-proofer/repair-preview', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || `Repair failed (${response.status})`);
  }
  return payload.result || null;
}

/**
 * Rebuild album preview collection from R2 via server (avoids browser CORS on ListObjects).
 * Owner JWT persists the repair; published albums can still hydrate without write.
 */
export async function repairAlbumPreviewFromServer(albumId) {
  if (!albumId) return null;
  return postRepair({ albumId });
}

/** Repair every broken album owned by the signed-in photographer. */
export async function repairAllMyAlbumPreviewsFromServer() {
  return postRepair({ repairAllMine: true });
}

export function previewNeedsAssetRepair(previewData) {
  if (!previewData || typeof previewData !== 'object') return true;
  const collection = Array.isArray(previewData.collection) ? previewData.collection : [];
  const pages = previewData.pages && typeof previewData.pages === 'object' ? previewData.pages : {};
  const hasPaths = collection.some((item) => item?.storagePath);
  if (collection.length === 0) return Object.keys(pages).length > 0;
  if (!hasPaths) return true;

  const seenIds = new Set();
  for (const item of collection) {
    if (!item?.id) continue;
    if (seenIds.has(item.id)) return true;
    seenIds.add(item.id);
  }

  const pageEntries = Object.values(pages).filter(
    (stored) => stored && typeof stored === 'object' && stored.collectionItemId
  );
  if (pageEntries.length > 1 && collection.length > 1) {
    const uniqueIds = new Set(pageEntries.map((p) => p.collectionItemId));
    if (uniqueIds.size < Math.min(pageEntries.length, collection.length)) return true;
    const uniquePaths = new Set(pageEntries.map((p) => p.storagePath).filter(Boolean));
    if (uniquePaths.size === 1) return true;
  }

  return Object.keys(pages).some((key) => {
    const stored = pages[key];
    return (
      stored &&
      typeof stored === 'object' &&
      stored.collectionItemId &&
      !stored.storagePath &&
      !stored.dataUrl
    );
  });
}

/** True when a snapshot is safe to publish / open (has resolvable photo URLs). */
export function isPreviewSnapshotHealthy(previewData, { requireCollectionIfPages = true } = {}) {
  if (!previewData || typeof previewData !== 'object') return false;
  const collection = Array.isArray(previewData.collection) ? previewData.collection : [];
  const pages = previewData.pages && typeof previewData.pages === 'object' ? previewData.pages : {};
  const pageKeys = Object.keys(pages);
  if (pageKeys.length === 0) return true;
  if (requireCollectionIfPages && collection.length === 0) return false;
  const hasPaths = collection.some((item) => item?.storagePath);
  if (!hasPaths && collection.length > 0) return false;

  const seenIds = new Set();
  for (const item of collection) {
    if (!item?.id) continue;
    if (seenIds.has(item.id)) return false;
    seenIds.add(item.id);
  }

  const pageEntries = Object.values(pages).filter(
    (stored) => stored && typeof stored === 'object' && stored.collectionItemId
  );
  if (pageEntries.length > 1 && collection.length > 1) {
    const uniqueIds = new Set(pageEntries.map((p) => p.collectionItemId));
    if (uniqueIds.size < Math.min(pageEntries.length, collection.length)) return false;
    const uniquePaths = new Set(pageEntries.map((p) => p.storagePath).filter(Boolean));
    if (uniquePaths.size === 1) return false;
  }

  return !pageKeys.some((key) => {
    const stored = pages[key];
    if (!stored || typeof stored !== 'object') return false;
    if (stored.storagePath || stored.dataUrl) return false;
    if (!stored.collectionItemId) return false;
    return !collection.some((item) => item?.id === stored.collectionItemId && item?.storagePath);
  });
}
