import { expandUploadFilesToImages } from '../../lib/pdfToImages';
import { storageService } from '../../services/storage.service';
import { getSpreadLeftPageIndex } from './albumSpreadGrid';
import {
    enumerateAutoPlacePageTargets,
    enumerateCollectionPlacementPages,
    enumerateCoverCollectionPlacements,
    getAlbumSpreadOptions,
    getEndSpreadPageIndices,
    getLastSpreadInfo,
    isCoverInsidePage,
    isEndHalfSpreadLeftPage,
    isInsideCoverSpreadLeft,
    isWholeSpreadLayout,
    normalizeSpreadOpts,
} from './albumSpreadUtils';
import { computePageCountFromPhotoCount } from '../../pages/smart-albums/createAlbumLayout';
import { getAlbumCollection, getCollectionItem } from './albumCollection';
import { getSampleImageForPage } from './sampleAlbumImages';
import {
    deriveCoverUrlFromSnapshot,
    getRemoteCollectionItem,
    getRemotePagePhoto,
    getRemotePreviewData,
    hydrateAlbumPreviewData,
} from './albumPreviewData';

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

function resolveCollectionItemUrl(albumId, collectionItemId) {
    if (!albumId || !collectionItemId) return null;
    const item =
        getCollectionItem(albumId, collectionItemId) ??
        getRemoteCollectionItem(albumId, collectionItemId);
    if (!item) return null;
    if (item.storagePath) {
        return storageService.getPublicUrl(item.storagePath);
    }
    return item.dataUrl ?? null;
}

function resolveStoredPhoto(albumId, stored) {
    if (!stored) return null;
    if (typeof stored === 'string') return stored;
    if (stored.dataUrl) return stored.dataUrl;
    if (stored.collectionItemId) {
        return resolveCollectionItemUrl(albumId, stored.collectionItemId);
    }
    return null;
}

function resolveRemotePagePhoto(albumId, key) {
    const remote = getRemotePagePhoto(albumId, key);
    if (!remote) return null;
    if (typeof remote === 'string') return remote;
    if (remote.dataUrl) return remote.dataUrl;
    if (remote.collectionItemId) {
        return resolveCollectionItemUrl(albumId, remote.collectionItemId);
    }
    return null;
}

function getStoredPlacement(albumId, key) {
    const album = readAll()[albumId];
    if (album?.[key] != null) return album[key];
    const remote = getRemotePreviewData(albumId);
    if (remote?.pages?.[key] != null) return remote.pages[key];
    return null;
}

/** Copy cloud preview placements into localStorage so page splices stay consistent. */
export function mergeRemotePreviewPagesIntoLocal(albumId) {
    const remote = getRemotePreviewData(albumId);
    if (!remote?.pages) return false;

    const all = readAll();
    const album = { ...(all[albumId] || {}) };
    let changed = false;

    for (const [key, val] of Object.entries(remote.pages)) {
        if (val != null && album[key] == null) {
            album[key] = val;
            changed = true;
        }
    }

    if (!changed) return false;
    album.__revision = (album.__revision || 0) + 1;
    all[albumId] = album;
    return writeAll(all);
}

/** Snapshot end-cover placement before removing pages (raw storage values). */
export function captureEndCoverPlacement(albumId, totalPages) {
    if (!albumId || totalPages == null) return null;
    const { left, right } = getEndSpreadPageIndices(totalPages);
    const pageLeft = getStoredPlacement(albumId, String(left));
    const pageRight = getStoredPlacement(albumId, String(right));
    const spread = getStoredPlacement(albumId, spreadStorageKey(left));
    if (pageLeft == null && pageRight == null && spread == null) return null;
    return { pageLeft, pageRight, spread };
}

/** Re-apply end-cover photo on the new last spread after a page-count shrink. */
export function restoreEndCoverPlacement(albumId, totalPages, captured) {
    if (!albumId || !captured || totalPages == null) return false;
    const photo = captured.pageLeft ?? captured.spread ?? captured.pageRight;
    if (photo == null) return false;

    const { left, right } = getEndSpreadPageIndices(totalPages);
    const spreadKey = spreadStorageKey(left);

    const all = readAll();
    const album = { ...(all[albumId] || {}) };
    album[String(left)] = photo;
    delete album[spreadKey];
    delete album[String(right)];
    album.__revision = (album.__revision || 0) + 1;
    all[albumId] = album;
    writeAll(all);

    const remote = getRemotePreviewData(albumId);
    if (remote?.pages) {
        const pages = { ...remote.pages };
        pages[String(left)] = photo;
        delete pages[spreadKey];
        delete pages[String(right)];
        hydrateAlbumPreviewData(albumId, {
            ...remote,
            pages,
            revision: (remote.revision || 0) + 1,
        });
    }

    return true;
}

