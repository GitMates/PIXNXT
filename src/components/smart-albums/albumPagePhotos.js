import { expandUploadFilesToImages } from '../../lib/pdfToImages';
import { storageService } from '../../services/storage.service';
import { getSpreadLeftPageIndex } from './albumSpreadGrid';
import {
    albumHasBlankCovers,
    albumHasCoverSpreads,
    albumUsesBookWrap,
    enumerateAutoPlacePageTargets,
    enumerateCollectionPlacementPages,
    enumerateCoverCollectionPlacements,
    enumerateWholeSpreadBlankCoverPlacements,
    getAlbumSpreadOptions,
    getEndSpreadPageIndices,
    getLastSpreadInfo,
    getPreBackHalfSpreadInfo,
    getSpreadPages,
    isCoverInsidePage,
    isEndHalfSpreadLeftPage,
    isInsideCoverSpreadLeft,
    isPreBackHalfSpreadLeftPage,
    isPreBackHalfSpreadRightPage,
    isWholeSpreadLayout,
    normalizeSpreadOpts,
} from './albumSpreadUtils';
import { readAlbumTransformBucket, writeAlbumTransformBucket } from './albumPageTransforms';
import { computePageCountFromPhotoCount } from '../../pages/smart-albums/createAlbumLayout';
import {
    buildOverviewSpreadReorderPlan,
    reorderOverviewSpreadMetadata,
} from './albumSpreadReorder';
import {
    photoFillsWholeFromItem,
    resolvePhotoFillsWholeFlags,
} from './albumGridSize';
import {
    applyCollectionSortOrder,
    getAlbumCollection,
    getAlbumCollectionRevision,
    getAlbumLayoutPhotoCount,
    getCollectionItem,
    getCollectionItemDisplayUrl,
    isCoverWrapCollectionItem,
    markCollectionItemAsCoverWrap,
    clearCollectionItemCoverWrapRole,
    removeCollectionItem,
} from './albumCollection';
import { getSampleImageForPage } from './sampleAlbumImages';
import {
    deriveCoverUrlFromSnapshot,
    deriveFrontCoverUrlFromSnapshot,
    getRemoteCollectionItem,
    getRemotePagePhoto,
    getRemotePreviewData,
    hydrateAlbumPreviewData,
} from './albumPreviewData';
import {
    ALBUM_PHOTOS_KEY,
    isInlineDataUrl,
    readLocalStorageJson,
    writeLocalStorageJson,
} from '../../lib/albumLocalStorage';

const STORAGE_KEY = ALBUM_PHOTOS_KEY;

function readAll() {
    return readLocalStorageJson(STORAGE_KEY, {});
}

function writeAll(data, preferAlbumId = null) {
    let prefer = preferAlbumId;
    if (!prefer && data && typeof data === 'object') {
        let best = null;
        let bestRev = -1;
        for (const [id, bucket] of Object.entries(data)) {
            const rev = Number(bucket?.__revision) || 0;
            if (rev >= bestRev) {
                bestRev = rev;
                best = id;
            }
        }
        prefer = best;
    }
    const ok = writeLocalStorageJson(STORAGE_KEY, data, {
        preferAlbumId: prefer,
        compact: true,
    });
    if (!ok) console.warn('Could not save album photos');
    return ok;
}

/** Persist only durable refs — never base64 data: blobs (they exhaust the ~5MB quota). */
function lightweightPlacementUrl(url, storagePath) {
    if (storagePath) return null;
    if (!url || isInlineDataUrl(url)) return null;
    return url;
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
    const cacheBust = getAlbumCollectionRevision(albumId);
    return getCollectionItemDisplayUrl(item, { cacheBust });
}

/** Placement payload: id for live lookup + storagePath so display survives a wiped collection catalog. */
function placementFromCollectionItem(albumId, collectionItemId) {
    if (!collectionItemId) return null;
    const item =
        getCollectionItem(albumId, collectionItemId) ??
        getRemoteCollectionItem(albumId, collectionItemId);
    if (!item) return { collectionItemId };
    const storagePath = item.storagePath || null;
    const dataUrl = lightweightPlacementUrl(
        item.dataUrl ||
            (storagePath ? storageService.getPublicUrl(storagePath) : null) ||
            null,
        storagePath
    );
    return {
        collectionItemId,
        ...(storagePath ? { storagePath } : {}),
        ...(dataUrl ? { dataUrl } : {}),
    };
}

function resolveStoredPhoto(albumId, stored) {
    if (!stored) return null;
    if (typeof stored === 'string') return stored;
    // Prefer live collection lookup (cache-busted) so in-place file replaces show immediately.
    // Fall back to stored storagePath only when the collection item is gone.
    if (stored.collectionItemId) {
        const live = resolveCollectionItemUrl(albumId, stored.collectionItemId);
        if (live) return live;
    }
    if (stored.storagePath) {
        const cacheBust = getAlbumCollectionRevision(albumId);
        const url = storageService.getPublicUrl(stored.storagePath);
        if (!url) return stored.dataUrl || null;
        if (cacheBust == null) return url;
        const token = encodeURIComponent(String(cacheBust));
        return url.includes('?') ? `${url}&v=${token}` : `${url}?v=${token}`;
    }
    if (stored.dataUrl) return stored.dataUrl;
    return null;
}

