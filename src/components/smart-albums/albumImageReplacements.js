import { getCollectionItem, getCollectionItemDisplayUrl } from './albumCollection';
import { storageService } from '../../services/storage.service';
import {
    getGridSlotPhoto,
    resolveSlotCollectionItemId,
} from './albumPagePhotos';
import { getRemotePreviewData, patchRemotePreviewImageReplacements } from './albumPreviewData';
import { getSpreadLeftPageIndex } from './albumSpreadGrid';
import { getSpreadContext, pageToSpreadIndex } from './albumSpreadUtils';
import { getSlotLabel, makeSlotKey, parseSlotKey } from './albumSwapMarks';
import {
    remapPageForSpreadMove,
    remapSpreadIndexAfterOverviewReorder,
} from './albumSpreadReorder';

import {
    ALBUM_REPLACEMENTS_KEY,
    readLocalStorageJson,
    writeLocalStorageJson,
} from '../../lib/albumLocalStorage';

const STORAGE_KEY = ALBUM_REPLACEMENTS_KEY;
const REVIEW_SNAPSHOT_MAX_WIDTH = 960;
const REVIEW_SNAPSHOT_JPEG_QUALITY = 0.82;

export const IMAGE_REPLACEMENTS_CHANGED_EVENT = 'pixnxt-album-image-replacements-changed';

/** Survives localStorage quota failures so version UI still updates after New version. */
const MEMORY_REPLACEMENTS = new Map();

function normalizeReplacementBucket(bucket) {
    if (Array.isArray(bucket)) return bucket.filter(Boolean);
    if (bucket && typeof bucket === 'object') {
        return Object.values(bucket).filter(
            (row) => row && typeof row === 'object' && (row.id || row.newUrl || row.previousUrl)
        );
    }
    return [];
}

function readAll() {
    return readLocalStorageJson(STORAGE_KEY, {});
}

function writeAll(data, preferAlbumId = null) {
    const ok = writeLocalStorageJson(STORAGE_KEY, data, { preferAlbumId, compact: true });
    if (!ok) console.warn('Could not save image replacements');
    return ok;
}

function notify(albumId) {
    try {
        window.dispatchEvent(
            new CustomEvent(IMAGE_REPLACEMENTS_CHANGED_EVENT, { detail: { albumId } })
        );
    } catch {
        /* ignore */
    }
}

function resolveItemUrl(albumId, itemId) {
    if (!itemId) return null;
    const item = getCollectionItem(albumId, itemId);
    return getCollectionItemDisplayUrl(item);
}

function rasterizeImageToDataUrl(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const scale = Math.min(
                    1,
                    REVIEW_SNAPSHOT_MAX_WIDTH / Math.max(img.naturalWidth, 1)
                );
                const width = Math.max(1, Math.round(img.naturalWidth * scale));
                const height = Math.max(1, Math.round(img.naturalHeight * scale));
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas unavailable'));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', REVIEW_SNAPSHOT_JPEG_QUALITY));
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = src;
    });
}

/** Persist a durable preview URL before the source file is replaced or deleted. */
export async function snapshotImageUrlForReview(url) {
    if (!url || typeof url !== 'string') return null;
    if (url.startsWith('data:')) return url;
    try {
        const response = await fetch(url);
        if (!response.ok) return url;
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        try {
            const dataUrl = await rasterizeImageToDataUrl(objectUrl);
            return dataUrl || url;
        } finally {
            URL.revokeObjectURL(objectUrl);
        }
    } catch {
        try {
            return await rasterizeImageToDataUrl(url);
        } catch {
            return url;
        }
    }
}

export function resolveReplacementPreviewUrl(albumId, url, storagePath = null) {
    void albumId;
    if (url?.startsWith('data:')) return url;
    if (storagePath) return storageService.getPublicUrl(storagePath);
    if (url) return url;
    return null;
}

function getSlotImageUrl(albumId, slot, album, totalPages, itemId = null) {
    const spreadOpts = getSpreadContext(album, totalPages);
    const resolvedItemId =
        itemId ??
        resolveSlotCollectionItemId(albumId, slot, { totalPages, spreadOpts, album });
    const fromItem = resolveItemUrl(albumId, resolvedItemId);
    if (fromItem) return fromItem;

    if (!slot) return null;
    const spreadLeft =
        slot.spreadLeft ??
        getSpreadLeftPageIndex(slot.pageNum, { ...spreadOpts, totalPages });
    const photo = getGridSlotPhoto(
        albumId,
        slot.pageNum,
        slot.cellId ?? 0,
        spreadLeft,
        totalPages,
        {
            wholeSpread: Boolean(slot.whole),
            spreadOpts,
            album,
        }
    );
    return photo?.src ?? null;
}