/** Move a mistaken whole-spread placement on the last spread to the left page only. */
export function migrateEndHalfSpreadToLeftPage(albumId, totalPages, albumMeta = null) {
    if (!albumId || totalPages == null) return false;
    const collectionCount = getAlbumCollection(albumId).length;
    const spreadOpts = albumMeta
        ? getAlbumSpreadOptions(albumMeta, { collectionCount })
        : getAlbumSpreadOptions(
              { has_covers: true, page_count: totalPages },
              { collectionCount }
          );
    const { left } = getLastSpreadInfo(totalPages, spreadOpts);
    if (!isEndHalfSpreadLeftPage(left, totalPages, spreadOpts)) return false;

    const all = readAll();
    const album = all[albumId];
    if (!album) return false;

    const spreadKey = spreadStorageKey(left);
    const spreadStored = album[spreadKey];
    const right = left + 1;
    const rightStored = right < totalPages ? album[String(right)] : null;

    if (spreadStored == null && rightStored == null) return false;

    const next = { ...album };
    if (next[String(left)] == null) {
        next[String(left)] = spreadStored ?? rightStored;
    }
    delete next[spreadKey];
    if (right < totalPages) delete next[String(right)];

    next.__revision = (next.__revision || 0) + 1;
    all[albumId] = next;
    return writeAll(all);
}

/**
 * With cover spreads, inner photos belong on odd left-page keys (1, 3, 5, …).
 * Legacy data sometimes used even keys (2, 4, …) — move those up by one.
 * Skipped for no-cover albums (correct keys are 0, 2, 4, …) and whole-spread layout.
 */
export function migrateMiskeyedInnerSpreadPhotos(albumId, totalPages, albumMeta = null) {
    if (!albumId || totalPages == null || totalPages < 4) return false;

    const collectionCount = getAlbumCollection(albumId).length;
    const spreadOpts = albumMeta
        ? getAlbumSpreadOptions(albumMeta, { collectionCount })
        : getAlbumSpreadOptions({ has_covers: true, page_count: totalPages }, { collectionCount });
    if (!spreadOpts.hasCovers) return false;
    if (isWholeSpreadLayout(albumMeta?.grid_layout)) return false;

    const { left: endLeft } = getEndSpreadPageIndices(totalPages);
    const all = readAll();
    const album = all[albumId];
    if (!album) return false;

    const next = { ...album };
    let changed = false;

    for (let wrongLeft = 2; wrongLeft < endLeft; wrongLeft += 2) {
        const wrongKey = spreadStorageKey(wrongLeft);
        if (next[wrongKey] == null) continue;

        const correctKey = spreadStorageKey(wrongLeft - 1);
        if (next[correctKey] == null) {
            next[correctKey] = next[wrongKey];
        }
        delete next[wrongKey];
        changed = true;
    }

    if (!changed) return false;
    next.__revision = (next.__revision || 0) + 1;
    all[albumId] = next;
    return writeAll(all);
}

/** Move front-cover spread storage to page 1 (blank left on page 0). */
export function migrateFrontCoverSpreadToPageOne(albumId) {
    if (!albumId) return false;
    const all = readAll();
    const album = all[albumId];
    if (!album) return false;

    const spreadKey = spreadStorageKey(0);
    const spreadStored = album[spreadKey];
    const page0 = album['0'];
    if (spreadStored == null && page0 == null) return false;

    const next = { ...album };
    if (spreadStored != null) {
        if (next['1'] == null) next['1'] = spreadStored;
        delete next[spreadKey];
    }
    if (page0 != null) {
        if (next['1'] == null) next['1'] = page0;
        delete next['0'];
    }
    next.__revision = (next.__revision || 0) + 1;
    all[albumId] = next;
    return writeAll(all);
}

