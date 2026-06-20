import { getAlbumCollection } from './albumCollection';
import { spliceIndexedPhotoMap } from './albumPageStorage';
import { serializeImageReplacementsForSnapshot } from './albumImageReplacements';

const PHOTOS_KEY = 'pixnxt_album_page_photos';
const REMOTE_CACHE = new Map();

function readLocalPhotos(albumId) {
    try {
        const raw = localStorage.getItem(PHOTOS_KEY);
        const all = raw ? JSON.parse(raw) : {};
        return all[albumId] || null;
    } catch {
        return null;
    }
}

function resolveStoredUrl(stored, collection) {
    if (!stored) return null;
    if (typeof stored === 'string') return stored;
    if (stored.dataUrl) return stored.dataUrl;
    if (stored.collectionItemId) {
        return collection.find((item) => item.id === stored.collectionItemId)?.dataUrl ?? null;
    }
    return null;
}

/** Pick the best list-card image from a cloud snapshot (no localStorage). */
export function deriveCoverUrlFromSnapshot(snapshot) {
    if (!snapshot) return null;
    if (snapshot.cover_url) return snapshot.cover_url;

    const collection = snapshot.collection || [];
    const pages = snapshot.pages || {};

    const cover = resolveStoredUrl(pages['0'], collection);
    if (cover) return cover;

    if (collection[0]?.dataUrl) return collection[0].dataUrl;

    const pageNums = Object.keys(pages)
        .filter((k) => !k.startsWith('spread:'))
        .map((k) => Number(k))
        .filter((n) => !Number.isNaN(n) && n > 0)
        .sort((a, b) => a - b);

    for (const page of pageNums) {
        const url = resolveStoredUrl(pages[String(page)], collection);
        if (url) return url;
    }

    const spreadKeys = Object.keys(pages)
        .filter((k) => k.startsWith('spread:'))
        .sort((a, b) => Number(a.replace('spread:', '')) - Number(b.replace('spread:', '')));

    for (const key of spreadKeys) {
        const url = resolveStoredUrl(pages[key], collection);
        if (url) return url;
    }

    return null;
}

function listAlbumIdsWithLocalAssets() {
    const ids = new Set();
    try {
        const collections = JSON.parse(localStorage.getItem('pixnxt_album_collections') || '{}');
        Object.keys(collections).forEach((id) => ids.add(id));
        const photos = JSON.parse(localStorage.getItem(PHOTOS_KEY) || '{}');
        Object.keys(photos).forEach((id) => ids.add(id));
    } catch {
        /* ignore */
    }
    return [...ids];
}

/** Album ids that have collection or page data in this browser. */
export function getAlbumIdsWithLocalAssets() {
    return listAlbumIdsWithLocalAssets();
}

function resolvePageValue(albumId, stored) {
    if (!stored) return null;
    if (typeof stored === 'string') return stored;
    if (stored.dataUrl) return stored.dataUrl;
    if (stored.collectionItemId) {
        const item = getAlbumCollection(albumId).find((i) => i.id === stored.collectionItemId);
        if (item?.dataUrl) {
            return { dataUrl: item.dataUrl, collectionItemId: stored.collectionItemId };
        }
        return { collectionItemId: stored.collectionItemId };
    }
    return stored;
}

/** Build a portable snapshot for Supabase (URLs, not local blobs). */
export function buildAlbumPreviewSnapshot(albumId) {
    if (!albumId) return null;

    const collection = getAlbumCollection(albumId).map((item, index) => ({
        id: item.id,
        name: item.name || 'Photo',
        dataUrl: item.dataUrl || null,
        storagePath: item.storagePath || null,
        size_bytes: Number(item.size_bytes) || 0,
        sortOrder:
            typeof item.sortOrder === 'number' && Number.isFinite(item.sortOrder)
                ? item.sortOrder
                : index,
    }));

    const localPages = readLocalPhotos(albumId) || {};
    const pages = {};
    Object.keys(localPages).forEach((key) => {
        if (key === '__revision') return;
        pages[key] = resolvePageValue(albumId, localPages[key]);
    });

    const snapshot = {
        version: 1,
        updated_at: new Date().toISOString(),
        collection,
        pages,
        revision: localPages.__revision ?? 0,
        image_replacements: serializeImageReplacementsForSnapshot(albumId),
        storage_bytes: collection.reduce((sum, item) => sum + (Number(item.size_bytes) || 0), 0),
    };
    snapshot.cover_url = deriveCoverUrlFromSnapshot(snapshot);
    return snapshot;
}

export function hydrateAlbumPreviewData(albumId, previewData) {
    if (!albumId || !previewData) {
        REMOTE_CACHE.delete(albumId);
        return;
    }
    REMOTE_CACHE.set(albumId, previewData);
}

/** Keep in-memory preview page keys aligned when pages are inserted/removed. */
export function shiftAlbumRemotePreviewPages(albumId, insertAt, delta) {
    if (!albumId || !delta) return;
    const remote = REMOTE_CACHE.get(albumId);
    if (!remote?.pages) return;
    REMOTE_CACHE.set(albumId, {
        ...remote,
        pages: spliceIndexedPhotoMap(remote.pages, insertAt, delta),
        revision: (remote.revision || 0) + 1,
    });
}

export function clearAlbumPreviewDataCache(albumId) {
    if (albumId) REMOTE_CACHE.delete(albumId);
}

export function getRemotePreviewData(albumId) {
    return REMOTE_CACHE.get(albumId) || null;
}

/** Keep in-memory preview replacement list aligned with local edits (e.g. dismiss in Review Summary). */
export function patchRemotePreviewImageReplacements(albumId, replacements) {
    if (!albumId) return;
    const remote = REMOTE_CACHE.get(albumId);
    if (!remote) return;
    REMOTE_CACHE.set(albumId, {
        ...remote,
        image_replacements: Array.isArray(replacements) ? replacements : [],
    });
}

export function getRemoteCollectionItem(albumId, itemId) {
    const remote = getRemotePreviewData(albumId);
    if (!remote?.collection || !itemId) return null;
    return remote.collection.find((item) => item.id === itemId) ?? null;
}

export function getRemotePagePhoto(albumId, key) {
    const remote = getRemotePreviewData(albumId);
    if (!remote?.pages || key == null) return null;
    return remote.pages[String(key)] ?? null;
}

/** Drop page/spread keys from the in-memory preview cache (keeps UI + reload in sync). */
export function deleteRemotePreviewPageKeys(albumId, keys) {
    if (!albumId || !keys?.length) return false;
    const remote = REMOTE_CACHE.get(albumId);
    if (!remote?.pages) return false;

    const pages = { ...remote.pages };
    let changed = false;
    for (const key of keys) {
        const k = String(key);
        if (k in pages) {
            delete pages[k];
            changed = true;
        }
    }
    if (!changed) return false;

    hydrateAlbumPreviewData(albumId, {
        ...remote,
        pages,
        revision: (remote.revision || 0) + 1,
    });
    return true;
}