function nextReplacementVersion(bucket, spreadIndex) {
    if (spreadIndex == null) return 1;
    let maxVersion = 0;
    for (const row of bucket) {
        if (row.spreadIndex !== spreadIndex) continue;
        const version = Number(row.version);
        if (Number.isFinite(version) && version > maxVersion) {
            maxVersion = version;
        }
    }
    return maxVersion + 1;
}

export function getReplacementVersion(replacement) {
    const version = Number(replacement?.version);
    return Number.isFinite(version) && version > 0 ? version : 1;
}

export function getReplacementCurrentVersion(replacement) {
    return getReplacementVersion(replacement) + 1;
}

export function formatImageReplacementLabel(replacement) {
    return `Version ${getReplacementVersion(replacement)}`;
}

/** Replacements on one spread, oldest upload first. */
export function sortSpreadReplacements(replacements) {
    if (!replacements?.length) return [];
    return [...replacements].sort((a, b) => {
        const versionDelta = getReplacementVersion(a) - getReplacementVersion(b);
        if (versionDelta !== 0) return versionDelta;
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    });
}

export function pickLatestSpreadReplacements(replacements, spreadIndex) {
    if (spreadIndex == null || !replacements?.length) return [];
    const onSpread = replacements.filter((row) => row.spreadIndex === spreadIndex);
    if (!onSpread.length) return [];
    const latest = onSpread.reduce((best, row) => {
        if (!best) return row;
        const rowVersion = getReplacementVersion(row);
        const bestVersion = getReplacementVersion(best);
        if (rowVersion !== bestVersion) {
            return rowVersion > bestVersion ? row : best;
        }
        return new Date(row.createdAt || 0).getTime() >= new Date(best.createdAt || 0).getTime()
            ? row
            : best;
    }, null);
    return latest ? [latest] : [];
}