/** Whole-spread, no covers: move page-1 photo onto spread:0. Skipped when has_covers. */
export function migrateWholeSpreadPhotoOffRightPage(albumId, albumMeta = null) {
    if (!albumId || !isWholeSpreadLayout(albumMeta?.grid_layout)) return false;
    if (albumMeta?.has_covers !== false) return false;
    if (getSpreadPhotoOverride(albumId, 0)) return false;
    const onRight = getPagePhotoOverride(albumId, 1);
    if (!onRight) return false;

    const all = readAll();
    const album = all[albumId];
    if (!album) return false;

    const next = { ...album };
    next[spreadStorageKey(0)] = next['1'];
    delete next['1'];
    next.__revision = (next.__revision || 0) + 1;
    all[albumId] = next;
    return writeAll(all);
}

/** Move single-page placements onto spread:* keys for whole-spread albums. */
export function migrateWholeSpreadPagePhotosToSpreadKeys(albumId, totalPages, albumMeta = null) {
    if (!albumId || totalPages == null || totalPages < 2) return false;
    if (!isWholeSpreadLayout(albumMeta?.grid_layout)) return false;

    const all = readAll();
    const album = all[albumId];
    if (!album) return false;

    const next = { ...album };
    let changed = false;

    for (let left = 0; left < totalPages; left += 2) {
        const spreadKey = spreadStorageKey(left);
        if (next[spreadKey] != null) continue;

        const right = left + 1;
        const leftStored = next[String(left)];
        const rightStored = right < totalPages ? next[String(right)] : null;
        const photo = leftStored ?? rightStored;
        if (photo == null) continue;

        next[spreadKey] = photo;
        delete next[String(left)];
        if (right < totalPages) delete next[String(right)];
        changed = true;
    }

    if (!changed) return false;
    next.__revision = (next.__revision || 0) + 1;
    all[albumId] = next;
    return writeAll(all);
}

export function getSpreadPhotoOverride(albumId, leftPage) {
    if (!albumId || leftPage == null) return null;
    const album = readAll()[albumId];
    const local = resolveStoredPhoto(albumId, album?.[spreadStorageKey(leftPage)]);
    if (local) return local;
    return resolveRemotePagePhoto(albumId, spreadStorageKey(leftPage));
}

export function getPagePhotoOverride(albumId, pageNum) {
    if (!albumId || pageNum == null) return null;
    const album = readAll()[albumId];
    const local = resolveStoredPhoto(albumId, album?.[String(pageNum)]);
    if (local) return local;
    return resolveRemotePagePhoto(albumId, String(pageNum));
}

/** Cover image on page 1 (right leaf of front spread; page 0 stays blank). */
export function resolveCoverImageSrc(album, { showSamples = false } = {}) {
    const albumId = album?.id;
    if (albumId) {
        const onRight = getPagePhotoOverride(albumId, 1);
        if (onRight) return onRight;
        const legacyPage = getPagePhotoOverride(albumId, 0);
        if (legacyPage) return legacyPage;
        const onSpread = getSpreadPhotoOverride(albumId, 0);
        if (onSpread) return onSpread;
    }
    if (album?.cover_image_url) return album.cover_image_url;
    if (albumId) {
        const first = getAlbumCollection(albumId)[0];
        const fromCollection = resolveCollectionItemUrl(albumId, first?.id);
        if (fromCollection) return fromCollection;
        const fromCloud = deriveCoverUrlFromSnapshot(getRemotePreviewData(albumId));
        if (fromCloud) return fromCloud;
    }
    return showSamples ? getSampleImageForPage(0) : null;
}

/**
 * Inside-cover spread must use page 2 only (never spread:1 panoramic).
 * Moves legacy spread:1 placements to page 2.
 */
export function migrateInsideCoverSpreadToPageTwo(albumId, totalPages) {
    if (!albumId || totalPages == null || totalPages < 3) return false;
    if (!isCoverInsidePage(1, totalPages)) return false;

    const all = readAll();
    const album = all[albumId];
    if (!album) return false;

    const spreadKey = spreadStorageKey(1);
    const spreadStored = album[spreadKey];
    if (spreadStored == null) return false;

    const next = { ...album };
    if (next['2'] == null) {
        next['2'] = spreadStored;
    }
    delete next['1'];
    delete next[spreadKey];
    next.__revision = (next.__revision || 0) + 1;
    all[albumId] = next;
    return writeAll(all);
}