function resolveRemotePagePhoto(albumId, key) {
    const remote = getRemotePagePhoto(albumId, key);
    if (!remote) return null;
    if (typeof remote === 'string') return remote;
    if (remote.collectionItemId) {
        const live = resolveCollectionItemUrl(albumId, remote.collectionItemId);
        if (live) return live;
    }
    if (remote.storagePath) {
        const cacheBust = getAlbumCollectionRevision(albumId);
        const url = storageService.getPublicUrl(remote.storagePath);
        if (!url) return remote.dataUrl || null;
        if (cacheBust == null) return url;
        const token = encodeURIComponent(String(cacheBust));
        return url.includes('?') ? `${url}&v=${token}` : `${url}?v=${token}`;
    }
    if (remote.dataUrl) return remote.dataUrl;
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

/** Snapshot pre-back spread placement before removing inner pages (left photo only). */
export function capturePreBackPlacement(albumId, totalPages, opts = {}) {
    if (!albumId || totalPages == null) return null;
    const info = getPreBackHalfSpreadInfo(totalPages, opts);
    if (!info) return null;
    const { left, right } = info;
    const pageLeft = getStoredPlacement(albumId, String(left));
    const pageRight = getStoredPlacement(albumId, String(right));
    const spread = getStoredPlacement(albumId, spreadStorageKey(left));
    const photo = pageLeft ?? spread ?? null;
    if (photo == null && pageRight == null) return null;
    return { photo, pageLeft, pageRight, spread, oldLeft: left, oldRight: right };
}

/** Re-apply pre-back photo on the new pre-back spread after a page-count shrink. */
export function restorePreBackPlacement(albumId, totalPages, captured, opts = {}) {
    if (!albumId || !captured || totalPages == null) return false;
    const info = getPreBackHalfSpreadInfo(totalPages, opts);
    if (!info) return false;

    const photo = captured.photo ?? captured.pageLeft ?? captured.spread ?? null;
    const { left, right } = info;
    const spreadKey = spreadStorageKey(left);

    const all = readAll();
    const album = { ...(all[albumId] || {}) };
    if (photo != null) {
        album[String(left)] = photo;
    }
    delete album[spreadKey];
    delete album[String(right)];
    album.__revision = (album.__revision || 0) + 1;
    all[albumId] = album;
    writeAll(all);

    const remote = getRemotePreviewData(albumId);
    if (remote?.pages) {
        const pages = { ...remote.pages };
        if (photo != null) {
            pages[String(left)] = photo;
        }
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

/** Move a mistaken whole-spread placement on the pre-back spread to the left page only. */
export function migratePreBackHalfSpreadToLeftPage(albumId, totalPages, albumMeta = null) {
    if (!albumId || totalPages == null) return false;
    const collectionCount = getAlbumLayoutPhotoCount(albumId, albumMeta);
    const spreadOpts = albumMeta
        ? getAlbumSpreadOptions(albumMeta, { collectionCount })
        : getAlbumSpreadOptions(
              { has_covers: true, page_count: totalPages },
              { collectionCount }
          );
    const info = getPreBackHalfSpreadInfo(totalPages, spreadOpts);
    if (!info) return false;
    const { left, right } = info;

    const all = readAll();
    const album = all[albumId];
    if (!album) return false;

    const spreadKey = spreadStorageKey(left);
    const spreadStored = album[spreadKey];
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

/** Move a mistaken whole-spread placement on the last spread to the left page only. */
export function migrateEndHalfSpreadToLeftPage(albumId, totalPages, albumMeta = null) {
    if (!albumId || totalPages == null) return false;
    const collectionCount = getAlbumLayoutPhotoCount(albumId, albumMeta);
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
 * Cover albums store inner spreads on even left-page keys (2, 4, 6, …).
 * Legacy data sometimes used odd keys (1, 3, 5, …) — move those to the next even key.
 * Skipped for no-cover albums and whole-spread layout.
 */
export function migrateMiskeyedInnerSpreadPhotos(albumId, totalPages, albumMeta = null) {
    if (!albumId || totalPages == null || totalPages < 4) return false;

    const collectionCount = getAlbumLayoutPhotoCount(albumId, albumMeta);
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

    for (let oddLeft = 1; oddLeft < endLeft; oddLeft += 2) {
        const wrongKey = spreadStorageKey(oddLeft);
        if (next[wrongKey] == null) continue;

        const correctKey = spreadStorageKey(oddLeft + 1);
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
export function migrateBackCoverUsesBookWrap(albumId, totalPages, albumMeta = null) {
    if (albumMeta?.blank_covers === true) return false;
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

export function getSpreadPlacementCollectionItemId(albumId, leftPage = 0) {
    const stored = getStoredPlacement(albumId, spreadStorageKey(leftPage));
    if (stored && typeof stored === 'object' && stored.collectionItemId) {
        return stored.collectionItemId;
    }
    return null;
}

export function getPagePlacementCollectionItemId(albumId, pageNum) {
    if (!albumId || pageNum == null) return null;
    const stored = getStoredPlacement(albumId, String(pageNum));
    if (stored && typeof stored === 'object' && stored.collectionItemId) {
        return stored.collectionItemId;
    }
    return null;
}

/** True when this collection item is also placed on an inner page (not cover wrap). */
export function collectionItemHasInnerPlacement(albumId, itemId) {
    if (!albumId || !itemId) return false;
    const album = readAll()[albumId];
    if (!album) return false;
    for (const key of Object.keys(album)) {
        if (key === '__revision') continue;
        const stored = album[key];
        if (!stored || typeof stored !== 'object' || stored.collectionItemId !== itemId) {
            continue;
        }
        if (key === spreadStorageKey(0) || key === '0' || key === '1') continue;
        return true;
    }
    return false;
}

/** Where a collection item is placed in the album (for ordering thumbnails). */
export function getCollectionItemPlacementInfo(albumId, itemId) {
    if (!albumId || !itemId) return null;
    const album = readAll()[albumId];
    if (!album) return null;

    let spreadLeft = null;
    let pageNum = null;
    for (const key of Object.keys(album)) {
        if (key === '__revision') continue;
        const stored = album[key];
        if (!stored || typeof stored !== 'object' || stored.collectionItemId !== itemId) continue;
        if (key.startsWith('spread:')) {
            const left = parseInt(key.slice(7), 10);
            if (!Number.isNaN(left)) {
                spreadLeft = spreadLeft == null ? left : Math.min(spreadLeft, left);
            }
            continue;
        }
        if (/^\d+$/.test(key)) {
            const page = parseInt(key, 10);
            if (!Number.isNaN(page)) {
                pageNum = pageNum == null ? page : Math.min(pageNum, page);
            }
        }
    }

    if (spreadLeft != null) {
        return { sortKey: spreadLeft, mode: 'spread', spreadLeft, pageNum: spreadLeft };
    }
    if (pageNum != null) {
        return { sortKey: pageNum, mode: 'page', pageNum };
    }
    return null;
}

function collectionItemSortRank(item, albumId) {
    if (isCoverWrapCollectionItem(item)) return -1000;
    const placement = getCollectionItemPlacementInfo(albumId, item.id);
    if (placement) return placement.sortKey;
    if (typeof item.sortOrder === 'number' && Number.isFinite(item.sortOrder)) {
        return 1_000_000 + item.sortOrder;
    }
    if (typeof item.createdAt === 'number' && Number.isFinite(item.createdAt)) {
        return 1_000_000 + item.createdAt;
    }
    return Number.MAX_SAFE_INTEGER;
}

/** Collection item ids sorted by spread/page position in the album. */
export function buildCollectionOrderByPlacement(albumId) {
    const items = getAlbumCollection(albumId);
    if (!items.length) return [];
    return [...items]
        .sort((a, b) => {
            const rankA = collectionItemSortRank(a, albumId);
            const rankB = collectionItemSortRank(b, albumId);
            if (rankA !== rankB) return rankA - rankB;
            return String(a.id || '').localeCompare(String(b.id || ''));
        })
        .map((item) => item.id);
}

/** Reorder collection thumbnails to match album spread order. */
export function syncCollectionOrderToPlacements(albumId) {
    if (!albumId) return false;
    return applyCollectionSortOrder(albumId, buildCollectionOrderByPlacement(albumId));
}

/** Collection item id currently placed on an editor slot (whole spread, page, or cell). */
export function getSlotPlacementCollectionItemId(albumId, slot) {
    if (!albumId || !slot) return null;
    const left = slot.spreadLeft ?? slot.pageNum;
    if (slot.whole) {
        return getSpreadPlacementCollectionItemId(albumId, left);
    }
    const pageItemId = getPagePlacementCollectionItemId(albumId, slot.pageNum);
    if (pageItemId) return pageItemId;
    return getSpreadPlacementCollectionItemId(albumId, left);
}

/**
 * After an in-place collection file replace, rewrite every placement that still
 * points at the old storagePath so the flipbook / filmstrip show the new file.
 */
export function syncCollectionItemPlacements(albumId, collectionItemId) {
    if (!albumId || !collectionItemId) return false;
    const item =
        getCollectionItem(albumId, collectionItemId) ??
        getRemoteCollectionItem(albumId, collectionItemId);
    if (!item) return false;

    const nextPlacement = placementFromCollectionItem(albumId, collectionItemId);
    if (!nextPlacement) return false;

    const all = readAll();
    const album = { ...(all[albumId] || {}) };
    let changed = false;

    for (const key of Object.keys(album)) {
        if (key === '__revision') continue;
        const stored = album[key];
        if (!stored || typeof stored !== 'object') continue;
        if (stored.collectionItemId !== collectionItemId) continue;
        if (
            stored.storagePath === nextPlacement.storagePath &&
            stored.dataUrl === nextPlacement.dataUrl
        ) {
            continue;
        }
        album[key] = { ...stored, ...nextPlacement };
        changed = true;
    }

    if (changed) {
        album.__revision = (album.__revision || 0) + 1;
        all[albumId] = album;
        writeAll(all);
    }

    const remote = getRemotePreviewData(albumId);
    if (remote?.pages) {
        const pages = { ...remote.pages };
        let remoteChanged = false;
        for (const key of Object.keys(pages)) {
            const stored = pages[key];
            if (!stored || typeof stored !== 'object') continue;
            if (stored.collectionItemId !== collectionItemId) continue;
            if (
                stored.storagePath === nextPlacement.storagePath &&
                stored.dataUrl === nextPlacement.dataUrl
            ) {
                continue;
            }
            pages[key] = { ...stored, ...nextPlacement };
            remoteChanged = true;
        }
        if (remoteChanged) {
            hydrateAlbumPreviewData(albumId, {
                ...remote,
                pages,
                revision: (remote.revision || 0) + 1,
            });
            changed = true;
        }
    }

    return changed;
}

export function pageHasPlacedPhoto(albumId, pageNum) {
    if (!albumId || pageNum == null) return false;
    return Boolean(
        getPagePlacementCollectionItemId(albumId, pageNum) || getPagePhotoOverride(albumId, pageNum)
    );
}

/** Find the collection item on a spread, including half-page and inside-cover layouts. */
export function resolveSlotCollectionItemId(
    albumId,
    slot,
    { totalPages = 0, spreadOpts = {}, album = null } = {}
) {
    if (!albumId || !slot) return null;

    const left = slot.spreadLeft ?? slot.pageNum;
    const coverSlot =
        left === 0 &&
        slot.label !== 'Inside cover' &&
        (slot.label === 'Cover' ||
            slot.pageNum === 0 ||
            slot.cellId === 0);

    if (coverSlot) {
        const wrapId = getSpreadPlacementCollectionItemId(albumId, 0);
        if (wrapId && !collectionItemHasInnerPlacement(albumId, wrapId)) {
            return wrapId;
        }
        const page0 = getPagePlacementCollectionItemId(albumId, 0);
        if (page0 && !collectionItemHasInnerPlacement(albumId, page0)) {
            return page0;
        }
        return null;
    }

    const direct = getSlotPlacementCollectionItemId(albumId, slot);
    if (direct) {
        if (isCoverWrapCollectionItem(getCollectionItem(albumId, direct))) {
            return null;
        }
        return direct;
    }

    if (left == null) return null;

    const fromSpread = getSpreadPlacementCollectionItemId(albumId, left);
    if (fromSpread && left !== 0) {
        if (isCoverWrapCollectionItem(getCollectionItem(albumId, fromSpread))) {
            return null;
        }
        return fromSpread;
    }

    const maxPage = Math.max(0, totalPages - 1);
    const right = Math.min(left + 1, maxPage);
    const pageCandidates = new Set([slot.pageNum, left, right]);

    if (spreadOpts.hasCovers && albumHasBlankCovers(album) && isInsideCoverSpreadLeft(left, totalPages, spreadOpts)) {
        pageCandidates.add(3);
        pageCandidates.delete(0);
        pageCandidates.delete(1);
    }
    if (isEndHalfSpreadLeftPage(left, totalPages, spreadOpts)) {
        pageCandidates.add(getEndSpreadPageIndices(totalPages).left);
    }
    if (isPreBackHalfSpreadLeftPage(left, totalPages, spreadOpts)) {
        pageCandidates.add(left);
    }

    for (const pageNum of pageCandidates) {
        if (pageNum == null || pageNum < 0 || pageNum > maxPage) continue;
        if (pageNum === 0 || pageNum === 1) continue;
        const id = getPagePlacementCollectionItemId(albumId, pageNum);
        if (id && !isCoverWrapCollectionItem(getCollectionItem(albumId, id))) return id;
    }
    return null;
}

/** Tag the collection item on spread:0 so it is excluded from inner-page auto-place. */
export function syncCoverWrapRoleFromSpread(albumId, albumMeta = null) {
    if (!albumId) return false;
    if (albumHasBlankCovers(albumMeta)) return false;
    const itemId = getSpreadPlacementCollectionItemId(albumId, 0);
    if (!itemId || collectionItemHasInnerPlacement(albumId, itemId)) return false;
    return markCollectionItemAsCoverWrap(albumId, itemId);
}

/**
 * Cover wrap (spread:0) and Spread 01 must not share a collection item.
 * Blank covers: keep the inner photo and drop the wrap (leather until a dedicated cover is uploaded).
 * Book wrap: keep the wrap and strip that item from inner pages.
 */
export function unlinkSharedCoverAndInnerPlacement(albumId, albumMeta = null) {
    if (!albumId) return false;

    if (albumMeta && albumHasCoverSpreads(albumMeta) && !albumHasBlankCovers(albumMeta)) {
        const wrapId = getSpreadPlacementCollectionItemId(albumId, 0);
        if (wrapId && collectionItemHasInnerPlacement(albumId, wrapId)) {
            return clearCollectionItemPlacements(albumId, wrapId, { keepSpreadLeft: 0 });
        }
        return false;
    }

    const coverIds = [
        getSpreadPlacementCollectionItemId(albumId, 0),
        getPagePlacementCollectionItemId(albumId, 0),
        getPagePlacementCollectionItemId(albumId, 1),
    ].filter(Boolean);
    const uniqueIds = [...new Set(coverIds)];
    if (!uniqueIds.length) return false;

    const all = readAll();
    const album = all[albumId];
    if (!album) return false;

    const next = { ...album };
    let changed = false;
    const coverKeys = [spreadStorageKey(0), '0', '1'];

    for (const itemId of uniqueIds) {
        if (!collectionItemHasInnerPlacement(albumId, itemId)) continue;
        for (const key of coverKeys) {
            const stored = next[key];
            if (stored && typeof stored === 'object' && stored.collectionItemId === itemId) {
                delete next[key];
                changed = true;
            }
        }
        if (isCoverWrapCollectionItem(getCollectionItem(albumId, itemId))) {
            clearCollectionItemCoverWrapRole(albumId, itemId);
            changed = true;
        }
    }

    if (changed) {
        next.__revision = (next.__revision || 0) + 1;
        all[albumId] = next;
        writeAll(all);
        const remote = getRemotePreviewData(albumId);
        if (remote?.pages) {
            const pages = { ...remote.pages };
            let remoteChanged = false;
            for (const itemId of uniqueIds) {
                if (!collectionItemHasInnerPlacement(albumId, itemId)) continue;
                for (const key of coverKeys) {
                    const stored = pages[key];
                    if (stored && typeof stored === 'object' && stored.collectionItemId === itemId) {
                        delete pages[key];
                        remoteChanged = true;
                    }
                }
            }
            if (remoteChanged) {
                hydrateAlbumPreviewData(albumId, {
                    ...remote,
                    pages,
                    revision: (remote.revision || 0) + 1,
                });
            }
        }
    }
    return changed;
}

/** Remove this item from cover wrap keys only — used when it is placed on an inner spread. */
export function clearCoverPlacementsForItem(albumId, itemId) {
    if (!albumId || !itemId) return false;
    const all = readAll();
    const album = all[albumId];
    if (!album) return false;
    const next = { ...album };
    let changed = false;
    for (const key of [spreadStorageKey(0), '0', '1']) {
        const stored = next[key];
        if (stored && typeof stored === 'object' && stored.collectionItemId === itemId) {
            delete next[key];
            changed = true;
        }
    }
    if (changed) {
        next.__revision = (next.__revision || 0) + 1;
        all[albumId] = next;
        writeAll(all);
    }
    if (isCoverWrapCollectionItem(getCollectionItem(albumId, itemId))) {
        clearCollectionItemCoverWrapRole(albumId, itemId);
        changed = true;
    }
    return changed;
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
    return resolveCoverImageSrc(album, { showSamples });
}

/** Book-wrap cover image (spread:0) — right half = front, left half = back. */
export function resolveCoverImageSrc(album, { showSamples = false } = {}) {
    const albumId = album?.id;
    const blankCovers = albumHasBlankCovers(album);
    if (albumId) {
        const onSpread = getSpreadPhotoOverride(albumId, 0);
        if (onSpread) {
            const wrapId = getSpreadPlacementCollectionItemId(albumId, 0);
            if (wrapId && collectionItemHasInnerPlacement(albumId, wrapId)) {
                return null;
            }
            if (blankCovers) {
                const wrapItem = wrapId ? getCollectionItem(albumId, wrapId) : null;
                if (!(wrapItem && isCoverWrapCollectionItem(wrapItem))) return null;
            }
            return onSpread;
        }
        if (blankCovers) {
            return null;
        }
        const coverWrap = getAlbumCollection(albumId).find((item) => isCoverWrapCollectionItem(item));
        if (
            coverWrap?.id &&
            !collectionItemHasInnerPlacement(albumId, coverWrap.id)
        ) {
            const fromCoverWrap = resolveCollectionItemUrl(albumId, coverWrap.id);
            if (fromCoverWrap) return fromCoverWrap;
        }
        const fromSnapshot =
            deriveFrontCoverUrlFromSnapshot(getRemotePreviewData(albumId), { blankCovers }) ??
            deriveFrontCoverUrlFromSnapshot(album?.preview_data, { blankCovers });
        if (fromSnapshot) return fromSnapshot;
    }
    if (blankCovers) {
        return null;
    }
    return showSamples ? getSampleImageForPage(0) : null;
}

/**
 * Inside-cover spread must use page 3 only (right half; page 2 stays blank).
 * Moves legacy spread:1 / spread:2 / page-2 placements to page 3 — including
 * whole-spread albums that wrongly stored a panoramic on spread:2.
 */
export function migrateInsideCoverSpreadToPageTwo(albumId, totalPages, albumMeta = null) {
    if (!albumId || totalPages == null || totalPages < 4) return false;
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
    if (album['3'] != null && album['3'] === source) {
        // Still clear the left/spread keys so page 2 cannot resurrect a photo.
        const next = { ...album };
        delete next['2'];
        delete next['1'];
        delete next[spreadKey];
        delete next[spreadKey2];
        next.__revision = (next.__revision || 0) + 1;
        all[albumId] = next;
        return writeAll(all);
    }

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
    const spreadSrc = getSpreadPhotoOverride(albumId, 2);
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
    // Pre-back: photo on left only — right stays disabled even with a legacy spread: key.
    if (totalPages != null && isPreBackHalfSpreadLeftPage(spreadLeftPage, totalPages, opts)) {
        if (isPreBackHalfSpreadRightPage(pageNum, totalPages, opts)) {
            return { src: null, panoramic: null };
        }
        const pageSrc = getPagePhotoOverride(albumId, pageNum);
        if (pageSrc) return { src: pageSrc, panoramic: null };
        const spreadSrc = getSpreadPhotoOverride(albumId, spreadLeftPage);
        if (spreadSrc) return { src: spreadSrc, panoramic: null };
        return { src: null, panoramic: null };
    }
    // Inside-cover left is always empty — even if a whole-spread photo sits on spread:2.
    if (totalPages != null && isInsideCoverSpreadLeft(spreadLeftPage, totalPages, opts)) {
        if (pageNum <= 2) {
            return { src: null, panoramic: null };
        }
        const pageSrc =
            getPagePhotoOverride(albumId, 3) ?? getPagePhotoOverride(albumId, pageNum);
        if (pageSrc) return { src: pageSrc, panoramic: null };
        // Legacy: show the old panoramic only on the right page, never both halves.
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
        const coverSrc = spreadSrc;
        if (coverSrc && pageNum === 1) {
            const wrapId = getSpreadPlacementCollectionItemId(albumId, 0);
            if (wrapId && collectionItemHasInnerPlacement(albumId, wrapId)) {
                return { src: null, panoramic: null };
            }
            if (opts.blankCovers) {
                const wrapItem = wrapId ? getCollectionItem(albumId, wrapId) : null;
                if (!(wrapItem && isCoverWrapCollectionItem(wrapItem))) {
                    return { src: null, panoramic: null };
                }
            }
            return { src: coverSrc, panoramic: 'right' };
        }
        return { src: null, panoramic: null };
    }
    if (!wholeSpread && pageSrc) {
        return { src: pageSrc, panoramic: null };
    }
    if (spreadSrc) {
        if (!wholeSpread) {
            const maxPage = spreadOpts?.totalPages ?? totalPages;
            const partnerPage = cellId === 1 ? spreadLeftPage + 1 : spreadLeftPage;
            if (
                partnerPage >= 0 &&
                maxPage != null &&
                partnerPage < maxPage &&
                getPagePhotoOverride(albumId, partnerPage)
            ) {
                return { src: null, panoramic: null };
            }
        }
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
    if (totalPages != null && isPreBackHalfSpreadLeftPage(spreadLeftPage, totalPages, opts)) {
        if (isPreBackHalfSpreadRightPage(pageNum, totalPages, opts)) return false;
        if (getPagePhotoOverride(albumId, pageNum)) return true;
        if (getSpreadPhotoOverride(albumId, spreadLeftPage)) return true;
        return false;
    }
    if (totalPages != null && isInsideCoverSpreadLeft(spreadLeftPage, totalPages, opts)) {
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

/**
 * When placements reference missing collection ids (e.g. c_* after R2 rebuilt as r2_*),
 * remap orphans onto the recovered collection in page-key order → sortOrder.
 * Also fixes collapsed legacy ids (every page shared one truncated r2_ id → image #1).
 */
export function healOrphanCollectionPlacements(albumId) {
    if (!albumId) return false;

    const collection = getAlbumCollection(albumId);
    if (!collection.length) return false;

    const knownIds = new Set(collection.map((item) => item.id).filter(Boolean));
    const localAlbum = { ...(readAll()[albumId] || {}) };
    const remote = getRemotePreviewData(albumId);
    const remotePages = remote?.pages ? { ...remote.pages } : {};

    const keys = [
        ...new Set([
            ...Object.keys(localAlbum).filter((k) => k !== '__revision'),
            ...Object.keys(remotePages),
        ]),
    ].sort((a, b) => {
        const na = Number(String(a).replace(/^spread:/i, ''));
        const nb = Number(String(b).replace(/^spread:/i, ''));
        if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
        return String(a).localeCompare(String(b));
    });

    const orphanOrder = [];
    const orphanSeen = new Set();
    let resolvedCount = 0;
    let orphanPlacementCount = 0;
    const placementKeys = [];

    for (const key of keys) {
        const stored = localAlbum[key] ?? remotePages[key];
        if (!stored || typeof stored !== 'object' || !stored.collectionItemId) continue;
        placementKeys.push(key);
        const id = stored.collectionItemId;
        if (knownIds.has(id)) {
            resolvedCount += 1;
            continue;
        }
        orphanPlacementCount += 1;
        if (!orphanSeen.has(id)) {
            orphanSeen.add(id);
            orphanOrder.push(id);
        }
    }

    const uniqueResolvedIds = new Set(
        placementKeys
            .map((key) => (localAlbum[key] ?? remotePages[key])?.collectionItemId)
            .filter((id) => id && knownIds.has(id))
    );
    const collapsedKnownIds =
        resolvedCount > 1 &&
        uniqueResolvedIds.size === 1 &&
        collection.length > 1;
    const duplicateCollectionIds = (() => {
        const seen = new Set();
        for (const item of collection) {
            if (!item?.id) continue;
            if (seen.has(item.id)) return true;
            seen.add(item.id);
        }
        return false;
    })();
    const collapsedOrphans =
        orphanPlacementCount > 1 && orphanOrder.length === 1 && collection.length > 1;

    const shouldHealByOrder =
        collapsedKnownIds ||
        duplicateCollectionIds ||
        collapsedOrphans ||
        (orphanPlacementCount > 0 && resolvedCount === 0 && orphanOrder.length > 0);

    if (!shouldHealByOrder) {
        return false;
    }

    const sortedCollection = [...collection].sort((a, b) => {
        const ao = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
        const bo = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
        if (ao !== bo) return ao - bo;
        const ka = String(a.storagePath || a.id || '');
        const kb = String(b.storagePath || b.id || '');
        return ka.localeCompare(kb);
    });

    if (sortedCollection.length === 0) return false;

    let changed = false;
    const assignByIndex = (stored, index) => {
        const item = sortedCollection[Math.min(index, sortedCollection.length - 1)];
        if (!item?.id) return stored;
        const dataUrl = lightweightPlacementUrl(
            item.dataUrl ||
                (item.storagePath ? storageService.getPublicUrl(item.storagePath) : null),
            item.storagePath
        );
        const next = {
            collectionItemId: item.id,
            ...(item.storagePath ? { storagePath: item.storagePath } : {}),
            ...(dataUrl ? { dataUrl } : {}),
        };
        if (
            next.collectionItemId !== stored.collectionItemId ||
            next.storagePath !== stored.storagePath ||
            next.dataUrl !== stored.dataUrl
        ) {
            changed = true;
        }
        return next;
    };

    if (collapsedKnownIds || duplicateCollectionIds || collapsedOrphans) {
        placementKeys.forEach((key, index) => {
            const stored = localAlbum[key] ?? remotePages[key];
            const next = assignByIndex(stored, index);
            localAlbum[key] = next;
            if (remotePages[key] != null || remote) remotePages[key] = next;
        });
    } else {
        const idMap = new Map();
        orphanOrder.forEach((oldId, index) => {
            if (index >= sortedCollection.length) return;
            const target = sortedCollection[index];
            if (target?.id) idMap.set(oldId, target.id);
        });
        if (idMap.size === 0) return false;

        const remapStored = (stored) => {
            if (!stored || typeof stored !== 'object' || !stored.collectionItemId) return stored;
            const nextId = idMap.get(stored.collectionItemId);
            if (!nextId || nextId === stored.collectionItemId) return stored;
            changed = true;
            const item = collection.find((entry) => entry.id === nextId);
            return {
                collectionItemId: nextId,
                ...(item?.storagePath ? { storagePath: item.storagePath } : {}),
                ...(item?.dataUrl || item?.storagePath
                    ? {
                          dataUrl:
                              item.dataUrl ||
                              (item.storagePath
                                  ? storageService.getPublicUrl(item.storagePath)
                                  : null),
                      }
                    : {}),
            };
        };

        for (const key of keys) {
            if (localAlbum[key] != null) {
                localAlbum[key] = remapStored(localAlbum[key]);
            } else if (remotePages[key] != null) {
                localAlbum[key] = remapStored(remotePages[key]);
            }
            if (remotePages[key] != null) {
                remotePages[key] = remapStored(remotePages[key]);
            }
        }
    }

    if (!changed) return false;

    localAlbum.__revision = (localAlbum.__revision || 0) + 1;
    const all = readAll();
    all[albumId] = localAlbum;
    writeAll(all);

    if (remote) {
        hydrateAlbumPreviewData(albumId, {
            ...remote,
            pages: remotePages,
            revision: (remote.revision || 0) + 1,
        });
    }

    return true;
}

/** Embed storagePath/dataUrl onto id-only placements so sync survives an empty collection catalog. */
export function embedPlacementStorageFallbacks(albumId) {
    if (!albumId) return false;
    const collection = getAlbumCollection(albumId);
    if (!collection.length) return false;
    const byId = new Map();
    const idCounts = new Map();
    for (const item of collection) {
        if (!item?.id) continue;
        idCounts.set(item.id, (idCounts.get(item.id) || 0) + 1);
        if (!byId.has(item.id)) byId.set(item.id, item);
    }
    const byPath = new Map(
        collection.filter((item) => item?.storagePath).map((item) => [item.storagePath, item])
    );

    const all = readAll();
    const localAlbum = { ...(all[albumId] || {}) };
    const remote = getRemotePreviewData(albumId);
    const remotePages = remote?.pages ? { ...remote.pages } : {};
    const keys = new Set([
        ...Object.keys(localAlbum).filter((k) => k !== '__revision'),
        ...Object.keys(remotePages),
    ]);

    let changed = false;
    const enrich = (stored) => {
        if (!stored || typeof stored !== 'object' || !stored.collectionItemId) return stored;
        const idUnique = (idCounts.get(stored.collectionItemId) || 0) === 1;
        if (stored.storagePath && stored.dataUrl && idUnique) return stored;
        const item =
            (stored.storagePath && byPath.get(stored.storagePath)) ||
            (idUnique ? byId.get(stored.collectionItemId) : null);
        if (!item) return stored;
        const storagePath = item.storagePath || stored.storagePath || null;
        const dataUrl =
            item.dataUrl ||
            stored.dataUrl ||
            (storagePath ? storageService.getPublicUrl(storagePath) : null);
        if (
            storagePath === stored.storagePath &&
            dataUrl === stored.dataUrl &&
            item.id === stored.collectionItemId
        ) {
            return stored;
        }
        changed = true;
        return {
            collectionItemId: item.id || stored.collectionItemId,
            ...(storagePath ? { storagePath } : {}),
            ...(dataUrl ? { dataUrl } : {}),
        };
    };

    for (const key of keys) {
        if (localAlbum[key] != null) {
            localAlbum[key] = enrich(localAlbum[key]);
        } else if (remotePages[key] != null) {
            localAlbum[key] = enrich(remotePages[key]);
        }
        if (remotePages[key] != null) {
            remotePages[key] = enrich(remotePages[key]);
        }
    }

    if (!changed) return false;

    localAlbum.__revision = (localAlbum.__revision || 0) + 1;
    all[albumId] = localAlbum;
    writeAll(all);
    if (remote) {
        hydrateAlbumPreviewData(albumId, {
            ...remote,
            pages: remotePages,
            revision: (remote.revision || 0) + 1,
        });
    }
    return true;
}

/** First available image for album list cards (cover, collection, or placed pages). */
export function getAlbumListThumbnailUrl(albumId) {
    if (!albumId) return null;

    const coverSrc = resolveCoverImageSrc({ id: albumId }, { showSamples: false });
    if (coverSrc) return coverSrc;

    const collection = getAlbumCollection(albumId);
    if (collection[0]) {
        const url = getCollectionItemDisplayUrl(collection[0]);
        if (url) return url;
    }

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
    { clearSpreadForLeft, hasCovers, totalPages, spreadOpts } = {}
) {
    if (!albumId || pageNum == null || !collectionItemId) return false;
    // Page 2 is the disabled inside-cover left — only redirect when covers are known on.
    if (pageNum === 2 && hasCovers === true) {
        return setPagePhotoFromCollectionItem(albumId, 3, collectionItemId, {
            clearSpreadForLeft: clearSpreadForLeft ?? 2,
            hasCovers,
            totalPages,
            spreadOpts,
        });
    }
    // Pre-back right leaf is always disabled — place on the left page instead.
    if (totalPages != null) {
        const opts = { ...normalizeSpreadOpts(spreadOpts), totalPages, hasCovers: hasCovers ?? spreadOpts?.hasCovers };
        if (isPreBackHalfSpreadRightPage(pageNum, totalPages, opts)) {
            const info = getPreBackHalfSpreadInfo(totalPages, opts);
            if (info?.left != null && info.left !== pageNum) {
                return setPagePhotoFromCollectionItem(albumId, info.left, collectionItemId, {
                    clearSpreadForLeft: info.left,
                    hasCovers,
                    totalPages,
                    spreadOpts,
                });
            }
        }
    }
    const all = readAll();
    const album = { ...(all[albumId] || {}) };
    if (clearSpreadForLeft != null) {
        delete album[spreadStorageKey(clearSpreadForLeft)];
    }
    album[String(pageNum)] = placementFromCollectionItem(albumId, collectionItemId);
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

/** Remove a collection item from all page/spread slots except an optional cover spread. */
export function clearCollectionItemPlacements(albumId, collectionItemId, { keepSpreadLeft = null } = {}) {
    if (!albumId || !collectionItemId) return false;
    const all = readAll();
    const album = all[albumId];
    if (!album) return false;

    const keepSpreadKey =
        keepSpreadLeft != null ? spreadStorageKey(keepSpreadLeft) : null;
    const next = { ...album };
    let changed = false;

    for (const key of Object.keys(next)) {
        if (key === '__revision') continue;
        const stored = next[key];
        if (!stored || typeof stored !== 'object' || stored.collectionItemId !== collectionItemId) {
            continue;
        }
        if (keepSpreadKey && key === keepSpreadKey) continue;
        delete next[key];
        changed = true;
    }

    if (!changed) return false;
    next.__revision = (next.__revision || 0) + 1;
    all[albumId] = next;
    return writeAll(all);
}

/** Storage keys removed when deleting one spread (left page + count pages). */
export function deletedSpreadStorageKeys(removeAt, count) {
    const start = Number(removeAt);
    const end = start + count;
    if (!Number.isFinite(start) || count <= 0) return new Set();

    const keys = new Set([spreadStorageKey(start)]);
    for (let page = start; page < end; page += 1) {
        keys.add(String(page));
    }
    return keys;
}

function collectionItemOnlyOnDeletedSpreadKeys(albumId, itemId, deleteKeys) {
    if (!albumId || !itemId || !deleteKeys?.size) return false;

    const allKeys = new Set();
    const album = readAll()[albumId];
    if (album) {
        for (const key of Object.keys(album)) {
            if (key !== '__revision') allKeys.add(key);
        }
    }
    const remote = getRemotePreviewData(albumId);
    if (remote?.pages) {
        for (const key of Object.keys(remote.pages)) allKeys.add(key);
    }

    let foundOnDeleteKey = false;
    for (const key of allKeys) {
        const stored = getStoredPlacement(albumId, key);
        if (!stored || typeof stored !== 'object' || stored.collectionItemId !== itemId) continue;
        if (deleteKeys.has(key)) {
            foundOnDeleteKey = true;
        } else {
            return false;
        }
    }
    return foundOnDeleteKey;
}

/** Collection item ids on page/spread keys removed by deleting one spread. */
export function collectCollectionItemIdsOnDeletedSpread(albumId, removeAt, count) {
    if (!albumId || count <= 0) return [];
    const deleteKeys = deletedSpreadStorageKeys(removeAt, count);

    const ids = new Set();
    for (const key of deleteKeys) {
        const stored = getStoredPlacement(albumId, key);
        const itemId = stored?.collectionItemId;
        if (itemId) ids.add(itemId);
    }

    return [...ids];
}

/** Drop collection sidebar entries for photos on a spread that is being deleted. */
export function removeCollectionItemsOnDeletedSpread(albumId, removeAt, count) {
    const deleteKeys = deletedSpreadStorageKeys(removeAt, count);
    const itemIds = collectCollectionItemIdsOnDeletedSpread(albumId, removeAt, count).filter(
        (itemId) => collectionItemOnlyOnDeletedSpreadKeys(albumId, itemId, deleteKeys)
    );
    if (!itemIds.length) return [];

    for (const itemId of itemIds) {
        removeCollectionItem(albumId, itemId);
    }

    const remote = getRemotePreviewData(albumId);
    if (remote?.collection?.length) {
        const drop = new Set(itemIds);
        const nextCollection = remote.collection.filter((item) => !drop.has(item.id));
        if (nextCollection.length !== remote.collection.length) {
            hydrateAlbumPreviewData(albumId, {
                ...remote,
                collection: nextCollection,
                revision: (remote.revision || 0) + 1,
            });
        }
    }

    return itemIds;
}

/** Remove all placed photos from album pages (collection is unchanged). */
function remapPageStoredValue(stored, idMap, albumId = null) {
    if (stored == null) return stored;
    if (typeof stored === 'string') return stored;
    if (typeof stored === 'object' && stored.collectionItemId) {
        const newId = idMap.get(stored.collectionItemId) || stored.collectionItemId;
        if (albumId) {
            const placement = placementFromCollectionItem(albumId, newId);
            if (placement) {
                return {
                    ...placement,
                    ...(stored.storagePath && !placement.storagePath
                        ? { storagePath: stored.storagePath }
                        : {}),
                    ...(stored.dataUrl && !placement.dataUrl ? { dataUrl: stored.dataUrl } : {}),
                };
            }
        }
        return {
            collectionItemId: newId,
            ...(stored.storagePath ? { storagePath: stored.storagePath } : {}),
            ...(stored.dataUrl ? { dataUrl: stored.dataUrl } : {}),
        };
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
        target[key] = remapPageStoredValue(stored, idMap, targetAlbumId);
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

function buildHistoryPlacement({ collectionItemId = null, storagePath = null, dataUrl = null } = {}) {
    if (!collectionItemId && !storagePath && !dataUrl) return null;
    const placement = {};
    if (collectionItemId) placement.collectionItemId = collectionItemId;
    if (storagePath) placement.storagePath = storagePath;
    if (dataUrl?.startsWith('data:')) {
        placement.dataUrl = dataUrl;
    } else if (!storagePath && dataUrl) {
        placement.dataUrl = dataUrl;
    }
    return Object.keys(placement).length ? placement : null;
}

function writeSpreadPlacementValue(
    albumId,
    leftPage,
    rightPage,
    placement,
    { totalPages, spreadOpts } = {}
) {
    if (!albumId || leftPage == null || !placement) return false;
    const opts = { ...normalizeSpreadOpts(spreadOpts), totalPages };
    if (totalPages != null && isInsideCoverSpreadLeft(leftPage, totalPages, opts)) {
        return writePagePlacementValue(albumId, 3, placement, { clearSpreadForLeft: leftPage });
    }
    if (totalPages != null && isPreBackHalfSpreadLeftPage(leftPage, totalPages, opts)) {
        return writePagePlacementValue(albumId, leftPage, placement, { clearSpreadForLeft: leftPage });
    }
    if (
        totalPages != null &&
        isEndHalfSpreadLeftPage(leftPage, totalPages, opts) &&
        !isWholeSpreadLayout(spreadOpts?.gridLayout)
    ) {
        return writePagePlacementValue(albumId, leftPage, placement, { clearSpreadForLeft: leftPage });
    }

    const all = readAll();
    const album = { ...(all[albumId] || {}) };
    album[spreadStorageKey(leftPage)] = placement;
    delete album[String(leftPage)];
    if (rightPage != null) delete album[String(rightPage)];
    album.__revision = (album.__revision || 0) + 1;
    all[albumId] = album;
    const wrote = writeAll(all);

    const remote = getRemotePreviewData(albumId);
    if (remote?.pages) {
        const pages = { ...remote.pages };
        pages[spreadStorageKey(leftPage)] = placement;
        delete pages[String(leftPage)];
        if (rightPage != null) delete pages[String(rightPage)];
        hydrateAlbumPreviewData(albumId, {
            ...remote,
            pages,
            revision: (remote.revision || 0) + 1,
        });
    }

    return wrote;
}

function writePagePlacementValue(albumId, pageNum, placement, { clearSpreadForLeft } = {}) {
    if (!albumId || pageNum == null || !placement) return false;
    const all = readAll();
    const album = { ...(all[albumId] || {}) };
    if (clearSpreadForLeft != null) {
        delete album[spreadStorageKey(clearSpreadForLeft)];
    }
    album[String(pageNum)] = placement;
    album.__revision = (album.__revision || 0) + 1;
    all[albumId] = album;
    return writeAll(all);
}

/** Restore a spread slot from frozen version-history snapshot fields. */
export function restoreSlotPhotoFromHistory(
    albumId,
    slot,
    snapshot,
    { album = null, totalPages = 0, spreadOpts = null } = {}
) {
    const placement = buildHistoryPlacement(snapshot);
    if (!albumId || !slot || !placement) return false;

    const opts = { ...normalizeSpreadOpts(spreadOpts), totalPages };
    const left = slot.spreadLeft ?? slot.pageNum;
    const right = Math.min(left + 1, Math.max(0, (totalPages || 1) - 1));

    if (slot.pageNum === 0) {
        return writeSpreadPlacementValue(albumId, 0, right, placement, {
            totalPages,
            spreadOpts: opts,
        });
    }

    if (slot.whole) {
        return writeSpreadPlacementValue(albumId, left, right, placement, {
            totalPages,
            spreadOpts: opts,
        });
    }

    return writePagePlacementValue(albumId, slot.pageNum, placement, {
        clearSpreadForLeft: left,
    });
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
    if (totalPages != null && isPreBackHalfSpreadLeftPage(leftPage, totalPages, opts)) {
        return setPagePhotoFromDataUrl(albumId, leftPage, dataUrl, { clearSpreadForLeft: leftPage });
    }
    if (totalPages != null && isInsideCoverSpreadLeft(leftPage, totalPages, opts)) {
        return setPagePhotoFromDataUrl(albumId, 3, dataUrl, { clearSpreadForLeft: leftPage });
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
    // Inside-cover spread cannot hold a panoramic — place on page 3 (right) only.
    if (totalPages != null && isInsideCoverSpreadLeft(leftPage, totalPages, opts)) {
        return setPagePhotoFromCollectionItem(albumId, 3, collectionItemId, {
            clearSpreadForLeft: leftPage,
            hasCovers: true,
            totalPages,
            spreadOpts,
        });
    }
    // Pre-back spread: left photo only — never a panoramic across the disabled right.
    if (totalPages != null && isPreBackHalfSpreadLeftPage(leftPage, totalPages, opts)) {
        return setPagePhotoFromCollectionItem(albumId, leftPage, collectionItemId, {
            clearSpreadForLeft: leftPage,
            hasCovers: opts.hasCovers,
            totalPages,
            spreadOpts,
        });
    }
    if (
        totalPages != null &&
        isEndHalfSpreadLeftPage(leftPage, totalPages, opts) &&
        !isWholeSpreadLayout(spreadOpts?.gridLayout)
    ) {
        return setPagePhotoFromCollectionItem(albumId, leftPage, collectionItemId, {
            clearSpreadForLeft: leftPage,
            totalPages,
            spreadOpts,
        });
    }
    const all = readAll();
    const album = { ...(all[albumId] || {}) };
    // Prefer live collectionItemId for replaces; keep storagePath as durable fallback.
    const placement = placementFromCollectionItem(albumId, collectionItemId);
    album[spreadStorageKey(leftPage)] = placement;
    delete album[String(leftPage)];
    if (rightPage != null) delete album[String(rightPage)];
    album.__revision = (album.__revision || 0) + 1;
    all[albumId] = album;
    const wrote = writeAll(all);

    // Keep remote preview cache in sync so hydrate/merge cannot resurrect an old dataUrl.
    const remote = getRemotePreviewData(albumId);
    if (remote?.pages) {
        const pages = { ...remote.pages };
        pages[spreadStorageKey(leftPage)] = placement;
        delete pages[String(leftPage)];
        if (rightPage != null) delete pages[String(rightPage)];
        hydrateAlbumPreviewData(albumId, {
            ...remote,
            pages,
            revision: (remote.revision || 0) + 1,
        });
    }

    return wrote;
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
        ? itemIds
              .map((id) => getCollectionItem(albumId, id))
              .filter((item) => item?.id)
        : getAlbumCollection(albumId);
    const includeCovers = album?.has_covers === true;
    const blankCovers = albumHasBlankCovers(album);
    const coverWrapItem = blankCovers ? items.find(isCoverWrapCollectionItem) : null;
    const placementItems = blankCovers
        ? items.filter((item) => !isCoverWrapCollectionItem(item))
        : items;
    const spreadOpts = getAlbumSpreadOptions(
        { ...album, has_covers: includeCovers },
        { collectionCount: placementItems.length }
    );
    if (!placementItems.length && !coverWrapItem) return 0;

    const gridLayout = album.grid_layout || 'two-page';
    const wholeSpread = isWholeSpreadLayout(gridLayout);
    const requiredPages = computePageCountFromPhotoCount(placementItems.length, {
        includeCovers,
        blankCovers,
        gridLayout,
    });
    const totalPages = Math.max(album.page_count ?? 21, requiredPages);

    clearAllAlbumPagePhotos(albumId, { totalPages });

    const pageGridSize = album.grid_size || 'square';
    const photoFillsWhole =
        wholeSpread && blankCovers
            ? await resolvePhotoFillsWholeFlags(placementItems, pageGridSize)
            : null;

    let placed = autoPlaceCollectionItems(
        albumId,
        placementItems.map((item) => item.id),
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

    if (coverWrapItem) {
        const right = Math.min(1, totalPages - 1);
        if (
            setSpreadPhotoFromCollectionItem(albumId, 0, coverWrapItem.id, right, {
                totalPages,
                spreadOpts,
            })
        ) {
            placed += 1;
        }
        syncCoverWrapRoleFromSpread(albumId, album);
    }

    if (spreadOpts.hasCovers && albumUsesBookWrap(album)) {
        migrateFrontCoverToFullSpread(albumId);
        migrateBackCoverUsesBookWrap(albumId, totalPages, album);
        migrateEndHalfSpreadToLeftPage(albumId, totalPages, album);
        migratePreBackHalfSpreadToLeftPage(albumId, totalPages, album);
        syncCoverWrapRoleFromSpread(albumId, album);
    } else if (wholeSpread) {
        migrateWholeSpreadPagePhotosToSpreadKeys(albumId, totalPages, album);
        migratePreBackHalfSpreadToLeftPage(albumId, totalPages, album);
    } else if (spreadOpts.hasCovers) {
        migratePreBackHalfSpreadToLeftPage(albumId, totalPages, album);
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
                    hasCovers: useCovers,
                    totalPages,
                    spreadOpts,
                })
            ) {
                placed += 1;
            }
        }
        migratePreBackHalfSpreadToLeftPage(albumId, totalPages, {
            has_covers: useCovers,
            blank_covers: blankCovers,
            page_count: totalPages,
            grid_layout: gridLayout,
        });
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
                    hasCovers: useCovers,
                    totalPages,
                    spreadOpts,
                })
            ) {
                placed += 1;
            }
        }
        migratePreBackHalfSpreadToLeftPage(albumId, totalPages, {
            has_covers: useCovers,
            blank_covers: false,
            page_count: totalPages,
            grid_layout: gridLayout,
        });
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

function spreadTransformStorageKey(leftPage) {
    return `spread:${leftPage}`;
}

function captureOverviewSpreadContent(photoAlbum, transformAlbum, spreadIndex, totalPages, spreadOpts) {
    const { left, right } = getSpreadPages(spreadIndex, totalPages, spreadOpts);
    const spreadKey = spreadStorageKey(left);
    const transformSpreadKey = spreadTransformStorageKey(left);

    return {
        spread: photoAlbum[spreadKey] ?? null,
        spreadTransform: transformAlbum[transformSpreadKey] ?? null,
        leftPagePhoto: photoAlbum[String(left)] ?? null,
        rightPagePhoto: right !== left ? photoAlbum[String(right)] ?? null : null,
        leftPageTransform: transformAlbum[String(left)] ?? null,
        rightPageTransform:
            right !== left ? transformAlbum[String(right)] ?? null : null,
    };
}

function clearOverviewSpreadSlot(photoAlbum, transformAlbum, spreadIndex, totalPages, spreadOpts) {
    const { left, right } = getSpreadPages(spreadIndex, totalPages, spreadOpts);
    const spreadKey = spreadStorageKey(left);
    const transformSpreadKey = spreadTransformStorageKey(left);

    delete photoAlbum[spreadKey];
    delete transformAlbum[transformSpreadKey];
    delete photoAlbum[String(left)];
    delete transformAlbum[String(left)];
    if (right !== left) {
        delete photoAlbum[String(right)];
        delete transformAlbum[String(right)];
    }
}

function applyOverviewSpreadContent(
    photoAlbum,
    transformAlbum,
    spreadIndex,
    content,
    totalPages,
    spreadOpts
) {
    clearOverviewSpreadSlot(photoAlbum, transformAlbum, spreadIndex, totalPages, spreadOpts);
    if (!content) return;

    const { left, right } = getSpreadPages(spreadIndex, totalPages, spreadOpts);
    const spreadKey = spreadStorageKey(left);
    const transformSpreadKey = spreadTransformStorageKey(left);

    if (content.spread != null) photoAlbum[spreadKey] = content.spread;
    if (content.spreadTransform != null) transformAlbum[transformSpreadKey] = content.spreadTransform;
    if (content.leftPagePhoto != null) photoAlbum[String(left)] = content.leftPagePhoto;
    if (content.rightPagePhoto != null && right !== left) {
        photoAlbum[String(right)] = content.rightPagePhoto;
    }
    if (content.leftPageTransform != null) transformAlbum[String(left)] = content.leftPageTransform;
    if (content.rightPageTransform != null && right !== left) {
        transformAlbum[String(right)] = content.rightPageTransform;
    }
}

/** Drag-reorder inner spreads in page overview (photos + pan/zoom). */
export function reorderOverviewSpreads(
    albumId,
    fromSpreadIndex,
    toSpreadIndex,
    { totalPages, spreadOpts } = {}
) {
    if (!albumId || fromSpreadIndex === toSpreadIndex) return false;

    const opts = spreadOpts ?? { showCover: true, hasCovers: true, blankCovers: false };
    const plan = buildOverviewSpreadReorderPlan(
        fromSpreadIndex,
        toSpreadIndex,
        totalPages,
        opts
    );
    if (!plan) return false;

    const { draggable, newOrder } = plan;

    const photoAll = readAll();
    const photoAlbum = { ...(photoAll[albumId] || {}) };
    const transformAlbum = readAlbumTransformBucket(albumId);

    const snapshots = Object.fromEntries(
        draggable.map((spreadIndex) => [
            spreadIndex,
            captureOverviewSpreadContent(
                photoAlbum,
                transformAlbum,
                spreadIndex,
                totalPages,
                opts
            ),
        ])
    );

    for (const spreadIndex of draggable) {
        clearOverviewSpreadSlot(photoAlbum, transformAlbum, spreadIndex, totalPages, opts);
    }

    for (let i = 0; i < draggable.length; i += 1) {
        applyOverviewSpreadContent(
            photoAlbum,
            transformAlbum,
            draggable[i],
            snapshots[newOrder[i]],
            totalPages,
            opts
        );
    }

    photoAlbum.__revision = (photoAlbum.__revision || 0) + 1;
    transformAlbum.__revision = (transformAlbum.__revision || 0) + 1;
    photoAll[albumId] = photoAlbum;
    writeAll(photoAll);
    writeAlbumTransformBucket(albumId, transformAlbum);
    reorderOverviewSpreadMetadata(albumId, fromSpreadIndex, toSpreadIndex, {
        totalPages,
        spreadOpts: opts,
    });
    return true;
}
