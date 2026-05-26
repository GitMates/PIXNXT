import { expandUploadFilesToImages } from '../../lib/pdfToImages';
import { getCollectionItem } from './albumCollection';

const STORAGE_KEY = 'pixnxt_album_page_photos';

function readAll() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function writeAll(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch (e) {
        console.warn('Could not save album photos', e);
        return false;
    }
}

function spreadStorageKey(leftPage) {
    return `spread:${leftPage}`;
}

function resolveStoredPhoto(albumId, stored) {
    if (!stored) return null;
    if (typeof stored === 'string') return stored;
    if (stored.dataUrl) return stored.dataUrl;
    if (stored.collectionItemId) {
        return getCollectionItem(albumId, stored.collectionItemId)?.dataUrl ?? null;
    }
    return null;
}

export function getSpreadPhotoOverride(albumId, leftPage) {
    if (!albumId || leftPage == null) return null;
    const album = readAll()[albumId];
    return resolveStoredPhoto(albumId, album?.[spreadStorageKey(leftPage)]);
}

export function getPagePhotoOverride(albumId, pageNum) {
    if (!albumId || pageNum == null) return null;
    const album = readAll()[albumId];
    return resolveStoredPhoto(albumId, album?.[String(pageNum)]);
}

/** Per-slot image: whole-spread photo (panoramic) or single-page override. */
export function getGridSlotPhoto(albumId, pageNum, cellId, spreadLeftPage) {
    const spreadSrc = getSpreadPhotoOverride(albumId, spreadLeftPage);
    if (spreadSrc) {
        return { src: spreadSrc, panoramic: cellId === 1 ? 'left' : 'right' };
    }
    const pageSrc = getPagePhotoOverride(albumId, pageNum);
    if (pageSrc) return { src: pageSrc, panoramic: null };
    return { src: null, panoramic: null };
}

export function hasGridSlotPhoto(albumId, pageNum, cellId, spreadLeftPage) {
    if (getSpreadPhotoOverride(albumId, spreadLeftPage)) return true;
    return Boolean(getPagePhotoOverride(albumId, pageNum));
}

export function getAlbumPhotoRevision(albumId) {
    const album = readAll()[albumId];
    return album?.__revision ?? 0;
}

/**
 * Assign uploaded images to album pages.
 * Pass `targets` (page indices) to fill specific grid slots; otherwise sequential from startPage.
 */
export async function assignPhotosFromFiles(
    albumId,
    files,
    { startPage = 1, totalPages = 21, targets } = {}
) {
    if (!albumId || !files?.length) return 0;

    const all = readAll();
    const album = { ...(all[albumId] || {}) };
    const images = await expandUploadFilesToImages(files);
    const pageQueue =
        targets?.length > 0 ? targets : images.map((_, i) => startPage + i);
    let assigned = 0;

    for (let i = 0; i < images.length; i++) {
        const page = pageQueue[i];
        if (page == null || page < 0 || page >= totalPages) break;
        try {
            album[String(page)] = images[i].dataUrl;
            assigned += 1;
        } catch (e) {
            console.warn('Skip image', images[i]?.name, e);
        }
    }

    album.__revision = (album.__revision || 0) + 1;
    all[albumId] = album;
    writeAll(all);
    return assigned;
}

export function setPagePhotoFromDataUrl(albumId, pageNum, dataUrl, { clearSpreadForLeft } = {}) {
    if (!albumId || pageNum == null || !dataUrl) return false;
    const all = readAll();
    const album = { ...(all[albumId] || {}) };
    if (clearSpreadForLeft != null) {
        delete album[spreadStorageKey(clearSpreadForLeft)];
    }
    album[String(pageNum)] = dataUrl;
    album.__revision = (album.__revision || 0) + 1;
    all[albumId] = album;
    return writeAll(all);
}

export function setPagePhotoFromCollectionItem(
    albumId,
    pageNum,
    collectionItemId,
    { clearSpreadForLeft } = {}
) {
    if (!albumId || pageNum == null || !collectionItemId) return false;
    const all = readAll();
    const album = { ...(all[albumId] || {}) };
    if (clearSpreadForLeft != null) {
        delete album[spreadStorageKey(clearSpreadForLeft)];
    }
    album[String(pageNum)] = { collectionItemId };
    album.__revision = (album.__revision || 0) + 1;
    all[albumId] = album;
    return writeAll(all);
}

