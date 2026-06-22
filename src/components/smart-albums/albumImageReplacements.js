import { getCollectionItem, getCollectionItemDisplayUrl } from './albumCollection';
import { storageService } from '../../services/storage.service';
import {
    getGridSlotPhoto,
    resolveSlotCollectionItemId,
} from './albumPagePhotos';
import { getRemotePreviewData, patchRemotePreviewImageReplacements } from './albumPreviewData';
import { getSpreadLeftPageIndex } from './albumSpreadGrid';
import { getSpreadContext, pageToSpreadIndex } from './albumSpreadUtils';
import { getSlotLabel, makeSlotKey } from './albumSwapMarks';

const STORAGE_KEY = 'pixnxt_album_image_replacements';
const REVIEW_SNAPSHOT_MAX_WIDTH = 960;
const REVIEW_SNAPSHOT_JPEG_QUALITY = 0.82;

export const IMAGE_REPLACEMENTS_CHANGED_EVENT = 'pixnxt-album-image-replacements-changed';

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
    } catch {
        /* ignore */
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
    { album, totalPages, previousItemId, previousUrl, previousStoragePath = null }
) {
    const spreadOpts = getSpreadContext(album, totalPages);
    const prevId =
        previousItemId ??
        resolveSlotCollectionItemId(albumId, slot, { totalPages, spreadOpts, album });
    const prevItem = prevId ? getCollectionItem(albumId, prevId) : null;
    const prevStoragePath = previousStoragePath ?? prevItem?.storagePath ?? null;
    const prevUrl =
        previousUrl ??
        (prevItem ? getCollectionItemDisplayUrl(prevItem) : null) ??
        getSlotImageUrl(albumId, slot, album, totalPages, prevId);
    const newUrl = resolveItemUrl(albumId, newItemId);

    if (!prevUrl || !newUrl) return null;
    if (prevUrl === newUrl) return null;

    const spreadLeft =
        slot.spreadLeft ??
        getSpreadLeftPageIndex(slot.pageNum, { ...spreadOpts, totalPages });
    const whole =
        Boolean(slot.whole) ||
        (album?.grid_layout === 'whole-spread' && slot.pageNum > 0);
    const slotLabel =
        slot.label ||
        getSlotLabel(slot.pageNum, slot.cellId ?? 0, whole, totalPages, album);

    return {
        id: `repl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        slotKey: makeSlotKey(slot.pageNum, slot.cellId ?? 0),
        slotLabel,
        spreadIndex: pageToSpreadIndex(spreadLeft, { ...spreadOpts, totalPages }),
        pageNum: slot.pageNum,
        cellId: slot.cellId ?? 0,
        whole,
        previousItemId: prevId || null,
        previousStoragePath: prevStoragePath || null,
        previousUrl: prevUrl,
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
        getCollectionItemDisplayUrl(previousItem) ??
        getSlotImageUrl(albumId, slot, album, totalPages, previousItemId);
    if (!previousItemId && !previousUrl) return null;
    return {
        previousItemId: previousItemId || null,
        previousStoragePath,
        previousUrl: previousUrl || null,
    };
}

/** Async snapshot — stores a data URL so review summary keeps the before photo after R2 replace. */
export async function captureSlotImageBeforeReplaceAsync(albumId, slot, album, totalPages) {
    const captured = captureSlotImageBeforeReplace(albumId, slot, album, totalPages);
    if (!captured?.previousUrl) return captured;
    const snapshotUrl = await snapshotImageUrlForReview(captured.previousUrl);
    return {
        ...captured,
        previousUrl: snapshotUrl || captured.previousUrl,
    };
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
    const local = readAll()[albumId];
    if (Array.isArray(local)) {
        return backfillReplacementVersions(local).sort(
            (a, b) =>
                new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
    }
    const remote = getRemotePreviewData(albumId)?.image_replacements;
    return backfillReplacementVersions(remote || []).sort(
        (a, b) =>
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
}

export function addImageReplacement(albumId, record) {
    if (!albumId || !record) return null;
    const all = readAll();
    const bucket = [...(all[albumId] || [])];
    const duplicate = bucket.find(
        (row) =>
            row.slotKey === record.slotKey &&
            row.previousUrl === record.previousUrl &&
            row.newUrl === record.newUrl
    );
    if (duplicate) return duplicate;

    const entry = {
        ...record,
        version: nextReplacementVersion(bucket, record.spreadIndex),
    };
    bucket.push(entry);
    all[albumId] = bucket;
    writeAll(all);
    patchRemotePreviewImageReplacements(albumId, bucket);
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
    } = {}
) {
    if (!albumId || !slot || !newItemId) return null;
    const spreadOpts = getSpreadContext(album, totalPages);
    const prevId =
        previousItemId ??
        resolveSlotCollectionItemId(albumId, slot, { totalPages, spreadOpts, album });
    const prevItem = prevId ? getCollectionItem(albumId, prevId) : null;
    const prevUrl =
        previousUrl ??
        (prevItem ? getCollectionItemDisplayUrl(prevItem) : null) ??
        getSlotImageUrl(albumId, slot, album, totalPages, prevId);
    const prevStoragePath = previousStoragePath ?? prevItem?.storagePath ?? null;
    if (!prevId && !prevUrl) return null;

    const record = buildReplacementRecord(albumId, slot, newItemId, {
        album,
        totalPages,
        previousItemId: prevId,
        previousUrl: prevUrl,
        previousStoragePath: prevStoragePath,
    });
    if (!record) return null;
    return addImageReplacement(albumId, record);
}

export function removeImageReplacement(albumId, replacementId) {
    if (!albumId || !replacementId) return false;
    const all = readAll();
    let bucket = all[albumId];
    if (!Array.isArray(bucket) || bucket.length === 0) {
        const remote = getRemotePreviewData(albumId)?.image_replacements;
        bucket = Array.isArray(remote) ? [...remote] : [];
    } else {
        bucket = [...bucket];
    }
    if (!bucket.length) return false;
    const next = bucket.filter((row) => row.id !== replacementId);
    if (next.length === bucket.length) return false;
    all[albumId] = next;
    writeAll(all);
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
