import { getGridSlotPhoto, getPagePhotoOverride, getSpreadPhotoOverride } from './albumPagePhotos';
import { getProofCellPhotoIndex, getSpreadLeftPageIndex } from './albumSpreadGrid';
import { getSampleImageForPage } from './sampleAlbumImages';

const STORAGE_KEY = 'pixnxt_album_swap_marks';

export const SWAP_MARKS_CHANGED_EVENT = 'pixnxt-album-swap-marks-changed';

export function makeSlotKey(pageNum, cellId = 0) {
    return `${pageNum}:${cellId}`;
}

export function parseSlotKey(key) {
    const [pageNum, cellId] = String(key).split(':').map(Number);
    return { pageNum, cellId: cellId ?? 0 };
}

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
        window.dispatchEvent(
            new CustomEvent(SWAP_MARKS_CHANGED_EVENT, {
                detail: { albumId: null },
            })
        );
    } catch {
        /* ignore */
    }
}

function notify(albumId) {
    try {
        window.dispatchEvent(
            new CustomEvent(SWAP_MARKS_CHANGED_EVENT, { detail: { albumId } })
        );
    } catch {
        /* ignore */
    }
}

/** All swappable photo slots for the album layout. */
export function enumerateAlbumPhotoSlots(totalPages, gridLayout = 'two-page') {
    const slots = [];
    if (totalPages > 0) {
        slots.push({ pageNum: 0, cellId: 0, label: 'Cover' });
    }

    const whole = gridLayout === 'whole-spread';
    for (let left = 1; left < totalPages; left += 2) {
        const spreadNum = Math.floor((left - 1) / 2) + 1;
        if (whole) {
            slots.push({
                pageNum: left,
                cellId: 1,
                spreadLeft: left,
                whole: true,
                label: `Spread ${spreadNum} · Whole`,
            });
        } else {
            slots.push({
                pageNum: left,
                cellId: 1,
                spreadLeft: left,
                label: `Spread ${spreadNum} · Left`,
            });
            const rightPage = left + 1;
            if (rightPage < totalPages) {
                slots.push({
                    pageNum: rightPage,
                    cellId: 2,
                    spreadLeft: left,
                    label: `Spread ${spreadNum} · Right`,
                });
            }
        }
    }
    return slots;
}

export function getSlotThumbnail(albumId, slot, { showSamples = false, album, totalPages = 0 } = {}) {
    if (!albumId || !slot) return null;

    const { pageNum, cellId } = slot;
    if (pageNum === 0) {
        return (
            getPagePhotoOverride(albumId, 0) ||
            album?.cover_image_url ||
            (showSamples ? getSampleImageForPage(0) : null)
        );
    }

    const spreadLeft = slot.spreadLeft ?? getSpreadLeftPageIndex(pageNum, { showCover: true });
    if (slot.whole) {
        const spreadSrc = getSpreadPhotoOverride(albumId, spreadLeft);
        if (spreadSrc) return spreadSrc;
    }

    const photoIndex =
        slot.photoIndex ??
        getProofCellPhotoIndex(pageNum, cellId || 1, totalPages || album?.page_count || 1, {
            showCover: true,
        });
    const { src } = getGridSlotPhoto(albumId, photoIndex, cellId || 1, spreadLeft);
    if (src) return src;
    const pageSrc = getPagePhotoOverride(albumId, photoIndex);
    if (pageSrc) return pageSrc;
    return showSamples ? getSampleImageForPage(photoIndex) : null;
}

export function getSwapMarks(albumId) {
    if (!albumId) return [];
    return readAll()[albumId] || [];
}