export function clearPagePhoto(albumId, pageNum) {
    if (!albumId || pageNum == null) return false;
    const all = readAll();
    const album = { ...(all[albumId] || {}) };
    if (!(String(pageNum) in album)) return false;
    delete album[String(pageNum)];
    album.__revision = (album.__revision || 0) + 1;
    all[albumId] = album;
    return writeAll(all);
}

/** Remove all placed photos from album pages (collection is unchanged). */
export function clearAllAlbumPagePhotos(albumId, { totalPages = 21 } = {}) {
    if (!albumId) return 0;
    const all = readAll();
    const prev = all[albumId] || {};
    let cleared = 0;
    for (const key of Object.keys(prev)) {
        if (key !== '__revision') cleared += 1;
    }
    all[albumId] = { __revision: (prev.__revision || 0) + 1 };
    writeAll(all);
    return cleared;
}

/** One image across the full spread (left + right pages). */
export function setSpreadPhoto(albumId, leftPage, dataUrl, rightPage) {
    if (!albumId || leftPage == null || !dataUrl) return false;
    const all = readAll();
    const album = { ...(all[albumId] || {}) };
    album[spreadStorageKey(leftPage)] = dataUrl;
    delete album[String(leftPage)];
    if (rightPage != null) delete album[String(rightPage)];
    album.__revision = (album.__revision || 0) + 1;
    all[albumId] = album;
    return writeAll(all);
}

export function setSpreadPhotoFromCollectionItem(albumId, leftPage, collectionItemId, rightPage) {
    if (!albumId || leftPage == null || !collectionItemId) return false;
    const all = readAll();
    const album = { ...(all[albumId] || {}) };
    album[spreadStorageKey(leftPage)] = { collectionItemId };
    delete album[String(leftPage)];
    if (rightPage != null) delete album[String(rightPage)];
    album.__revision = (album.__revision || 0) + 1;
    all[albumId] = album;
    return writeAll(all);
}

export function placeCollectionPhotoOnPages(albumId, dataUrl, pageIndices, { spreadLeftPage } = {}) {
    if (!albumId || !dataUrl || !pageIndices?.length) return 0;
    let placed = 0;
    for (const page of pageIndices) {
        if (setPagePhotoFromDataUrl(albumId, page, dataUrl, { clearSpreadForLeft: spreadLeftPage }))
            placed += 1;
    }
    return placed;
}

export function placeCollectionItemOnPages(
    albumId,
    collectionItemId,
    pageIndices,
    { spreadLeftPage } = {}
) {
    if (!albumId || !collectionItemId || !pageIndices?.length) return 0;
    let placed = 0;
    for (const page of pageIndices) {
        if (
            setPagePhotoFromCollectionItem(albumId, page, collectionItemId, {
                clearSpreadForLeft: spreadLeftPage,
            })
        ) {
            placed += 1;
        }
    }
    return placed;
}

export function autoPlaceCollectionItems(albumId, collectionItemIds, { totalPages = 21, gridLayout } = {}) {
    if (!albumId || !collectionItemIds?.length) return 0;

    if (gridLayout === 'whole-spread') {
        let placed = 0;
        for (let i = 0; i < collectionItemIds.length; i += 1) {
            const leftPage = 1 + i * 2;
            if (leftPage >= totalPages) break;
            const rightPage = leftPage + 1 < totalPages ? leftPage + 1 : null;
            if (setSpreadPhotoFromCollectionItem(albumId, leftPage, collectionItemIds[i], rightPage)) {
                placed += 1;
            }
        }
        return placed;
    }

    let placed = 0;
    const slotCount = Math.max(0, totalPages - 1);
    for (let i = 0; i < Math.min(collectionItemIds.length, slotCount); i += 1) {
        const page = i + 1;
        const spreadLeftPage = page % 2 === 1 ? page : page - 1;
        if (
            setPagePhotoFromCollectionItem(albumId, page, collectionItemIds[i], {
                clearSpreadForLeft: spreadLeftPage,
            })
        ) {
            placed += 1;
        }
    }
    return placed;
}
