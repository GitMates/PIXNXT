import { expandUploadFilesToImages } from '../../lib/pdfToImages';
import { storageService } from '../../services/storage.service';
import { getSpreadLeftPageIndex } from './albumSpreadGrid';
import {
    albumHasBlankCovers,
    albumUsesBookWrap,
    enumerateAutoPlacePageTargets,
    enumerateCollectionPlacementPages,
    enumerateCoverCollectionPlacements,
    enumerateWholeSpreadBlankCoverPlacements,
    getAlbumSpreadOptions,
    getEndSpreadPageIndices,
    getLastSpreadInfo,
    isCoverInsidePage,
    isEndHalfSpreadLeftPage,
    isInsideCoverSpreadLeft,
    isPreBackHalfSpreadLeftPage,
    isWholeSpreadLayout,
    normalizeSpreadOpts,
} from './albumSpreadUtils';
import { computePageCountFromPhotoCount } from '../../pages/smart-albums/createAlbumLayout';
import {
    photoFillsWholeFromItem,
    resolvePhotoFillsWholeFlags,
} from './albumGridSize';
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

/** Store cover as a full spread (spread:0) instead of a single right page. */
export function migrateFrontCoverToFullSpread(albumId) {
    if (!albumId) return false;
    const all = readAll();
    const album = all[albumId];
    if (!album) return false;

    const spreadKey = spreadStorageKey(0);
    const next = { ...album };
    let changed = false;

    if (next[spreadKey] == null) {
        const photo = next['1'] ?? next['0'];
        if (photo == null) return false;
        next[spreadKey] = photo;
        changed = true;
    }

    if (next['0'] != null) {
        delete next['0'];
        changed = true;
    }
    if (next['1'] != null) {
        delete next['1'];
        changed = true;
    }

    if (!changed) return false;
    next.__revision = (next.__revision || 0) + 1;
    all[albumId] = next;
    return writeAll(all);
}

/** @deprecated Renamed — migrates cover onto spread:0 for a full-spread cover. */
export function migrateFrontCoverSpreadToPageOne(albumId) {
    return migrateFrontCoverToFullSpread(albumId);
}

