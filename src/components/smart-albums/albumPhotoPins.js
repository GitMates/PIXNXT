import { supabase } from '../../lib/supabase/client';
import {
    remapPageForSpreadMove,
    remapSpreadIndexAfterOverviewReorder,
    spreadIndexForPageNum,
} from './albumSpreadReorder';
import {
    isMissingRelationError,
    isMissingColumnError,
    resolveCommentAttachmentForDb,
    loadFeedbackSeenMap,
    upsertFeedbackSeenRows,
} from './albumFeedbackDb';

/** In-memory cache hydrated from Supabase (shared client + photographer). */
const pinsByAlbum = Object.create(null);
const seenByAlbum = Object.create(null);

export const PHOTO_PINS_CHANGED_EVENT = 'pixnxt-album-photo-pins-changed';
export const PHOTO_PINS_SEEN_CHANGED_EVENT = 'pixnxt-album-photo-pins-seen-changed';

export function makePinSlotKey(pageNum, cellId = 0) {
    return `${pageNum}:${cellId}`;
}

function notify(albumId) {
    try {
        window.dispatchEvent(new CustomEvent(PHOTO_PINS_CHANGED_EVENT, { detail: { albumId } }));
    } catch {
        /* ignore */
    }
}

function setAlbumPins(albumId, list, { silent = false } = {}) {
    pinsByAlbum[albumId] = list;
    if (!silent) notify(albumId);
}

function mapPinRow(row) {
    return {
        id: row.id,
        type: row.pin_type || 'comment',
        pageNum: row.page_num,
        cellId: row.cell_id ?? 0,
        xPct: row.x_pct,
        yPct: row.y_pct,
        message: row.message || '',
        label: row.label || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at || null,
        authorName: row.author_name || null,
        authorEmail: row.author_email || null,
        attachment_url: row.attachment_url || null,
        attachment_name: row.attachment_name || null,
        attachment_type: row.attachment_type || null,
    };
}

function toPinInsert(albumId, pin) {
    return {
        id: pin.id,
        album_id: albumId,
        page_num: pin.pageNum,
        cell_id: pin.cellId ?? 0,
        x_pct: pin.xPct,
        y_pct: pin.yPct,
        message: pin.message || '',
        label: pin.label || null,
        pin_type: pin.type || 'comment',
        author_name: pin.authorName || null,
        author_email: pin.authorEmail || null,
        created_at: pin.createdAt || new Date().toISOString(),
        updated_at: pin.updatedAt || pin.createdAt || new Date().toISOString(),
        attachment_url: pin.attachment_url || null,
        attachment_name: pin.attachment_name || null,
        attachment_type: pin.attachment_type || null,
    };
}

async function persistPinInsert(albumId, pin) {
    try {
        const payload = toPinInsert(albumId, pin);
        let { error } = await supabase
            .from('album_proofer_photo_pins')
            .insert(payload);
        if (error && isMissingColumnError(error, 'attachment')) {
            const fallback = { ...payload };
            delete fallback.attachment_url;
            delete fallback.attachment_name;
            delete fallback.attachment_type;
            ({ error } = await supabase
                .from('album_proofer_photo_pins')
                .insert(fallback));
        }
        if (error && !isMissingRelationError(error, 'album_proofer_photo_pins')) {
            console.warn('persistPinInsert:', error.message);
        }
    } catch (err) {
        console.warn('persistPinInsert failed:', err);
    }
}

async function persistPinDelete(pinId) {
    try {
        const { error } = await supabase.from('album_proofer_photo_pins').delete().eq('id', pinId);
        if (error && !isMissingRelationError(error, 'album_proofer_photo_pins')) {
            console.warn('persistPinDelete:', error.message);
        }
    } catch (err) {
        console.warn('persistPinDelete failed:', err);
    }
}

async function persistPinUpdate(albumId, pin) {
    try {
        const updatePayload = {
            page_num: pin.pageNum,
            cell_id: pin.cellId ?? 0,
            x_pct: pin.xPct,
            y_pct: pin.yPct,
            message: pin.message || '',
            label: pin.label || null,
            updated_at: pin.updatedAt || new Date().toISOString(),
            attachment_url: pin.attachment_url || null,
            attachment_name: pin.attachment_name || null,
            attachment_type: pin.attachment_type || null,
        };
        let { error } = await supabase
            .from('album_proofer_photo_pins')
            .update(updatePayload)
            .eq('id', pin.id)
            .eq('album_id', albumId);
        if (error && isMissingColumnError(error, 'attachment')) {
            const fallback = { ...updatePayload };
            delete fallback.attachment_url;
            delete fallback.attachment_name;
            delete fallback.attachment_type;
            ({ error } = await supabase
                .from('album_proofer_photo_pins')
                .update(fallback)
                .eq('id', pin.id)
                .eq('album_id', albumId));
        }
        if (error && !isMissingRelationError(error, 'album_proofer_photo_pins')) {
            console.warn('persistPinUpdate:', error.message);
        }
    } catch (err) {
        console.warn('persistPinUpdate failed:', err);
    }
}

