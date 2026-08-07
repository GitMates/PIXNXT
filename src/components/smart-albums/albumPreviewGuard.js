/**
 * Shared guards so preview_data writes never orphan page placements
 * by wiping the photo collection catalog.
 */

export function pagesNeedCollectionCatalog(pages = {}) {
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

function mergeCollections(cloudCollection = [], localCollection = []) {
  const byId = new Map();
  const byPath = new Map();
  for (const item of [...cloudCollection, ...localCollection]) {
    if (!item) continue;
    if (item.id) byId.set(item.id, item);
    if (item.storagePath) byPath.set(item.storagePath, item);
  }
  const merged = [];
  const seen = new Set();
  for (const item of [...byId.values(), ...byPath.values()]) {
    const key = item.id || item.storagePath;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}

/**
 * Merge a local snapshot with the existing cloud preview so we never
 * publish pages that reference collectionItemIds without a catalog.
 * Returns { previewData, shouldSkipWrite }.
 */
export function protectPreviewSnapshot(localPreview, existingPreview) {
  if (!localPreview) return { previewData: null, shouldSkipWrite: true };

  const previewData = {
    ...localPreview,
    collection: Array.isArray(localPreview.collection) ? [...localPreview.collection] : [],
    pages:
      localPreview.pages && typeof localPreview.pages === 'object'
        ? { ...localPreview.pages }
        : {},
  };

  // Drop collection rows that have no durable R2 path — they cannot survive a reload.
  previewData.collection = previewData.collection.filter(
    (item) => item && (item.storagePath || item.dataUrl)
  );

  const cloudCollection = Array.isArray(existingPreview?.collection)
    ? existingPreview.collection
    : [];
  const localCollection = previewData.collection;

  if (localCollection.length === 0 && cloudCollection.length > 0) {
    previewData.collection = cloudCollection;
    previewData.storage_bytes =
      Number(existingPreview.storage_bytes) ||
      cloudCollection.reduce((sum, item) => sum + (Number(item.size_bytes) || 0), 0);
  } else if (localCollection.length > 0 && cloudCollection.length > localCollection.length * 2) {
    const merged = mergeCollections(cloudCollection, localCollection);
    previewData.collection = merged;
    previewData.storage_bytes = merged.reduce(
      (sum, item) => sum + (Number(item.size_bytes) || 0),
      0
    );
  }

  const localPageKeys = Object.keys(previewData.pages || {}).filter((k) => k !== '__revision');
  const cloudPageKeys = Object.keys(existingPreview?.pages || {});
  if (localPageKeys.length === 0 && cloudPageKeys.length > 0) {
    previewData.pages = existingPreview.pages;
    if (existingPreview.revision != null) previewData.revision = existingPreview.revision;
  }

  const collectionLen = previewData.collection?.length ?? 0;
  if (pagesNeedCollectionCatalog(previewData.pages) && collectionLen === 0) {
    if (cloudCollection.length > 0) {
      previewData.collection = cloudCollection;
      previewData.storage_bytes =
        Number(existingPreview?.storage_bytes) ||
        cloudCollection.reduce((sum, item) => sum + (Number(item.size_bytes) || 0), 0);
    } else {
      return { previewData, shouldSkipWrite: true };
    }
  }

  // Refuse writes where pages exist but collection has zero storagePath rows.
  if (
    Object.keys(previewData.pages || {}).length > 0 &&
    !(previewData.collection || []).some((item) => item?.storagePath)
  ) {
    if ((cloudCollection || []).some((item) => item?.storagePath)) {
      previewData.collection = cloudCollection;
    } else {
      return { previewData, shouldSkipWrite: true };
    }
  }

  return { previewData, shouldSkipWrite: false };
}