export function addSwapMark(albumId, slotA, slotB) {
    if (!albumId || !slotA || !slotB) return null;
    const keyA = makeSlotKey(slotA.pageNum, slotA.cellId);
    const keyB = makeSlotKey(slotB.pageNum, slotB.cellId);
    if (keyA === keyB) return null;

    const all = readAll();
    const list = [...(all[albumId] || [])];
    const filtered = list.filter((m) => m.a !== keyA && m.b !== keyA && m.a !== keyB && m.b !== keyB);
    const mark = {
        id: `swap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        a: keyA,
        b: keyB,
        labelA: slotA.label || getSlotLabel(slotA.pageNum, slotA.cellId, slotA.whole),
        labelB: slotB.label || getSlotLabel(slotB.pageNum, slotB.cellId, slotB.whole),
        locked: true,
        createdAt: new Date().toISOString(),
    };
    filtered.push(mark);
    all[albumId] = filtered;
    writeAll(all);
    notify(albumId);
    return mark;
}

export function removeSwapMark(albumId, markId) {
    if (!albumId || !markId) return;
    const all = readAll();
    const list = all[albumId] || [];
    const next = list.filter((m) => m.id !== markId);
    if (next.length === list.length) return;
    all[albumId] = next;
    writeAll(all);
    notify(albumId);
}

/** Slot keys that belong to a locked swap mark. */
export function getLockedSlotKeys(marks) {
    const keys = new Set();
    (marks || []).forEach((m) => {
        if (m.locked === false) return;
        keys.add(m.a);
        keys.add(m.b);
    });
    return keys;
}

export function isSlotKeyLocked(marks, key) {
    return getLockedSlotKeys(marks).has(key);
}

export function isSlotSwapLocked(
    marks,
    pageNum,
    cellId = 0,
    { placementMode = 'single', spreadLeft = null } = {}
) {
    let key = makeSlotKey(pageNum, cellId);
    if (placementMode === 'whole' && spreadLeft != null) {
        if (!(pageNum === spreadLeft && cellId === 1)) {
            return isSlotKeyLocked(marks, makeSlotKey(spreadLeft, 1));
        }
        key = makeSlotKey(spreadLeft, 1);
    }
    return isSlotKeyLocked(marks, key);
}

export function isSlotSwapMarked(marks, pageNum, cellId = 0) {
    const key = makeSlotKey(pageNum, cellId);
    return (marks || []).some((m) => m.a === key || m.b === key);
}

/** Human-readable label for a photo slot (cover, left, right, whole). */
export function getSlotLabel(pageNum, cellId = 0, whole = false) {
    if (pageNum === 0) return 'Cover';
    const spreadLeft = getSpreadLeftPageIndex(pageNum, { showCover: true });
    const spreadNum = Math.floor((spreadLeft - 1) / 2) + 1;
    if (whole) return `Spread ${spreadNum} · Whole`;
    if (cellId === 1 || pageNum === spreadLeft) return `Spread ${spreadNum} · Left`;
    return `Spread ${spreadNum} · Right`;
}

export function resolveSlotLabel(key, gridLayout = 'two-page') {
    const { pageNum, cellId } = parseSlotKey(key);
    const whole = gridLayout === 'whole-spread' && pageNum > 0;
    return getSlotLabel(pageNum, cellId, whole);
}

/** Swap mark details for a grid slot, including the paired slot label. */
export function getSwapMarkForSlot(
    marks,
    pageNum,
    cellId = 0,
    { placementMode = 'single', spreadLeft = null, gridLayout = 'two-page' } = {}
) {
    let key = makeSlotKey(pageNum, cellId);
    if (placementMode === 'whole' && spreadLeft != null) {
        if (!(pageNum === spreadLeft && cellId === 1)) {
            return null;
        }
        key = makeSlotKey(spreadLeft, 1);
    }

    const mark = (marks || []).find((m) => m.a === key || m.b === key);
    if (!mark) return null;

    const isA = mark.a === key;
    const slotLabel =
        (isA ? mark.labelA : mark.labelB) ||
        resolveSlotLabel(key, gridLayout);
    const partnerLabel =
        (isA ? mark.labelB : mark.labelA) ||
        resolveSlotLabel(isA ? mark.b : mark.a, gridLayout);

    return {
        slotLabel,
        partnerLabel,
        title: `Swap · ${slotLabel}`,
        subtitle: `with ${partnerLabel}`,
        locked: mark.locked !== false,
        markId: mark.id,
    };
}

export function slotsMatch(a, b) {
    if (!a || !b) return false;
    return a.pageNum === b.pageNum && (a.cellId ?? 0) === (b.cellId ?? 0);
}
