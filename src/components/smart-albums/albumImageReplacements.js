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
import { ALBUM_REPLACEMENTS_KEY, readLocalStorageJson } from '../../lib/albumLocalStorage';

const REVIEW_SNAPSHOT_MAX_WIDTH = 960;
const REVIEW_SNAPSHOT_JPEG_QUALITY = 0.82;

export const IMAGE_REPLACEMENTS_CHANGED_EVENT = 'pixnxt-album-image-replacements-changed';

/** Working copy until preview_data is hydrated / DB write completes. */
const MEMORY_REPLACEMENTS = new Map();

/** Set from AlbumEditor so version history can write to Supabase. */
let persistPhotographerId = null;
const migratedFromLocal = new Set();

/**
 * Bind the signed-in photographer so image_replacements persist to
 * album_proofer_albums.preview_data (not localStorage).
 */
export function configureImageReplacementsPersistence(photographerId) {
    persistPhotographerId = photographerId || null;
}

function normalizeReplacementBucket(bucket) {
    if (Array.isArray(bucket)) return bucket.filter(Boolean);
    if (bucket && typeof bucket === 'object') {
        return Object.values(bucket).filter(
            (row) => row && typeof row === 'object' && (row.id || row.newUrl || row.previousUrl)
        );
    }
    return [];
}

/** One-time lift of legacy localStorage rows into memory (then local key is cleared). */
function migrateLegacyLocalReplacements(albumId) {
    if (!albumId || migratedFromLocal.has(albumId)) return [];
    migratedFromLocal.add(albumId);
    try {
        const all = readLocalStorageJson(ALBUM_REPLACEMENTS_KEY, {});
        const rows = normalizeReplacementBucket(all[albumId]);
        if (!rows.length) return [];
        // Drop legacy local copy — database / preview cache is source of truth.
        const next = { ...all };
        delete next[albumId];
        try {
            localStorage.setItem(ALBUM_REPLACEMENTS_KEY, JSON.stringify(next));
        } catch {
            try {
                localStorage.removeItem(ALBUM_REPLACEMENTS_KEY);
            } catch {
                /* ignore */
            }
        }
        return rows;
    } catch {
        return [];
    }
}

function readWorkingReplacements(albumId) {
    const memory = normalizeReplacementBucket(MEMORY_REPLACEMENTS.get(albumId));
    const remote = normalizeReplacementBucket(
        getRemotePreviewData(albumId)?.image_replacements
    );
    const legacy = migrateLegacyLocalReplacements(albumId);

    // Prefer the richest in-memory/DB-hydrated set; migrate legacy only when empty.
    let rows = remote;
    if (memory.length >= rows.length) rows = memory;
    if (!rows.length && legacy.length) rows = legacy;
    return rows;
}

function commitReplacements(albumId, rows) {
    const list = Array.isArray(rows) ? rows : [];
    MEMORY_REPLACEMENTS.set(albumId, list);
    patchRemotePreviewImageReplacements(albumId, list);
    notify(albumId);
    void persistReplacementsToDatabase(albumId, list);
}