/** Resolved image for inside-cover right page (page 2). */
export function getInsideCoverRightPhotoSrc(albumId, { showSamples = false } = {}) {
    if (!albumId) return showSamples ? getSampleImageForPage(2) : null;
    const pageSrc = getPagePhotoOverride(albumId, 2);
    if (pageSrc) return pageSrc;
    const spreadSrc = getSpreadPhotoOverride(albumId, 1);
    if (spreadSrc) return spreadSrc;
    return showSamples ? getSampleImageForPage(2) : null;
}

/** @deprecated Use migrateInsideCoverSpreadToPageTwo */
export function migrateDuplicateCoverFromInnerSpread(albumId, totalPages) {
    return migrateInsideCoverSpreadToPageTwo(albumId, totalPages);
}

/** Per-slot image: whole-spread photo (panoramic) or single-page override. */
export function getGridSlotPhoto(
    albumId,
    pageNum,
    cellId,
    spreadLeftPage,
    totalPages,
    { wholeSpread = false, spreadOpts } = {}
) {
    const opts = {
        ...normalizeSpreadOpts(spreadOpts),
        totalPages: spreadOpts?.totalPages ?? totalPages,
    };
    if (totalPages != null && isEndHalfSpreadLeftPage(spreadLeftPage, totalPages, opts)) {
        const pageSrc = getPagePhotoOverride(albumId, pageNum);
        if (pageSrc) return { src: pageSrc, panoramic: null };
        const spreadSrc = getSpreadPhotoOverride(albumId, spreadLeftPage);
        if (spreadSrc) return { src: spreadSrc, panoramic: null };
        const { right } = getEndSpreadPageIndices(totalPages);
        const rightSrc = getPagePhotoOverride(albumId, right);
        if (rightSrc && pageNum === spreadLeftPage) {
            return { src: rightSrc, panoramic: null };
        }
        return { src: null, panoramic: null };
    }
    if (totalPages != null && isInsideCoverSpreadLeft(spreadLeftPage, totalPages)) {
        if (isCoverInsidePage(pageNum, totalPages)) {
            return { src: null, panoramic: null };
        }
        const pageSrc = getPagePhotoOverride(albumId, pageNum);
        if (pageSrc) return { src: pageSrc, panoramic: null };
        const spreadSrc = getSpreadPhotoOverride(albumId, spreadLeftPage);
        if (spreadSrc) return { src: spreadSrc, panoramic: null };
        return { src: null, panoramic: null };
    }
    const spreadSrc = getSpreadPhotoOverride(albumId, spreadLeftPage);
    const pageSrc = getPagePhotoOverride(albumId, pageNum);

    if (!wholeSpread && pageSrc) {
        return { src: pageSrc, panoramic: null };
    }
    if (spreadSrc) {
        return { src: spreadSrc, panoramic: cellId === 1 ? 'left' : 'right' };
    }
    if (pageSrc) return { src: pageSrc, panoramic: null };
    return { src: null, panoramic: null };
}

export function hasGridSlotPhoto(
    albumId,
    pageNum,
    cellId,
    spreadLeftPage,
    totalPages,
    { wholeSpread = false, spreadOpts } = {}
) {
    const opts = {
        ...normalizeSpreadOpts(spreadOpts),
        totalPages: spreadOpts?.totalPages ?? totalPages,
    };
    if (totalPages != null && isEndHalfSpreadLeftPage(spreadLeftPage, totalPages, opts)) {
        if (getPagePhotoOverride(albumId, pageNum)) return true;
        if (getSpreadPhotoOverride(albumId, spreadLeftPage)) return true;
        const { right } = getEndSpreadPageIndices(totalPages);
        return Boolean(pageNum === spreadLeftPage && getPagePhotoOverride(albumId, right));
    }
    if (totalPages != null && isInsideCoverSpreadLeft(spreadLeftPage, totalPages, opts)) {
        if (isCoverInsidePage(pageNum, totalPages, opts)) return false;
        return Boolean(
            getPagePhotoOverride(albumId, pageNum) ||
                getSpreadPhotoOverride(albumId, spreadLeftPage)
        );
    }
    if (!wholeSpread && getPagePhotoOverride(albumId, pageNum)) return true;
    if (getSpreadPhotoOverride(albumId, spreadLeftPage)) return true;
    return Boolean(getPagePhotoOverride(albumId, pageNum));
}

export function getAlbumPhotoRevision(albumId) {
    const album = readAll()[albumId];
    if (album?.__revision != null) return album.__revision;
    return getRemotePreviewData(albumId)?.revision ?? 0;
}

