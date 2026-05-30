import { getAlbumCollection } from './albumCollection';

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

    const collection = getAlbumCollection(albumId).map((item) => ({
        id: item.id,
        name: item.name || 'Photo',
        dataUrl: item.dataUrl || null,
        storagePath: item.storagePath || null,
    }));

    const localPages = readLocalPhotos(albumId) || {};
    const pages = {};
    Object.keys(localPages).forEach((key) => {
        if (key === '__revision') return;
        pages[key] = resolvePageValue(albumId, localPages[key]);
    });

    return {
        version: 1,
        updated_at: new Date().toISOString(),
        collection,
        pages,
        revision: localPages.__revision ?? 0,
    };
}

export function hydrateAlbumPreviewData(albumId, previewData) {
    if (!albumId || !previewData) {
        REMOTE_CACHE.delete(albumId);
        return;
    }
    REMOTE_CACHE.set(albumId, previewData);
}

export function clearAlbumPreviewDataCache(albumId) {
    if (albumId) REMOTE_CACHE.delete(albumId);
}

export function getRemotePreviewData(albumId) {
    return REMOTE_CACHE.get(albumId) || null;
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
