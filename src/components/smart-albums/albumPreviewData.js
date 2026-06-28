import { getAlbumCollection } from './albumCollection';
import { spliceIndexedPhotoMap } from './albumPageStorage';
import { serializeImageReplacementsForSnapshot } from './albumImageReplacements';
import { smartAlbumProoferSettingsService } from '../../services/smartAlbumProoferSettings.service';
import { mergeAlbumClientFlagsFromProoferAccess } from './albumProoferPreview';

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

/** Book-wrap front cover from a cloud snapshot (spread:0 / page 1 / collection[0]). */
export function deriveFrontCoverUrlFromSnapshot(snapshot, { blankCovers = false } = {}) {
    if (!snapshot) return null;
    if (snapshot.cover_url && !blankCovers) return snapshot.cover_url;

    const collection = snapshot.collection || [];
    const pages = snapshot.pages || {};

    const onSpread = resolveStoredUrl(pages['spread:0'], collection);
    if (onSpread) return onSpread;

    if (blankCovers) return null;

    const onPageOne = resolveStoredUrl(pages['1'], collection);
    if (onPageOne) return onPageOne;

    if (collection[0]?.dataUrl) return collection[0].dataUrl;

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
export function buildAlbumPreviewSnapshot(
    albumId,
    {
        album = null,
        coverColorPreset = null,
        spineBounds = null,
    } = {}
) {
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

    if (album) {
        snapshot.has_covers = album.has_covers !== false;
        snapshot.blank_covers = album.blank_covers === true;
        snapshot.spread_grid_size = album.spread_grid_size ?? null;
    }

    if (coverColorPreset) {
        snapshot.cover_color_preset = coverColorPreset;
    }

    if (
        spineBounds &&
        Number.isFinite(spineBounds.spineStartFraction) &&
        Number.isFinite(spineBounds.spineEndFraction)
    ) {
        snapshot.spine_bounds = {
            spineStartFraction: spineBounds.spineStartFraction,
            spineEndFraction: spineBounds.spineEndFraction,
        };
    }

    snapshot.cover_url = deriveCoverUrlFromSnapshot(snapshot);

    if (album?.photographer_id) {
        snapshot.proofer_access = smartAlbumProoferSettingsService.serializeAccessForPreview(
            album.photographer_id,
            albumId,
            album
        );
    }

    return snapshot;
}

function resolveHasCoversFromPreview(album, previewData) {
    if (previewData?.has_covers === false) return false;
    if (previewData?.has_covers === true) return true;
    if (album?.has_covers === false) return false;
    return true;
}

/** Refresh embedded proofer access rules on a preview snapshot from the live album row. */
export function patchAlbumPreviewProoferAccess(albumId, album) {
    if (!albumId || !album?.photographer_id) return null;

    const remote = REMOTE_CACHE.get(albumId) || album.preview_data || {};
    const proofer_access = smartAlbumProoferSettingsService.serializeAccessForPreview(
        album.photographer_id,
        albumId,
        { ...album, preview_data: remote }
    );
    const patched = {
        ...remote,
        proofer_access,
        updated_at: new Date().toISOString(),
    };
    REMOTE_CACHE.set(albumId, patched);
    return patched;
}

/** Merge cloud preview snapshot layout into album row for anonymous / client preview. */
export function normalizeAlbumForClientPreview(album) {
    if (!album) return album;
    const previewData =
        album.id && album.photographer_id
            ? patchAlbumPreviewProoferAccess(album.id, album) || album.preview_data || {}
            : album.preview_data || {};
    return mergeAlbumClientFlagsFromProoferAccess({
        ...album,
        preview_data: previewData,
        has_covers: resolveHasCoversFromPreview(album, previewData),
        blank_covers: previewData.blank_covers === true || album.blank_covers === true,
        spread_grid_size: previewData.spread_grid_size ?? album.spread_grid_size ?? null,
        grid_size: album.grid_size ?? 'square',
        grid_layout: album.grid_layout ?? 'two-page',
    });
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