function buildReplacementRecord(
    albumId,
    slot,
    newItemId,
    {
        album,
        totalPages,
        previousItemId,
        previousUrl,
        previousStoragePath = null,
        force = false,
        spreadIndex: spreadIndexOverride = null,
    }
) {
    const spreadOpts = getSpreadContext(album, totalPages);
    const prevId = previousItemId || null;
    const newItem = getCollectionItem(albumId, newItemId);
    // Never read the live collection item for "before" fields — in-place replace already
    // updated that row to the new file by the time we record history.
    const prevStoragePath = previousStoragePath || null;
    const prevUrl =
        previousUrl ||
        (prevStoragePath ? storageService.getPublicUrl(prevStoragePath) : null) ||
        null;
    const newUrl =
        (newItem ? getCollectionItemDisplayUrl(newItem) : null) ?? resolveItemUrl(albumId, newItemId);
    const newStoragePath = newItem?.storagePath ?? null;

    if (!newUrl) return null;
    if (!force && !prevUrl && !prevStoragePath && !prevId) return null;

    // Skip only when the file truly did not change (never skip an explicit New version).
    const stripCache = (url) => (typeof url === 'string' ? url.split('?')[0] : url);
    const samePath =
        Boolean(prevStoragePath && newStoragePath && prevStoragePath === newStoragePath);
    const sameUrl = Boolean(
        prevUrl && newUrl && stripCache(prevUrl) === stripCache(newUrl)
    );
    if (!force) {
        if (samePath && sameUrl) return null;
        if (!prevStoragePath && !prevId && sameUrl) return null;
    }

    const resolvedPrevUrl =
        prevUrl ||
        (prevStoragePath ? storageService.getPublicUrl(prevStoragePath) : null) ||
        // Explicit New version with no prior URL still needs a history thumb — use new as
        // placeholder so the row persists (matches Spread 05 history UX).
        (force ? newUrl : null);
    if (!resolvedPrevUrl && !prevId && !force) return null;

    const spreadLeft =
        slot.spreadLeft ??
        getSpreadLeftPageIndex(slot.pageNum, { ...spreadOpts, totalPages });
    const whole =
        Boolean(slot.whole) ||
        (album?.grid_layout === 'whole-spread' && slot.pageNum > 0);
    const slotLabel =
        slot.label ||
        getSlotLabel(slot.pageNum, slot.cellId ?? 0, whole, totalPages, album);
    const spreadIndex =
        spreadIndexOverride != null && Number.isFinite(Number(spreadIndexOverride))
            ? Number(spreadIndexOverride)
            : pageToSpreadIndex(spreadLeft, { ...spreadOpts, totalPages });

    return {
        id: `repl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        slotKey: makeSlotKey(slot.pageNum, slot.cellId ?? 0),
        slotLabel,
        note: whole
            ? 'Uploaded a new version'
            : slotLabel
              ? `Updated ${String(slotLabel).replace(/^Spread\s+\d+\s·\s/i, '').toLowerCase()} frame`
              : 'Uploaded a new version',
        spreadIndex,
        pageNum: slot.pageNum,
        cellId: slot.cellId ?? 0,
        whole,
        previousItemId: prevId,
        previousStoragePath: prevStoragePath,
        previousUrl: resolvedPrevUrl || prevUrl || null,
        newItemId,
        newUrl,
        createdAt: new Date().toISOString(),
    };
}

/** Snapshot slot image before a placement overwrites it (for review-summary tracking). */
export function captureSlotImageBeforeReplace(albumId, slot, album, totalPages) {
    if (!albumId || !slot) return null;
    const spreadOpts = getSpreadContext(album, totalPages);
    const previousItemId = resolveSlotCollectionItemId(albumId, slot, {
        totalPages,
        spreadOpts,
        album,
    });
    const previousItem = previousItemId ? getCollectionItem(albumId, previousItemId) : null;
    const previousStoragePath = previousItem?.storagePath ?? null;
    const previousUrl =
        (previousStoragePath ? storageService.getPublicUrl(previousStoragePath) : null) ||
        getCollectionItemDisplayUrl(previousItem) ||
        getSlotImageUrl(albumId, slot, album, totalPages, previousItemId) ||
        null;
    if (!previousItemId && !previousUrl && !previousStoragePath) return null;
    return {
        previousItemId: previousItemId || null,
        previousStoragePath: previousStoragePath || null,
        previousUrl,
    };
}

/** Keep the live URL — do not embed base64 snapshots (they exhaust localStorage quota). */
export async function captureSlotImageBeforeReplaceAsync(albumId, slot, album, totalPages) {
    return captureSlotImageBeforeReplace(albumId, slot, album, totalPages);
}

function backfillReplacementVersions(rows) {
    if (!rows?.length) return [];
    const bySpread = new Map();
    const chronological = [...rows].sort(
        (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );
    const versionById = new Map();
    for (const row of chronological) {
        const spread = row.spreadIndex ?? 0;
        let version = Number(row.version);
        if (!Number.isFinite(version) || version <= 0) {
            version = (bySpread.get(spread) || 0) + 1;
        }
        bySpread.set(spread, Math.max(bySpread.get(spread) || 0, version));
        versionById.set(row.id, version);
    }
    return rows.map((row) => ({
        ...row,
        version: versionById.get(row.id) ?? row.version ?? 1,
    }));
}

export function getImageReplacements(albumId) {
    if (!albumId) return [];
    const memory = normalizeReplacementBucket(MEMORY_REPLACEMENTS.get(albumId));
    const local = normalizeReplacementBucket(readAll()[albumId]);
    const remote = normalizeReplacementBucket(
        getRemotePreviewData(albumId)?.image_replacements
    );

    // Prefer the richest source (memory survives quota failures; local is durable).
    let rows = local;
    if (memory.length >= rows.length) rows = memory;
    if (!rows.length && remote.length) rows = remote;

    return backfillReplacementVersions(rows).sort(
        (a, b) =>
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
}

export function addImageReplacement(albumId, record) {
    if (!albumId || !record) return null;
    const all = readAll();
    const bucket = [
        ...normalizeReplacementBucket(all[albumId]),
        ...normalizeReplacementBucket(MEMORY_REPLACEMENTS.get(albumId)).filter(
            (row) =>
                !normalizeReplacementBucket(all[albumId]).some((existing) => existing.id === row.id)
        ),
    ];
    // Deduplicate by id while merging memory + local
    const byId = new Map();
    for (const row of bucket) {
        if (row?.id) byId.set(row.id, row);
    }
    const merged = [...byId.values()];

    const duplicate = merged.find(
        (row) =>
            row.slotKey === record.slotKey &&
            row.previousUrl === record.previousUrl &&
            row.newUrl === record.newUrl
    );
    if (duplicate) {
        MEMORY_REPLACEMENTS.set(albumId, merged);
        return duplicate;
    }

    const entry = {
        ...record,
        spreadIndex: Number(record.spreadIndex),
        version: nextReplacementVersion(merged, Number(record.spreadIndex)),
    };
    merged.push(entry);
    all[albumId] = merged;
    MEMORY_REPLACEMENTS.set(albumId, merged);
    const wrote = writeAll(all, albumId);
    if (!wrote) {
        console.warn('Image replacement not persisted (storage full) — keeping in memory');
    }
    patchRemotePreviewImageReplacements(albumId, merged);
    notify(albumId);
    return entry;
}

/** Record a spread photo replacement when a slot already had an image. */
export function trackSpreadImageReplacement(
    albumId,
    slot,
    newItemId,
    {
        album = null,
        totalPages = 0,
        previousItemId = null,
        previousUrl = null,
        previousStoragePath = null,
        force = false,
        spreadIndex = null,
    } = {}
) {
    if (!albumId || !slot || !newItemId) return null;
    const spreadOpts = getSpreadContext(album, totalPages);
    const prevId =
        previousItemId != null
            ? previousItemId
            : resolveSlotCollectionItemId(albumId, slot, { totalPages, spreadOpts, album });
    // Never re-read the live collection item for the "before" URL — in-place replace
    // already updated that item to the new file by the time we track.
    const prevStoragePath = previousStoragePath || null;
    const prevUrl =
        previousUrl ||
        (prevStoragePath ? storageService.getPublicUrl(prevStoragePath) : null) ||
        null;
    if (!force && !prevId && !prevUrl && !prevStoragePath) return null;

    const record = buildReplacementRecord(albumId, slot, newItemId, {
        album,
        totalPages,
        previousItemId: prevId,
        previousUrl: prevUrl,
        previousStoragePath: prevStoragePath,
        force,
        spreadIndex,
    });
    if (!record) return null;
    return addImageReplacement(albumId, record);
}

export function removeImageReplacement(albumId, replacementId) {
    if (!albumId || !replacementId) return false;
    const all = readAll();
    const fromLocal = normalizeReplacementBucket(all[albumId]);
    const fromMemory = normalizeReplacementBucket(MEMORY_REPLACEMENTS.get(albumId));
    const byId = new Map();
    for (const row of [...fromLocal, ...fromMemory]) {
        if (row?.id) byId.set(row.id, row);
    }
    let bucket = [...byId.values()];
    if (!bucket.length) {
        const remote = getRemotePreviewData(albumId)?.image_replacements;
        bucket = normalizeReplacementBucket(remote);
    }
    if (!bucket.length) return false;
    const next = bucket.filter((row) => row.id !== replacementId);
    if (next.length === bucket.length) return false;
    all[albumId] = next;
    MEMORY_REPLACEMENTS.set(albumId, next);
    writeAll(all, albumId);
    patchRemotePreviewImageReplacements(albumId, next);
    notify(albumId);
    return true;
}

export function serializeImageReplacementsForSnapshot(albumId) {
    return getImageReplacements(albumId).map((row) => ({
        id: row.id,
        slotKey: row.slotKey,
        slotLabel: row.slotLabel,
        spreadIndex: row.spreadIndex,
        pageNum: row.pageNum,
        cellId: row.cellId,
        whole: Boolean(row.whole),
        previousItemId: row.previousItemId ?? null,
        previousStoragePath: row.previousStoragePath ?? null,
        previousUrl: row.previousUrl,
        newItemId: row.newItemId,
        newUrl: row.newUrl,
        version: row.version ?? null,
        createdAt: row.createdAt,
    }));
}

/** Move image-version history when overview spreads are drag-reordered. */
export function reorderImageReplacementsForOverview(
    albumId,
    draggable,
    newOrder,
    totalPages,
    spreadOpts
) {
    if (!albumId || !draggable?.length) return false;

    const all = readAll();
    const bucket = all[albumId];
    if (!Array.isArray(bucket) || !bucket.length) return false;

    let changed = false;
    const next = bucket.map((row) => {
        const spreadIndex = row.spreadIndex;
        if (spreadIndex == null || !draggable.includes(spreadIndex)) return row;

        const newSpreadIndex = remapSpreadIndexAfterOverviewReorder(
            spreadIndex,
            draggable,
            newOrder
        );
        if (newSpreadIndex === spreadIndex && row.pageNum == null && !row.slotKey) {
            return row;
        }

        changed = true;
        const updated = { ...row, spreadIndex: newSpreadIndex };
        if (row.pageNum != null) {
            updated.pageNum = remapPageForSpreadMove(
                row.pageNum,
                spreadIndex,
                newSpreadIndex,
                totalPages,
                spreadOpts
            );
        }
        if (row.slotKey) {
            const { pageNum, cellId } = parseSlotKey(row.slotKey);
            const remappedPage = remapPageForSpreadMove(
                pageNum,
                spreadIndex,
                newSpreadIndex,
                totalPages,
                spreadOpts
            );
            updated.slotKey = makeSlotKey(remappedPage, cellId);
            if (updated.pageNum == null) updated.pageNum = remappedPage;
        }
        return updated;
    });

    if (!changed) return false;

    all[albumId] = next;
    writeAll(all, albumId);
    patchRemotePreviewImageReplacements(albumId, next);
    notify(albumId);
    return true;
}