/** First available image for album list cards (cover, collection, or placed pages). */
export function getAlbumListThumbnailUrl(albumId) {
    if (!albumId) return null;

    const coverSrc = getPagePhotoOverride(albumId, 1) || getPagePhotoOverride(albumId, 0);
    if (coverSrc) return coverSrc;

    const collection = getAlbumCollection(albumId);
    if (collection[0]?.dataUrl) return collection[0].dataUrl;

    const stored = readAll()[albumId] || {};
    const keys = Object.keys(stored).filter((k) => k !== '__revision');

    const pageNums = keys
        .filter((k) => !k.startsWith('spread:'))
        .map((k) => Number(k))
        .filter((n) => !Number.isNaN(n) && n > 0)
        .sort((a, b) => a - b);

    for (const page of pageNums) {
        const src = getPagePhotoOverride(albumId, page);
        if (src) return src;
    }

    const spreadKeys = keys.filter((k) => k.startsWith('spread:')).sort((a, b) => {
        const leftA = Number(a.replace('spread:', ''));
        const leftB = Number(b.replace('spread:', ''));
        return leftA - leftB;
    });

    for (const key of spreadKeys) {
        const leftPage = Number(key.replace('spread:', ''));
        const src = getSpreadPhotoOverride(albumId, leftPage);
        if (src) return src;
    }

    return deriveCoverUrlFromSnapshot(getRemotePreviewData(albumId));
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
function remapPageStoredValue(stored, idMap) {
    if (stored == null) return stored;
    if (typeof stored === 'string') return stored;
    if (typeof stored === 'object' && stored.collectionItemId) {
        const newId = idMap.get(stored.collectionItemId);
        return newId ? { collectionItemId: newId } : { collectionItemId: stored.collectionItemId };
    }
    if (typeof stored === 'object') return { ...stored };
    return stored;
}

/** Copy page / spread placements from one album to another (remaps collection item ids). */
export function copyAlbumPagePhotos(sourceAlbumId, targetAlbumId, idMap = new Map()) {
    if (!sourceAlbumId || !targetAlbumId) return;

    const all = readAll();
    const local = all[sourceAlbumId] || {};
    const remote = getRemotePreviewData(sourceAlbumId);
    const keys = new Set([
        ...Object.keys(local).filter((k) => k !== '__revision'),
        ...Object.keys(remote?.pages || {}),
    ]);

    if (keys.size === 0) return;

    const target = { __revision: Date.now() };
    for (const key of keys) {
        const stored = local[key] ?? remote?.pages?.[key];
        if (stored == null) continue;
        target[key] = remapPageStoredValue(stored, idMap);
    }

    all[targetAlbumId] = target;
    writeAll(all);
}

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
export function setSpreadPhoto(
    albumId,
    leftPage,
    dataUrl,
    rightPage,
    { totalPages, spreadOpts } = {}
) {
    if (!albumId || leftPage == null || !dataUrl) return false;
    const opts = { ...normalizeSpreadOpts(spreadOpts), totalPages };
    if (totalPages != null && isEndHalfSpreadLeftPage(leftPage, totalPages, opts)) {
        return setPagePhotoFromDataUrl(albumId, leftPage, dataUrl, { clearSpreadForLeft: leftPage });
    }
    const all = readAll();
    const album = { ...(all[albumId] || {}) };
    album[spreadStorageKey(leftPage)] = dataUrl;
    delete album[String(leftPage)];
    if (rightPage != null) delete album[String(rightPage)];
    album.__revision = (album.__revision || 0) + 1;
    all[albumId] = album;
    return writeAll(all);
}

export function setSpreadPhotoFromCollectionItem(
    albumId,
    leftPage,
    collectionItemId,
    rightPage,
    { totalPages, spreadOpts } = {}
) {
    if (!albumId || leftPage == null || !collectionItemId) return false;
    const opts = { ...normalizeSpreadOpts(spreadOpts), totalPages };
    if (totalPages != null && isEndHalfSpreadLeftPage(leftPage, totalPages, opts)) {
        return setPagePhotoFromCollectionItem(albumId, leftPage, collectionItemId, {
            clearSpreadForLeft: leftPage,
        });
    }
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

/** Fill spreads from collection order (1st upload → first slot, etc.). */
export function applyCollectionOrderToPages(albumId, album, { itemIds } = {}) {
    if (!albumId || !album) return 0;
    const items = itemIds?.length
        ? itemIds.map((id) => getCollectionItem(albumId, id)).filter(Boolean)
        : getAlbumCollection(albumId);
    const spreadOpts = getAlbumSpreadOptions(album, { collectionCount: items.length });
    if (!items.length) return 0;

    const gridLayout = album.grid_layout || 'two-page';
    const wholeSpread = isWholeSpreadLayout(gridLayout);
    const requiredPages = computePageCountFromPhotoCount(items.length, {
        includeCovers: spreadOpts.hasCovers,
        gridLayout,
    });
    const totalPages = Math.max(album.page_count ?? 21, requiredPages);

    clearAllAlbumPagePhotos(albumId, { totalPages });

    const placed = autoPlaceCollectionItems(
        albumId,
        items.map((item) => item.id),
        {
            totalPages,
            gridLayout,
            showCover: spreadOpts.showCover,
            hasCovers: spreadOpts.hasCovers,
        }
    );

    if (spreadOpts.hasCovers) {
        migrateFrontCoverSpreadToPageOne(albumId);
        migrateEndHalfSpreadToLeftPage(albumId, totalPages, album);
    } else if (wholeSpread) {
        migrateWholeSpreadPagePhotosToSpreadKeys(albumId, totalPages, album);
    }

    return placed;
}

export function autoPlaceCollectionItems(
    albumId,
    collectionItemIds,
    { totalPages = 21, gridLayout, showCover = true, hasCovers } = {}
) {
    if (!albumId || !collectionItemIds?.length) return 0;

    const spreadOpts = {
        showCover,
        hasCovers: hasCovers ?? showCover,
        totalPages,
    };

    if (isWholeSpreadLayout(gridLayout)) {
        const slots = spreadOpts.hasCovers
            ? enumerateCoverCollectionPlacements(collectionItemIds.length, totalPages, {
                  gridLayout,
              })
            : enumerateAutoPlacePageTargets(totalPages, {
                  showCover,
                  hasCovers: false,
                  gridLayout: 'whole-spread',
              }).map((leftPage) => ({
                  type: 'spread',
                  leftPage,
                  rightPage: leftPage + 1 < totalPages ? leftPage + 1 : leftPage,
              }));

        let placed = 0;
        for (let i = 0; i < Math.min(collectionItemIds.length, slots.length); i += 1) {
            const slot = slots[i];
            if (slot.type === 'spread') {
                if (
                    setSpreadPhotoFromCollectionItem(
                        albumId,
                        slot.leftPage,
                        collectionItemIds[i],
                        slot.rightPage,
                        { totalPages, spreadOpts }
                    )
                ) {
                    placed += 1;
                }
            } else if (
                setPagePhotoFromCollectionItem(albumId, slot.pageNum, collectionItemIds[i], {
                    clearSpreadForLeft: getSpreadLeftPageIndex(slot.pageNum, {
                        ...spreadOpts,
                        totalPages,
                    }),
                })
            ) {
                placed += 1;
            }
        }
        return placed;
    }

    if (spreadOpts.hasCovers) {
        const slots = enumerateCoverCollectionPlacements(collectionItemIds.length, totalPages, {
            gridLayout: 'two-page',
        });
        let placed = 0;
        for (let i = 0; i < Math.min(collectionItemIds.length, slots.length); i += 1) {
            const slot = slots[i];
            if (slot.type === 'spread') {
                if (
                    setSpreadPhotoFromCollectionItem(
                        albumId,
                        slot.leftPage,
                        collectionItemIds[i],
                        slot.rightPage,
                        { totalPages, spreadOpts }
                    )
                ) {
                    placed += 1;
                }
            } else if (
                setPagePhotoFromCollectionItem(albumId, slot.pageNum, collectionItemIds[i], {
                    clearSpreadForLeft: getSpreadLeftPageIndex(slot.pageNum, {
                        ...spreadOpts,
                        totalPages,
                    }),
                })
            ) {
                placed += 1;
            }
        }
        return placed;
    }

    const pageTargets = enumerateCollectionPlacementPages(
        collectionItemIds.length,
        totalPages,
        {
            showCover,
            hasCovers: false,
            gridLayout: 'two-page',
        }
    );

    let placed = 0;
    for (let i = 0; i < Math.min(collectionItemIds.length, pageTargets.length); i += 1) {
        const page = pageTargets[i];
        const spreadLeftPage = getSpreadLeftPageIndex(page, { ...spreadOpts, totalPages });
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