async function persistReplacementsToDatabase(albumId, rows) {
    const photographerId = persistPhotographerId;
    if (!photographerId || !albumId) {
        console.warn(
            '[image-replacements] skipped DB write (no photographerId) — set configureImageReplacementsPersistence'
        );
        return;
    }
    try {
        // Dynamic import avoids a circular module graph with smartAlbums.service.
        const { smartAlbumsService } = await import('../../services/smartAlbums.service');
        await smartAlbumsService.patchAlbumImageReplacements(
            photographerId,
            albumId,
            rows.map((row) => ({
                id: row.id,
                slotKey: row.slotKey,
                slotLabel: row.slotLabel,
                note: row.note ?? null,
                spreadIndex: row.spreadIndex,
                pageNum: row.pageNum,
                cellId: row.cellId,
                whole: Boolean(row.whole),
                previousItemId: row.previousItemId ?? null,
                previousStoragePath: row.previousStoragePath ?? null,
                previousUrl: row.previousUrl,
                newItemId: row.newItemId,
                newStoragePath: row.newStoragePath ?? null,
                newUrl: row.newUrl,
                version: row.version ?? null,
                createdAt: row.createdAt,
            }))
        );
    } catch (err) {
        console.warn('[image-replacements] DB persist failed:', err?.message || err);
    }
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

/**
 * Resolve a version-history thumb URL.
 * Pass preferLive + itemId for the *current* version so in-place file replaces
 * always show the live collection file (stored newUrl can lag behind).
 * Historical versions must use frozen previousUrl / previousStoragePath only —
 * prefer storagePath so a mistaken previousUrl alias to the new file cannot win.
 */
export function resolveReplacementPreviewUrl(
    albumId,
    url,
    storagePath = null,
    { itemId = null, preferLive = false } = {}
) {
    if (url?.startsWith('data:')) return url;
    if (preferLive && itemId) {
        const live = resolveItemUrl(albumId, itemId);
        if (live) return live;
    }
    if (!preferLive && storagePath) {
        return storageService.getPublicUrl(storagePath);
    }
    if (url) return url;
    if (storagePath) return storageService.getPublicUrl(storagePath);
    return null;
}

function stripUrlCacheToken(url) {
    return typeof url === 'string' ? url.split('?')[0] : url;
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
        newUrl: newUrlOverride = null,
        newStoragePath: newStoragePathOverride = null,
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
    const newStoragePath =
        newStoragePathOverride || newItem?.storagePath || null;
    const newUrl =
        newUrlOverride ||
        (newStoragePath ? storageService.getPublicUrl(newStoragePath) : null) ||
        (newItem ? getCollectionItemDisplayUrl(newItem) : null) ||
        resolveItemUrl(albumId, newItemId);

    if (!newUrl && !newStoragePath) return null;
    if (!force && !prevUrl && !prevStoragePath && !prevId) return null;

    // Skip only when the file truly did not change (never skip an explicit New version).
    const samePath =
        Boolean(prevStoragePath && newStoragePath && prevStoragePath === newStoragePath);
    const sameUrl = Boolean(
        prevUrl && newUrl && stripUrlCacheToken(prevUrl) === stripUrlCacheToken(newUrl)
    );
    if (!force) {
        if (samePath && sameUrl) return null;
        if (!prevStoragePath && !prevId && sameUrl) return null;
    }

    // Never alias previous → new (that made v1/v2 thumbs identical). Prefer a real
    // prior URL/path; allow force rows with only new when there was no prior photo.
    const resolvedPrevUrl =
        prevUrl ||
        (prevStoragePath ? storageService.getPublicUrl(prevStoragePath) : null) ||
        null;
    if (!resolvedPrevUrl && !prevStoragePath && !prevId && !force) return null;

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
        previousUrl: resolvedPrevUrl,
        newItemId,
        newStoragePath,
        newUrl: newUrl || (newStoragePath ? storageService.getPublicUrl(newStoragePath) : null),
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
    // Freeze the storage path string NOW — after in-place replace the live item points
    // at the new file, so history must not re-resolve via collection id.
    const previousStoragePath = previousItem?.storagePath ?? null;
    const previousUrl =
        (previousStoragePath ? storageService.getPublicUrl(previousStoragePath) : null) ||
        (previousItem ? getCollectionItemDisplayUrl(previousItem) : null) ||
        getSlotImageUrl(albumId, slot, album, totalPages, previousItemId) ||
        null;
    if (!previousItemId && !previousUrl && !previousStoragePath) return null;
    return {
        previousItemId: previousItemId || null,
        previousStoragePath: previousStoragePath || null,
        // Always store a path-derived URL when possible (no cache-bust query).
        previousUrl: previousStoragePath
            ? storageService.getPublicUrl(previousStoragePath)
            : previousUrl,
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
    return backfillReplacementVersions(readWorkingReplacements(albumId)).sort(
        (a, b) =>
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
}

export function addImageReplacement(albumId, record) {
    if (!albumId || !record) return null;
    const merged = [...readWorkingReplacements(albumId)];

    const duplicate = merged.find(
        (row) =>
            row.slotKey === record.slotKey &&
            row.previousUrl === record.previousUrl &&
            row.newUrl === record.newUrl
    );
    if (duplicate) {
        commitReplacements(albumId, merged);
        return duplicate;
    }

    const entry = {
        ...record,
        spreadIndex: Number(record.spreadIndex),
        version: nextReplacementVersion(merged, Number(record.spreadIndex)),
    };
    merged.push(entry);
    commitReplacements(albumId, merged);
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
        newUrl = null,
        newStoragePath = null,
        force = false,
        spreadIndex = null,
    } = {}
) {
    if (!albumId || !slot || !newItemId) return null;
    const spreadOpts = getSpreadContext(album, totalPages);
    // Only fall back to live slot lookup when the caller did not capture "before"
    // (and never when force/new-version already replaced the item in place).
    const prevId =
        previousItemId != null
            ? previousItemId
            : force
              ? null
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
        newUrl,
        newStoragePath,
        force,
        spreadIndex,
    });
    if (!record) return null;
    return addImageReplacement(albumId, record);
}

export function removeImageReplacement(albumId, replacementId) {
    if (!albumId || !replacementId) return false;
    const bucket = readWorkingReplacements(albumId);
    if (!bucket.length) return false;
    const next = bucket.filter((row) => row.id !== replacementId);
    if (next.length === bucket.length) return false;
    commitReplacements(albumId, next);
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
        newStoragePath: row.newStoragePath ?? null,
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

    const bucket = readWorkingReplacements(albumId);
    if (!bucket.length) return false;

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

    commitReplacements(albumId, next);
    return true;
}
