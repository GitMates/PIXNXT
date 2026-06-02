import { getGridSlotPhoto, getPagePhotoOverride, getSpreadPhotoOverride } from './albumPagePhotos';
import { getProofCellPhotoIndex, getSpreadLeftPageIndex } from './albumSpreadGrid';
import { isEndHalfSpreadLeftPage } from './albumSpreadUtils';
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

    const spreadLeft =
        slot.spreadLeft ?? getSpreadLeftPageIndex(pageNum, { showCover: true, totalPages });
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

export function addSwapMark(albumId, slotA, slotB, options = {}) {
    if (!albumId || !slotA || !slotB) return null;
    const keyA = makeSlotKey(slotA.pageNum, slotA.cellId);
    const keyB = makeSlotKey(slotB.pageNum, slotB.cellId);
    if (keyA === keyB) return null;

    const all = readAll();
    const list = [...(all[albumId] || [])];
    const alreadyExists = list.some(
        (m) => (m.a === keyA && m.b === keyB) || (m.a === keyB && m.b === keyA)
    );
    if (alreadyExists) return null;
    const mark = {
        id: `swap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        a: keyA,
        b: keyB,
        labelA: slotA.label || getSlotLabel(slotA.pageNum, slotA.cellId, slotA.whole),
        labelB: slotB.label || getSlotLabel(slotB.pageNum, slotB.cellId, slotB.whole),
        locked: true,
        pointA: options?.pointA || null,
        pointB: options?.pointB || null,
        createdAt: new Date().toISOString(),
    };
    list.push(mark);
    all[albumId] = list;
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

/** Build a swap origin/target slot for left, right, or whole scope on an inner spread. */
export function buildSwapSlotForScope(
    spreadLeft,
    scope,
    totalPages,
    { gridLayout = 'two-page' } = {}
) {
    const spreadNum = Math.floor((spreadLeft - 1) / 2) + 1;
    if (scope === 'whole' || gridLayout === 'whole-spread') {
        return {
            pageNum: spreadLeft,
            cellId: 1,
            spreadLeft,
            whole: true,
            label: `Spread ${spreadNum} · Whole`,
        };
    }
    if (scope === 'right') {
        const rightPage = spreadLeft + 1;
        return {
            pageNum: rightPage,
            cellId: 2,
            spreadLeft,
            whole: false,
            label: `Spread ${spreadNum} · Right`,
        };
    }
    return {
        pageNum: spreadLeft,
        cellId: 1,
        spreadLeft,
        whole: false,
        label: `Spread ${spreadNum} · Left`,
    };
}

/** Human-readable label for a photo slot (cover, left, right, whole). */
export function getSlotLabel(pageNum, cellId = 0, whole = false, totalPages = 99) {
    if (pageNum === 0) return 'Cover';
    const spreadLeft = getSpreadLeftPageIndex(pageNum, { showCover: true, totalPages });
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

    const mark = [...(marks || [])].reverse().find((m) => m.a === key || m.b === key);
    if (!mark) return null;

    const isA = mark.a === key;
    const slotLabel =
        (isA ? mark.labelA : mark.labelB) ||
        resolveSlotLabel(key, gridLayout);
    const partnerLabel =
        (isA ? mark.labelB : mark.labelA) ||
        resolveSlotLabel(isA ? mark.b : mark.a, gridLayout);
    const point = isA ? mark.pointA : mark.pointB;
    const pinLabel = isA ? 'A' : 'B';

    return {
        slotLabel,
        partnerLabel,
        title: `Swap · ${slotLabel}`,
        subtitle: `with ${partnerLabel}`,
        locked: mark.locked !== false,
        markId: mark.id,
        point,
        pinLabel,
    };
}

export function slotsMatch(a, b) {
    if (!a || !b) return false;
    if (a.swapScope === 'both' || b.swapScope === 'both') {
        return (a.spreadLeft ?? a.pageNum) === (b.spreadLeft ?? b.pageNum);
    }
    return a.pageNum === b.pageNum && (a.cellId ?? 0) === (b.cellId ?? 0);
}

/** Spread uses one full-bleed image (spread storage, not separate left/right pages). */
export function spreadHasWholeGridPhoto(
    albumId,
    spreadLeft,
    totalPages,
    gridLayout = 'two-page'
) {
    if (gridLayout === 'whole-spread') return true;
    if (!albumId || spreadLeft < 1) return false;
    if (!getSpreadPhotoOverride(albumId, spreadLeft)) return false;
    if (getPagePhotoOverride(albumId, spreadLeft)) return false;
    const rightPage = spreadLeft + 1;
    if (rightPage < totalPages && getPagePhotoOverride(albumId, rightPage)) return false;
    return true;
}

export function inferSwapScopeFromSlot(slot) {
    if (!slot || slot.pageNum === 0) return 'cover';
    if (slot.whole) return 'both';
    if (slot.cellId === 2) return 'right';
    return 'left';
}

/** Which swap scopes to show in the execute modal (left / right / both, or both-only). */
export function getAvailableSwapScopes(albumId, slot, totalPages, gridLayout = 'two-page') {
    if (!slot || slot.pageNum === 0) return ['cover'];
    const spreadLeft =
        slot.spreadLeft ??
        getSpreadLeftPageIndex(slot.pageNum, { showCover: true, totalPages });
    if (spreadHasWholeGridPhoto(albumId, spreadLeft, totalPages, gridLayout)) {
        return ['both'];
    }
    const scopes = ['left'];
    const rightPage = spreadLeft + 1;
    const endHalf = isEndHalfSpreadLeftPage(spreadLeft, totalPages);
    if (!endHalf && rightPage < totalPages) {
        scopes.push('right');
    }
    if (!endHalf) {
        scopes.push('both');
    }
    return scopes;
}

export function buildOriginSlotForSwapScope(
    spreadLeft,
    scope,
    totalPages,
    { gridLayout = 'two-page' } = {}
) {
    if (scope === 'cover') {
        return { pageNum: 0, cellId: 0, spreadLeft: 0, swapScope: 'cover', label: 'Cover' };
    }
    const spreadNum = Math.floor((spreadLeft - 1) / 2) + 1;
    if (scope === 'both') {
        return {
            pageNum: spreadLeft,
            cellId: 1,
            spreadLeft,
            whole: true,
            swapScope: 'both',
            label: `Spread ${spreadNum} · Both`,
        };
    }
    const base = buildSwapSlotForScope(spreadLeft, scope, totalPages, { gridLayout });
    return { ...base, swapScope: scope };
}

function enumerateSpreadBothTargets(totalPages, originSpreadLeft) {
    const targets = [];
    for (let left = 1; left < totalPages; left += 2) {
        if (left === originSpreadLeft) continue;
        const spreadNum = Math.floor((left - 1) / 2) + 1;
        targets.push({
            pageNum: left,
            cellId: 1,
            spreadLeft: left,
            whole: true,
            swapScope: 'both',
            label: `Spread ${spreadNum} · Both`,
        });
    }
    return targets;
}

export function slotSwapKind(slot) {
    if (!slot || slot.pageNum === 0) return 'cover';
    if (slot.swapScope === 'both') return 'both';
    if (slot.whole) return 'whole';
    if (slot.cellId === 2) return 'right';
    return 'left';
}

/** Whether this slot is a single full-spread image (not separate left/right pages). */
export function isWholeGridSwapSlot(albumId, slot, totalPages, gridLayout = 'two-page') {
    if (!slot || slot.pageNum === 0) return false;
    if (slot.whole || slot.swapScope === 'both') return true;
    const spreadLeft =
        slot.spreadLeft ??
        getSpreadLeftPageIndex(slot.pageNum, { showCover: true, totalPages });
    return spreadHasWholeGridPhoto(albumId, spreadLeft, totalPages, gridLayout);
}

/** Normalize a slot to whole-spread form when it uses spread storage. */
export function normalizeWholeGridSwapSlot(slot, totalPages) {
    if (!slot || slot.pageNum === 0) return slot;
    const spreadLeft =
        slot.spreadLeft ??
        getSpreadLeftPageIndex(slot.pageNum, { showCover: true, totalPages });
    const spreadNum = Math.floor((spreadLeft - 1) / 2) + 1;
    return {
        pageNum: spreadLeft,
        cellId: 1,
        spreadLeft,
        whole: true,
        label: slot.label?.includes('Whole') ? slot.label : `Spread ${spreadNum} · Whole`,
    };
}

/**
 * Targets for the instant swap modal (context menu).
 * Per-page slots: all other left and right photos. Whole-grid spreads: other whole spreads only.
 */
export function enumerateSwapExecuteCandidates(
    albumId,
    originSlot,
    totalPages,
    gridLayout = 'two-page'
) {
    if (!originSlot) return [];

    if (originSlot.pageNum === 0) {
        return enumerateAlbumPhotoSlots(totalPages, gridLayout).filter(
            (slot) => slot.pageNum === 0 && !slotsMatch(slot, originSlot)
        );
    }

    const originSpreadLeft =
        originSlot.spreadLeft ??
        getSpreadLeftPageIndex(originSlot.pageNum, { showCover: true, totalPages });

    if (isWholeGridSwapSlot(albumId, originSlot, totalPages, gridLayout)) {
        const targets = [];
        for (let left = 1; left < totalPages; left += 2) {
            if (left === originSpreadLeft) continue;
            if (!spreadHasWholeGridPhoto(albumId, left, totalPages, gridLayout)) continue;
            const spreadNum = Math.floor((left - 1) / 2) + 1;
            targets.push({
                pageNum: left,
                cellId: 1,
                spreadLeft: left,
                whole: true,
                label: `Spread ${spreadNum} · Whole`,
            });
        }
        return targets;
    }

    if (gridLayout === 'whole-spread') {
        return enumerateSpreadBothTargets(totalPages, originSpreadLeft);
    }

    const all = enumerateAlbumPhotoSlots(totalPages, gridLayout);
    return all.filter((slot) => {
        if (slotsMatch(slot, originSlot)) return false;
        if (slot.pageNum === 0 || slot.whole) return false;
        const targetLeft =
            slot.spreadLeft ??
            getSpreadLeftPageIndex(slot.pageNum, { showCover: true, totalPages });
        if (spreadHasWholeGridPhoto(albumId, targetLeft, totalPages, gridLayout)) {
            return false;
        }
        return true;
    });
}

/** Targets for the swap modal for a given scope. */
export function enumerateSwapCandidates(
    scope,
    originSlot,
    totalPages,
    gridLayout = 'two-page',
    albumId = null
) {
    if (!originSlot) return [];
    const originKind = slotSwapKind(originSlot);

    if (originKind === 'cover') {
        return enumerateAlbumPhotoSlots(totalPages, gridLayout).filter(
            (slot) => slot.pageNum === 0 && !slotsMatch(slot, originSlot)
        );
    }

    if (albumId && isWholeGridSwapSlot(albumId, originSlot, totalPages, gridLayout)) {
        return enumerateSwapExecuteCandidates(albumId, originSlot, totalPages, gridLayout);
    }

    const originSpreadLeft =
        originSlot.spreadLeft ??
        getSpreadLeftPageIndex(originSlot.pageNum, { showCover: true, totalPages });

    if (scope === 'both' || originKind === 'both') {
        return enumerateSpreadBothTargets(totalPages, originSpreadLeft);
    }

    return enumerateSwapExecuteCandidates(albumId, originSlot, totalPages, gridLayout);
}

/** Thumbnail for swap picker — whole spread preview when swapping both pages. */
export function getSwapTargetThumbnail(albumId, slot, { showSamples = false, album, totalPages = 0 } = {}) {
    if (!albumId || !slot) return null;
    if (slot.swapScope !== 'both' && !slot.whole) {
        return getSlotThumbnail(albumId, slot, { showSamples, album, totalPages });
    }
    const spreadLeft =
        slot.spreadLeft ??
        getSpreadLeftPageIndex(slot.pageNum, { showCover: true, totalPages });
    const spreadSrc = getSpreadPhotoOverride(albumId, spreadLeft);
    if (spreadSrc) return spreadSrc;
    const leftThumb = getSlotThumbnail(
        albumId,
        { pageNum: spreadLeft, cellId: 1, spreadLeft },
        { showSamples, album, totalPages }
    );
    if (leftThumb) return leftThumb;
    const rightPage = spreadLeft + 1;
    if (rightPage < totalPages) {
        return getSlotThumbnail(
            albumId,
            { pageNum: rightPage, cellId: 2, spreadLeft },
            { showSamples, album, totalPages }
        );
    }
    return null;
}