/** Load photo pins from Supabase into memory (client link + photographer). */
export async function hydratePhotoPins(albumId) {
    if (!albumId) return [];
    try {
        const { data, error } = await supabase
            .from('album_proofer_photo_pins')
            .select('*')
            .eq('album_id', albumId)
            .order('created_at', { ascending: true });
        if (error) {
            if (!isMissingRelationError(error, 'album_proofer_photo_pins')) {
                console.warn('hydratePhotoPins:', error.message);
            }
            return getPhotoPins(albumId);
        }
        const list = (data || []).map(mapPinRow);
        setAlbumPins(albumId, list);
        return list;
    } catch (err) {
        console.warn('hydratePhotoPins failed:', err);
        return getPhotoPins(albumId);
    }
}

export async function hydratePhotoPinsSeen(
    albumId,
    viewerRole = 'photographer',
    viewerKey = 'default'
) {
    if (!albumId) return;
    const map = await loadFeedbackSeenMap(albumId, viewerRole, viewerKey);
    seenByAlbum[albumId] = map.pin || {};
    notifyPhotoPinsSeenChanged(albumId);
}

export function notifyPhotoPinsSeenChanged(albumId) {
    try {
        window.dispatchEvent(
            new CustomEvent(PHOTO_PINS_SEEN_CHANGED_EVENT, { detail: { albumId } })
        );
    } catch {
        /* ignore */
    }
}

export function isPhotoPinUnseen(albumId, pin) {
    if (!albumId || !pin?.id) return false;
    const seenAt = seenByAlbum[albumId]?.[pin.id];
    if (!seenAt) return true;
    const stamp = pin.updatedAt || pin.createdAt;
    if (!stamp) return false;
    return new Date(stamp).getTime() > new Date(seenAt).getTime();
}

export function countUnseenPhotoPins(albumId, pins) {
    return (pins || []).filter((pin) => isPhotoPinUnseen(albumId, pin)).length;
}

export function markPhotoPinsSeen(
    albumId,
    pins,
    { viewerRole = 'photographer', viewerKey = 'default' } = {}
) {
    if (!albumId || !pins?.length) return;
    const bucket = { ...(seenByAlbum[albumId] || {}) };
    const now = new Date().toISOString();
    const rows = [];
    pins.forEach((pin) => {
        if (!pin?.id) return;
        bucket[pin.id] = now;
        rows.push({
            album_id: albumId,
            viewer_role: viewerRole,
            viewer_key: viewerKey || 'default',
            item_kind: 'pin',
            item_id: String(pin.id),
            seen_at: now,
        });
    });
    seenByAlbum[albumId] = bucket;
    notifyPhotoPinsSeenChanged(albumId);
    void upsertFeedbackSeenRows(rows);
}

export function getPhotoPins(albumId) {
    if (!albumId) return [];
    return pinsByAlbum[albumId] || [];
}

export function getPinsForSlot(pins, pageNum, cellId = 0, { placementMode = 'single', spreadLeft = null } = {}) {
    if (placementMode === 'whole' && spreadLeft != null && pageNum > 0) {
        const onLeftPage = pageNum === spreadLeft && cellId === 1;
        const onRightPage = pageNum === spreadLeft + 1 && cellId === 2;
        if (!onLeftPage && !onRightPage) return [];

        return (pins || []).filter((pin) => {
            const pinPage = pin.pageNum;
            const pinCell = pin.cellId ?? 0;
            if (onLeftPage) {
                return pinPage === spreadLeft && pinCell === 1;
            }
            return pinPage === spreadLeft + 1 && pinCell === 2;
        });
    }

    const key = makePinSlotKey(pageNum, cellId);
    return (pins || []).filter((p) => makePinSlotKey(p.pageNum, p.cellId ?? 0) === key);
}