/** Back cover uses the left half of spread:0 — drop separate end-page placements. */
export function migrateBackCoverUsesBookWrap(albumId, totalPages) {
    if (!albumId || totalPages == null || !getSpreadPhotoOverride(albumId, 0)) return false;
    const { left, right } = getEndSpreadPageIndices(totalPages);
    const all = readAll();
    const album = all[albumId];
    if (!album) return false;

    const next = { ...album };
    let changed = false;
    for (const key of [String(left), String(right), spreadStorageKey(left)]) {
        if (next[key] != null) {
            delete next[key];
            changed = true;
        }
    }
    if (!changed) return false;
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

        if (
            albumHasBlankCovers(albumMeta) &&
            ((leftStored && !rightStored) || (!leftStored && rightStored))
        ) {
            continue;
        }

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

export function spreadHasWholeSpreadPhoto(albumId, spreadLeft) {
    return Boolean(getSpreadPhotoOverride(albumId, spreadLeft));
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

/**
 * Book-wrap image for the cover editor — spread:0 or collection order 1 only
 * (avoids a separate page-1 photo showing as the front half).
 */
export function resolveBookWrapSpreadSrc(album, { showSamples = false } = {}) {
    const albumId = album?.id;
    if (albumId) {
        const onSpread = getSpreadPhotoOverride(albumId, 0);
        if (onSpread) return onSpread;
        if (!albumHasBlankCovers(album)) {
            const first = getAlbumCollection(albumId)[0];
            const fromCollection = resolveCollectionItemUrl(albumId, first?.id);
            if (fromCollection) return fromCollection;
        }
    }
    if (albumHasBlankCovers(album)) {
        return showSamples ? null : null;
    }
    if (album?.cover_image_url) return album.cover_image_url;
    return showSamples ? getSampleImageForPage(0) : null;
}

/** Book-wrap cover image (spread:0) — right half = front, left half = back. */
export function resolveCoverImageSrc(album, { showSamples = false } = {}) {
    const albumId = album?.id;
    const blankCovers = albumHasBlankCovers(album);
    if (albumId) {
        const onSpread = getSpreadPhotoOverride(albumId, 0);
        if (onSpread) return onSpread;
        const onRight = getPagePhotoOverride(albumId, 1);
        if (onRight) return onRight;
        const legacyPage = getPagePhotoOverride(albumId, 0);
        if (legacyPage) return legacyPage;
    }
    if (blankCovers) {
        return showSamples ? null : null;
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
 * Inside-cover spread must use page 3 only (right half; page 2 stays blank).
 * Moves legacy spread:1 / page-2 placements to page 3.
 */
export function migrateInsideCoverSpreadToPageTwo(albumId, totalPages, albumMeta = null) {
    if (!albumId || totalPages == null || totalPages < 4) return false;
    if (isWholeSpreadLayout(albumMeta?.grid_layout)) return false;
    if (!isCoverInsidePage(1, totalPages)) return false;

    const all = readAll();
    const album = all[albumId];
    if (!album) return false;

    const spreadKey = spreadStorageKey(1);
    const spreadKey2 = spreadStorageKey(2);
    const spreadStored = album[spreadKey] ?? album[spreadKey2];
    const pageTwoStored = album['2'];
    const source = spreadStored ?? pageTwoStored;
    if (source == null) return false;
    if (album['3'] != null && album['3'] === source) return false;

    const next = { ...album };
    if (next['3'] == null) {
        next['3'] = source;
    }
    delete next['2'];
    delete next['1'];
    delete next[spreadKey];
    delete next[spreadKey2];
    next.__revision = (next.__revision || 0) + 1;
    all[albumId] = next;
    return writeAll(all);
}

/** Resolved image for inside-cover right page (page 3). */
export function getInsideCoverRightPhotoSrc(albumId, { showSamples = false } = {}) {
    if (!albumId) return showSamples ? getSampleImageForPage(3) : null;
    const pageSrc = getPagePhotoOverride(albumId, 3);
    if (pageSrc) return pageSrc;
    const legacyPage = getPagePhotoOverride(albumId, 2);
    if (legacyPage) return legacyPage;
    const spreadSrc = getSpreadPhotoOverride(albumId, 2) ?? getSpreadPhotoOverride(albumId, 1);
    if (spreadSrc) return spreadSrc;
    return showSamples ? getSampleImageForPage(3) : null;
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
    if (!wholeSpread && totalPages != null && isEndHalfSpreadLeftPage(spreadLeftPage, totalPages, opts)) {
        const wrapSrc = getSpreadPhotoOverride(albumId, 0);
        if (wrapSrc) {
            return { src: wrapSrc, panoramic: 'left' };
        }
        const pageSrc = getPagePhotoOverride(albumId, pageNum);
        if (pageSrc) return { src: pageSrc, panoramic: null };
        const spreadSrc = getSpreadPhotoOverride(albumId, spreadLeftPage);
        if (spreadSrc) return { src: spreadSrc, panoramic: null };
        return { src: null, panoramic: null };
    }
    if (!wholeSpread && totalPages != null && isPreBackHalfSpreadLeftPage(spreadLeftPage, totalPages, opts)) {
        const pageSrc = getPagePhotoOverride(albumId, pageNum);
        if (pageSrc) return { src: pageSrc, panoramic: null };
        const spreadSrc = getSpreadPhotoOverride(albumId, spreadLeftPage);
        if (spreadSrc) return { src: spreadSrc, panoramic: null };
        return { src: null, panoramic: null };
    }
    if (!wholeSpread && totalPages != null && isInsideCoverSpreadLeft(spreadLeftPage, totalPages, opts)) {
        if (pageNum <= 2) {
            return { src: null, panoramic: null };
        }
        const pageSrc =
            getPagePhotoOverride(albumId, 3) ?? getPagePhotoOverride(albumId, pageNum);
        if (pageSrc) return { src: pageSrc, panoramic: null };
        const spreadSrc = getSpreadPhotoOverride(albumId, spreadLeftPage);
        if (spreadSrc) return { src: spreadSrc, panoramic: null };
        return { src: null, panoramic: null };
    }
    const spreadSrc = getSpreadPhotoOverride(albumId, spreadLeftPage);
    const pageSrc = getPagePhotoOverride(albumId, pageNum);

    if (opts.hasCovers && spreadLeftPage === 0) {
        if (isCoverInsidePage(pageNum, totalPages, opts)) {
            return { src: null, panoramic: null };
        }
        const coverSrc = spreadSrc ?? getPagePhotoOverride(albumId, 1) ?? pageSrc;
        if (coverSrc && pageNum === 1) {
            return { src: coverSrc, panoramic: 'right' };
        }
        return { src: null, panoramic: null };
    }
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
    if (!wholeSpread && totalPages != null && isEndHalfSpreadLeftPage(spreadLeftPage, totalPages, opts)) {
        if (getSpreadPhotoOverride(albumId, 0)) return true;
        if (getPagePhotoOverride(albumId, pageNum)) return true;
        if (getSpreadPhotoOverride(albumId, spreadLeftPage)) return true;
        return false;
    }
    if (!wholeSpread && totalPages != null && isPreBackHalfSpreadLeftPage(spreadLeftPage, totalPages, opts)) {
        if (getPagePhotoOverride(albumId, pageNum)) return true;
        if (getSpreadPhotoOverride(albumId, spreadLeftPage)) return true;
        return false;
    }
    if (!wholeSpread && totalPages != null && isInsideCoverSpreadLeft(spreadLeftPage, totalPages, opts)) {
        if (pageNum <= 2) return false;
        return Boolean(
            getPagePhotoOverride(albumId, 3) ||
                getPagePhotoOverride(albumId, pageNum) ||
                getSpreadPhotoOverride(albumId, spreadLeftPage)
        );
    }
    if (opts.hasCovers && spreadLeftPage === 0) {
        if (isCoverInsidePage(pageNum, totalPages, opts)) return false;
        return Boolean(
            getSpreadPhotoOverride(albumId, 0) || getPagePhotoOverride(albumId, 1)
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

    const coverSrc = getSpreadPhotoOverride(albumId, 0) || getPagePhotoOverride(albumId, 1);
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
    if (
        totalPages != null &&
        isEndHalfSpreadLeftPage(leftPage, totalPages, opts) &&
        !isWholeSpreadLayout(spreadOpts?.gridLayout)
    ) {
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
export async function applyCollectionOrderToPages(albumId, album, { itemIds } = {}) {
    if (!albumId || !album) return 0;
    const items = itemIds?.length
        ? itemIds.map((id) => getCollectionItem(albumId, id)).filter(Boolean)
        : getAlbumCollection(albumId);
    const includeCovers = album?.has_covers === true;
    const blankCovers = albumHasBlankCovers(album);
    const spreadOpts = getAlbumSpreadOptions(
        { ...album, has_covers: includeCovers },
        { collectionCount: items.length }
    );
    if (!items.length) return 0;

    const gridLayout = album.grid_layout || 'two-page';
    const wholeSpread = isWholeSpreadLayout(gridLayout);
    const requiredPages = computePageCountFromPhotoCount(items.length, {
        includeCovers,
        blankCovers,
        gridLayout,
    });
    const totalPages = Math.max(album.page_count ?? 21, requiredPages);

    clearAllAlbumPagePhotos(albumId, { totalPages });

    const pageGridSize = album.grid_size || 'square';
    const photoFillsWhole =
        wholeSpread && blankCovers
            ? await resolvePhotoFillsWholeFlags(items, pageGridSize)
            : null;

    const placed = autoPlaceCollectionItems(
        albumId,
        items.map((item) => item.id),
        {
            totalPages,
            gridLayout,
            pageGridSize,
            photoFillsWhole,
            showCover: spreadOpts.showCover,
            hasCovers: spreadOpts.hasCovers,
            blankCovers,
        }
    );

    if (spreadOpts.hasCovers && albumUsesBookWrap(album)) {
        migrateFrontCoverToFullSpread(albumId);
        migrateBackCoverUsesBookWrap(albumId, totalPages);
        migrateEndHalfSpreadToLeftPage(albumId, totalPages, album);
    } else if (wholeSpread) {
        migrateWholeSpreadPagePhotosToSpreadKeys(albumId, totalPages, album);
    }

    return placed;
}

export function autoPlaceCollectionItems(
    albumId,
    collectionItemIds,
    {
        totalPages = 21,
        gridLayout,
        pageGridSize = 'square',
        photoFillsWhole = null,
        showCover = true,
        hasCovers,
        blankCovers = false,
    } = {}
) {
    if (!albumId || !collectionItemIds?.length) return 0;

    const useCovers = hasCovers === true;
    const spreadOpts = {
        showCover: useCovers,
        hasCovers: useCovers,
        blankCovers: blankCovers === true,
        totalPages,
        gridLayout,
    };

    if (isWholeSpreadLayout(gridLayout)) {
        const fillsWhole =
            photoFillsWhole ??
            collectionItemIds.map((id) => {
                const item = getCollectionItem(albumId, id);
                return photoFillsWholeFromItem(item, pageGridSize);
            });
        const slots = spreadOpts.hasCovers && !spreadOpts.blankCovers
            ? enumerateCoverCollectionPlacements(collectionItemIds.length, totalPages, {
                  gridLayout,
              })
            : spreadOpts.blankCovers
              ? enumerateWholeSpreadBlankCoverPlacements(collectionItemIds.length, totalPages, {
                    pageGridSize,
                    photoFillsWhole: fillsWhole,
                })
              : enumerateAutoPlacePageTargets(totalPages, {
                    showCover: useCovers,
                    hasCovers: useCovers,
                    blankCovers: spreadOpts.blankCovers,
                    gridLayout: 'whole-spread',
                }).map((leftPage) => ({
                    type: 'spread',
                    leftPage,
                    rightPage: leftPage + 1 < totalPages ? leftPage + 1 : leftPage,
                }));

        let placed = 0;
        for (let i = 0; i < Math.min(collectionItemIds.length, slots.length); i += 1) {
            const slot = slots[i];
            if (slot.type === 'book-wrap') {
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
            } else if (slot.type === 'spread') {
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

    if (spreadOpts.hasCovers && !spreadOpts.blankCovers) {
        const slots = enumerateCoverCollectionPlacements(collectionItemIds.length, totalPages, {
            gridLayout: 'two-page',
        });
        let placed = 0;
        for (let i = 0; i < Math.min(collectionItemIds.length, slots.length); i += 1) {
            const slot = slots[i];
            if (slot.type === 'book-wrap') {
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
            } else if (slot.type === 'spread') {
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
            showCover: useCovers,
            hasCovers: useCovers,
            blankCovers: spreadOpts.blankCovers,
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
