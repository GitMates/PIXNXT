import { getCollectionItem, getCollectionItemDisplayUrl } from './albumCollection';
import {
    getGridSlotPhoto,
    getSlotPlacementCollectionItemId,
} from './albumPagePhotos';
import { getRemotePreviewData, patchRemotePreviewImageReplacements } from './albumPreviewData';
import { getSpreadLeftPageIndex } from './albumSpreadGrid';
import { getSpreadContext, pageToSpreadIndex } from './albumSpreadUtils';
import { getSlotLabel, makeSlotKey } from './albumSwapMarks';

const STORAGE_KEY = 'pixnxt_album_image_replacements';

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

function getSlotImageUrl(albumId, slot, album, totalPages, itemId = null) {
    const resolvedItemId = itemId ?? getSlotPlacementCollectionItemId(albumId, slot);
    const fromItem = resolveItemUrl(albumId, resolvedItemId);
    if (fromItem) return fromItem;

    if (!slot) return null;
    const spreadOpts = getSpreadContext(album, totalPages);
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

function buildReplacementRecord(albumId, slot, newItemId, { album, totalPages, previousItemId, previousUrl }) {
    const prevId = previousItemId ?? getSlotPlacementCollectionItemId(albumId, slot);
    const prevUrl = previousUrl ?? getSlotImageUrl(albumId, slot, album, totalPages, prevId);
    const newUrl = resolveItemUrl(albumId, newItemId);

    if (!prevUrl || !newUrl) return null;
    if (prevUrl === newUrl) return null;

    const spreadOpts = getSpreadContext(album, totalPages);
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
        spreadIndex: pageToSpreadIndex(slot.pageNum, { showCover: true, totalPages }),
        pageNum: slot.pageNum,
        cellId: slot.cellId ?? 0,
        whole,
        previousItemId: prevId || null,
        previousUrl: prevUrl,
        newItemId,
        newUrl,
        createdAt: new Date().toISOString(),
    };
}

/** Snapshot slot image before a placement overwrites it (for review-summary tracking). */
export function captureSlotImageBeforeReplace(albumId, slot, album, totalPages) {
    if (!albumId || !slot) return null;
    const previousItemId = getSlotPlacementCollectionItemId(albumId, slot);
    const previousUrl = getSlotImageUrl(albumId, slot, album, totalPages, previousItemId);
    if (!previousItemId && !previousUrl) return null;
    return { previousItemId: previousItemId || null, previousUrl: previousUrl || null };
}

export function getImageReplacements(albumId) {
    if (!albumId) return [];
    const local = readAll()[albumId];
    if (Array.isArray(local)) {
        return [...local].sort(
            (a, b) =>
                new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
    }
    const remote = getRemotePreviewData(albumId)?.image_replacements;
    return [...(remote || [])].sort(
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
    bucket.push(record);
    all[albumId] = bucket;
    writeAll(all);
    patchRemotePreviewImageReplacements(albumId, bucket);
    notify(albumId);
    return record;
}

/** Record a spread photo replacement when a slot already had an image. */
export function trackSpreadImageReplacement(
    albumId,
    slot,
    newItemId,
    { album = null, totalPages = 0, previousItemId = null, previousUrl = null } = {}
) {
    if (!albumId || !slot || !newItemId) return null;
    const prevId = previousItemId ?? getSlotPlacementCollectionItemId(albumId, slot);
    const prevUrl = previousUrl ?? getSlotImageUrl(albumId, slot, album, totalPages, prevId);
    if (!prevId && !prevUrl) return null;

    const record = buildReplacementRecord(albumId, slot, newItemId, {
        album,
        totalPages,
        previousItemId: prevId,
        previousUrl: prevUrl,
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
        previousUrl: row.previousUrl,
        newItemId: row.newItemId,
        newUrl: row.newUrl,
        createdAt: row.createdAt,
    }));
}