export function addPhotoPin(albumId, { pageNum, cellId = 0, xPct, yPct, message, label, authorName, authorEmail, attachment }) {
    if (!albumId) return null;
    let finalMessage = '';
    let rawAttachment = null;
    if (typeof message === 'object' && message !== null) {
        finalMessage = message.message || '';
        rawAttachment = message.attachment || null;
    } else {
        finalMessage = message;
        rawAttachment = attachment || null;
    }
    const trimmed = String(finalMessage).trim();
    if (!trimmed && !rawAttachment) return null;

    const pin = {
        id: crypto.randomUUID(),
        type: 'comment',
        pageNum,
        cellId: cellId ?? 0,
        xPct: Math.min(100, Math.max(0, xPct)),
        yPct: Math.min(100, Math.max(0, yPct)),
        message: trimmed,
        label: label || null,
        createdAt: new Date().toISOString(),
        authorName: authorName || null,
        authorEmail: authorEmail || null,
        attachment_url: rawAttachment?.url || null,
        attachment_name: rawAttachment?.name || null,
        attachment_type: rawAttachment?.type || null,
    };

    const list = [...getPhotoPins(albumId), pin];
    setAlbumPins(albumId, list);

    (async () => {
        if (rawAttachment?.url?.startsWith('data:')) {
            try {
                const uploaded = await resolveCommentAttachmentForDb(
                    albumId,
                    rawAttachment.url,
                    rawAttachment.name,
                    rawAttachment.type
                );
                pin.attachment_url = uploaded.url;
                pin.attachment_name = uploaded.name;
                pin.attachment_type = uploaded.type;

                const currentList = getPhotoPins(albumId);
                const idx = currentList.findIndex((p) => p.id === pin.id);
                if (idx >= 0) {
                    currentList[idx] = { ...pin };
                    setAlbumPins(albumId, currentList);
                }
            } catch (err) {
                console.warn('Failed to upload pin attachment:', err);
            }
        }
        void persistPinInsert(albumId, pin);
    })();

    return pin;
}

/** Shift or drop pins when album pages are inserted/removed (matches page photo storage). */
export function shiftAlbumPhotoPins(albumId, insertAt, delta) {
    if (!albumId || !delta) return;
    const list = getPhotoPins(albumId);
    if (!list?.length) return;

    const next = [];
    const removedIds = [];
    for (const pin of list) {
        const page = pin.pageNum;
        if (delta > 0) {
            if (page >= insertAt) next.push({ ...pin, pageNum: page + delta });
            else next.push(pin);
            continue;
        }
        const removeEnd = insertAt - delta;
        if (page >= insertAt && page < removeEnd) {
            removedIds.push(pin.id);
            continue;
        }
        if (page >= removeEnd) next.push({ ...pin, pageNum: page + delta });
        else next.push(pin);
    }

    const changed =
        next.length !== list.length ||
        next.some((pin, index) => pin.pageNum !== list[index].pageNum);
    if (!changed) return;

    setAlbumPins(albumId, next);
    removedIds.forEach((id) => void persistPinDelete(id));
    next.forEach((pin) => void persistPinUpdate(albumId, pin));
}

export function removePhotoPin(albumId, pinId) {
    if (!albumId || !pinId) return;
    const list = getPhotoPins(albumId);
    const next = list.filter((p) => p.id !== pinId);
    if (next.length === list.length) return;
    setAlbumPins(albumId, next);
    void persistPinDelete(pinId);
}

export function updatePhotoPin(albumId, pinId, patch = {}) {
    if (!albumId || !pinId) return null;
    const list = getPhotoPins(albumId);
    const idx = list.findIndex((p) => p.id === pinId);
    if (idx < 0) return null;

    let patchMsgText = patch.message;
    if (typeof patchMsgText === 'object' && patchMsgText !== null) {
        patchMsgText = patchMsgText.message;
    }

    const nextPin = {
        ...list[idx],
        ...patch,
        message:
            patchMsgText != null
                ? String(patchMsgText).trim()
                : list[idx].message,
        updatedAt: new Date().toISOString(),
    };
    if (!nextPin.message) return null;
    const nextList = [...list];
    nextList[idx] = nextPin;
    setAlbumPins(albumId, nextList);
    void persistPinUpdate(albumId, nextPin);
    return nextPin;
}

export function slotsMatch(a, b) {
    if (!a || !b) return false;
    return a.pageNum === b.pageNum && (a.cellId ?? 0) === (b.cellId ?? 0);
}

/** Move comment pins when overview spreads are drag-reordered. */
export function reorderPhotoPinsForOverview(albumId, draggable, newOrder, totalPages, spreadOpts) {
    if (!albumId || !draggable?.length) return false;

    const list = getPhotoPins(albumId);
    if (!list?.length) return false;

    let changed = false;
    const next = list.map((pin) => {
        const spreadIndex = spreadIndexForPageNum(pin.pageNum, totalPages, spreadOpts);
        if (!draggable.includes(spreadIndex)) return pin;

        const newSpreadIndex = remapSpreadIndexAfterOverviewReorder(
            spreadIndex,
            draggable,
            newOrder
        );
        if (newSpreadIndex === spreadIndex) return pin;

        changed = true;
        return {
            ...pin,
            pageNum: remapPageForSpreadMove(
                pin.pageNum,
                spreadIndex,
                newSpreadIndex,
                totalPages,
                spreadOpts
            ),
        };
    });

    if (!changed) return false;

    setAlbumPins(albumId, next);
    next.forEach((pin) => void persistPinUpdate(albumId, pin));
    return true;
}
