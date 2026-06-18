import { getGridSlotPhoto, getPagePhotoOverride, getSpreadPhotoOverride } from './albumPagePhotos';
import { getProofCellPhotoIndex, getSpreadLeftPageIndex } from './albumSpreadGrid';
import {
    getEndSpreadPageIndices,
    getSpreadContext,
    getSpreadPages,
    getTotalSpreads,
    isEndHalfSpreadLeftPage,
    isInsideCoverLeftPage,
    isInsideCoverRightPage,
    isPreBackHalfSpreadLeftPage,
    spreadNumberFromLeftPage,
} from './albumSpreadUtils';
import { getSampleImageForPage } from './sampleAlbumImages';

const STORAGE_KEY = 'pixnxt_album_swap_marks';
const SEEN_KEY = 'pixnxt_album_swap_marks_seen';

export const SWAP_MARKS_CHANGED_EVENT = 'pixnxt-album-swap-marks-changed';
export const SWAP_MARKS_SEEN_CHANGED_EVENT = 'pixnxt-album-swap-marks-seen-changed';

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

function readSeen() {
    try {
        const raw = localStorage.getItem(SEEN_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function writeSeen(data) {
    try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(data));
    } catch {
        /* ignore */
    }
}

export function notifySwapMarksSeenChanged(albumId) {
    try {
        window.dispatchEvent(
            new CustomEvent(SWAP_MARKS_SEEN_CHANGED_EVENT, { detail: { albumId } })
        );
    } catch {
        /* ignore */
    }
}

export function isSwapMarkUnseen(albumId, mark) {
    if (!albumId || !mark?.id) return false;
    const seenAt = readSeen()[albumId]?.[mark.id];
    if (!seenAt) return true;
    const stamp = mark.createdAt;
    if (!stamp) return false;
    return new Date(stamp).getTime() > new Date(seenAt).getTime();
}

export function countUnseenSwapMarks(albumId, marks) {
    return (marks || []).filter((mark) => isSwapMarkUnseen(albumId, mark)).length;
}

export function markSwapMarksSeen(albumId, marks) {
    if (!albumId || !marks?.length) return;
    const all = readSeen();
    const bucket = { ...(all[albumId] || {}) };
    const now = new Date().toISOString();
    marks.forEach((mark) => {
        if (mark?.id) bucket[mark.id] = now;
    });
    all[albumId] = bucket;
    writeSeen(all);
    notifySwapMarksSeenChanged(albumId);
}

/** All swappable photo slots for the album layout. */
export function enumerateAlbumPhotoSlots(
    totalPages,
    gridLayout = 'two-page',
    spreadOpts = null,
    album = null
) {
    const opts = getSpreadContext(album, totalPages);
    const merged = spreadOpts
        ? { ...opts, ...spreadOpts, totalPages: spreadOpts.totalPages ?? totalPages }
        : opts;
    const slots = [];
    if (merged.hasCovers && totalPages > 0) {
        slots.push({ pageNum: 0, cellId: 0, label: 'Cover' });
    }

    const whole = gridLayout === 'whole-spread';
    const totalSpreads = getTotalSpreads(totalPages, merged);
    for (let spreadIndex = 0; spreadIndex < totalSpreads; spreadIndex += 1) {
        const { left, right } = getSpreadPages(spreadIndex, totalPages, merged);
        const spreadNum = spreadIndex + 1;
        if (isEndHalfSpreadLeftPage(left, totalPages, merged)) {
            slots.push({
                pageNum: left,
                cellId: 1,
                spreadLeft: left,
                label: 'Back cover',
            });
            continue;
        }
        if (whole) {
            slots.push({
                pageNum: left,
                cellId: 1,
                spreadLeft: left,
                whole: true,
                label: `Spread ${spreadNum} · Whole`,
            });
            continue;
        }
        slots.push({
            pageNum: left,
            cellId: 1,
            spreadLeft: left,
            label: `Spread ${spreadNum} · Left`,
        });
        if (right > left && right < totalPages) {
            slots.push({
                pageNum: right,
                cellId: 2,
                spreadLeft: left,
                label: `Spread ${spreadNum} · Right`,
            });
        }
    }
    return slots;
}

export function getSlotThumbnail(albumId, slot, { showSamples = false, album, totalPages = 0 } = {}) {
    if (!albumId || !slot) return null;

    const pages = totalPages || album?.page_count || 1;
    const spreadCtx = getSpreadContext(album, pages);
    const { pageNum, cellId } = slot;
    if (pageNum === 0 && spreadCtx.hasCovers) {
        return (
            getPagePhotoOverride(albumId, 0) ||
            album?.cover_image_url ||
            (showSamples ? getSampleImageForPage(0) : null)
        );
    }

    const spreadLeft = slot.spreadLeft ?? getSpreadLeftPageIndex(pageNum, spreadCtx);
    if (slot.whole) {
        const spreadSrc = getSpreadPhotoOverride(albumId, spreadLeft);
        if (spreadSrc) return spreadSrc;
    }

    const photoIndex =
        slot.photoIndex ??
        getProofCellPhotoIndex(pageNum, cellId || 1, pages, spreadCtx);
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

function swapMarkPointKey(pt) {
    return pt && Number.isFinite(pt.xPct) && Number.isFinite(pt.yPct)
        ? `${pt.pageNum ?? ''}:${pt.cellId ?? ''}:${pt.xPct.toFixed(2)}:${pt.yPct.toFixed(2)}`
        : null;
}

export function addSwapMark(albumId, slotA, slotB, options = {}) {
    if (!albumId || !slotA || !slotB) return null;
    const keyA = makeSlotKey(slotA.pageNum, slotA.cellId);
    const keyB = makeSlotKey(slotB.pageNum, slotB.cellId);
    const sameSlot = keyA === keyB;
    const pointA = options?.pointA || null;
    const pointB = options?.pointB || null;
    if (sameSlot && (!pointA || !pointB)) return null;

    const all = readAll();
    const list = [...(all[albumId] || [])];
    const nextPointAKey = swapMarkPointKey(pointA);
    const nextPointBKey = swapMarkPointKey(pointB);

    /** Allow many marks on the same spread pair — only skip exact duplicate pin positions. */
    const duplicate = list.find((m) => {
        const pairMatches = (m.a === keyA && m.b === keyB) || (m.a === keyB && m.b === keyA);
        if (!pairMatches) return false;
        const forward = m.a === keyA && m.b === keyB;
        const existingAKey = swapMarkPointKey(forward ? m.pointA : m.pointB);
        const existingBKey = swapMarkPointKey(forward ? m.pointB : m.pointA);
        return existingAKey === nextPointAKey && existingBKey === nextPointBKey;
    });
    if (duplicate) return duplicate;

    const mark = {
        id: `swap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        a: keyA,
        b: keyB,
        labelA: slotA.label || getSlotLabel(slotA.pageNum, slotA.cellId, slotA.whole),
        labelB: slotB.label || getSlotLabel(slotB.pageNum, slotB.cellId, slotB.whole),
        locked: true,
        pointA,
        pointB,
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
    { gridLayout = 'two-page', album = null } = {}
) {
    const spreadNum = spreadNumberFromLeftPage(spreadLeft, getSpreadContext(album, totalPages));
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
export function getSlotLabel(pageNum, cellId = 0, whole = false, totalPages = 99, album = null) {
    const spreadCtx = getSpreadContext(album, totalPages);
    const spreadOpts = { ...spreadCtx, totalPages };
    const cid = cellId ?? 0;

    if (spreadCtx.hasCovers) {
        if (pageNum === 0 || (pageNum === 1 && cid === 0)) return 'Cover';
        if (totalPages != null && isEndHalfSpreadLeftPage(pageNum, totalPages, spreadOpts)) {
            return 'Back cover';
        }
        const { left: endLeft } = getEndSpreadPageIndices(totalPages);
        if (pageNum === endLeft && cid === 1) return 'Back cover';
        if (isInsideCoverLeftPage(pageNum, totalPages, spreadOpts)) return 'Inside cover';
        if (isInsideCoverRightPage(pageNum, totalPages, spreadOpts)) {
            return cid === 2 ? 'Spread 1 · Right' : 'Inside cover';
        }
        if (isPreBackHalfSpreadLeftPage(pageNum, totalPages, spreadOpts)) {
            const spreadNum = spreadNumberFromLeftPage(pageNum, spreadCtx);
            return `Spread ${spreadNum} · Left`;
        }
    }

    const spreadLeft = getSpreadLeftPageIndex(pageNum, spreadCtx);
    const spreadNum = spreadNumberFromLeftPage(spreadLeft, spreadCtx);
    if (whole) return `Spread ${spreadNum} · Whole`;
    if (cid === 1 || pageNum === spreadLeft) return `Spread ${spreadNum} · Left`;
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
    const key = makeSlotKey(pageNum, cellId);

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

/** All swap mark details for a slot (oldest -> newest). */
export function getSwapMarksForSlot(
    marks,
    pageNum,
    cellId = 0,
    { placementMode = 'single', spreadLeft = null, gridLayout = 'two-page' } = {}
) {
    const key = makeSlotKey(pageNum, cellId);

    return (marks || []).flatMap((mark) => {
        const isA = mark.a === key;
        const isB = mark.b === key;
        if (!isA && !isB) return [];

        const marksForPair = (marks || []).filter(
            (m) => m.a === key || m.b === key
        );
        const markIndex = marksForPair.findIndex((m) => m.id === mark.id);
        const markNum = markIndex >= 0 ? markIndex + 1 : marksForPair.length;

        const mapEndpoint = (endpointLabel) => {
            const endpointIsA = endpointLabel === 'A';
            const slotLabel =
                (endpointIsA ? mark.labelA : mark.labelB) ||
                resolveSlotLabel(key, gridLayout);
            const partnerLabel =
                (endpointIsA ? mark.labelB : mark.labelA) ||
                resolveSlotLabel(endpointIsA ? mark.b : mark.a, gridLayout);
            const point = endpointIsA ? mark.pointA : mark.pointB;
            const pinLabel =
                marksForPair.length > 1 ? `${endpointLabel}${markNum}` : endpointLabel;
            return {
                slotLabel,
                partnerLabel,
                title: `Swap · ${slotLabel}`,
                subtitle: `with ${partnerLabel}`,
                locked: mark.locked !== false,
                markId: mark.id,
                point,
                pinLabel,
                pinKey: `${mark.id}-${endpointLabel}`,
            };
        };

        if (isA && isB) {
            return [mapEndpoint('A'), mapEndpoint('B')];
        }
        return [mapEndpoint(isA ? 'A' : 'B')];
    });
}

export function slotsMatch(a, b) {
    if (!a || !b) return false;
    if (a.whole && b.whole) {
        if ((a.spreadLeft ?? a.pageNum) !== (b.spreadLeft ?? b.pageNum)) return false;
        return a.pageNum === b.pageNum && (a.cellId ?? 0) === (b.cellId ?? 0);
    }
    if (a.swapScope === 'both' || b.swapScope === 'both') {
        return (a.spreadLeft ?? a.pageNum) === (b.spreadLeft ?? b.pageNum);
    }
    return a.pageNum === b.pageNum && (a.cellId ?? 0) === (b.cellId ?? 0);
}

/** Whether a click placement belongs to the swap target chosen in the swap book. */
export function placementMatchesTargetSlot(placement, targetSlot, totalPages, album = null) {
    if (!placement || !targetSlot) return false;
    if (slotsMatch(placement, targetSlot)) return true;
    const spreadCtx = getSpreadContext(album, totalPages);
    const placementLeft =
        placement.spreadLeft ??
        getSpreadLeftPageIndex(placement.pageNum, { ...spreadCtx, totalPages });
    const targetLeft =
        targetSlot.spreadLeft ??
        getSpreadLeftPageIndex(targetSlot.pageNum, { ...spreadCtx, totalPages });
    if (targetSlot.whole || targetSlot.swapScope === 'both') {
        return placementLeft === targetLeft;
    }
    return false;
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

/**
 * Which side of the open book spread should show the swap picker.
 * Click/hover on the left page → picker on the right; right page → picker on the left.
 */
export function getSwapPickerDockSide(originSlot) {
    if (!originSlot) return null;

    const label = String(originSlot.label || '');
    if (/\bRight\b/i.test(label)) return 'left';
    if (/\bLeft\b/i.test(label)) return 'right';

    const originX = typeof originSlot.xPct === 'number' ? originSlot.xPct : null;
    if (originX != null) {
        return originX < 50 ? 'right' : 'left';
    }

    if (originSlot.cellId === 2) return 'left';
    if (originSlot.cellId === 1) return 'right';
    return 'right';
}

/** Which swap scopes to show in the execute modal (left / right / both, or both-only). */
export function getAvailableSwapScopes(
    albumId,
    slot,
    totalPages,
    gridLayout = 'two-page',
    album = null
) {
    const spreadCtx = getSpreadContext(album, totalPages);
    if (!slot || (slot.pageNum === 0 && spreadCtx.hasCovers)) return ['cover'];
    const spreadLeft = slot.spreadLeft ?? getSpreadLeftPageIndex(slot.pageNum, spreadCtx);
    if (spreadHasWholeGridPhoto(albumId, spreadLeft, totalPages, gridLayout)) {
        return ['both'];
    }
    const scopes = ['left'];
    const rightPage = spreadLeft + 1;
    const endHalf = isEndHalfSpreadLeftPage(spreadLeft, totalPages, spreadCtx);
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
    { gridLayout = 'two-page', album = null } = {}
) {
    const spreadCtx = getSpreadContext(album, totalPages);
    if (scope === 'cover' && spreadCtx.hasCovers) {
        return { pageNum: 0, cellId: 0, spreadLeft: 0, swapScope: 'cover', label: 'Cover' };
    }
    const spreadNum = spreadNumberFromLeftPage(spreadLeft, spreadCtx);
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

function enumerateSpreadBothTargets(totalPages, originSpreadLeft, album = null) {
    const spreadCtx = getSpreadContext(album, totalPages);
    const targets = [];
    const totalSpreads = getTotalSpreads(totalPages, spreadCtx);
    for (let spreadIndex = 0; spreadIndex < totalSpreads; spreadIndex += 1) {
        const { left } = getSpreadPages(spreadIndex, totalPages, spreadCtx);
        if (left === originSpreadLeft) continue;
        const spreadNum = spreadIndex + 1;
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
export function isWholeGridSwapSlot(
    albumId,
    slot,
    totalPages,
    gridLayout = 'two-page',
    album = null
) {
    if (!slot || slot.pageNum === 0) return false;
    if (slot.whole || slot.swapScope === 'both') return true;
    const spreadCtx = getSpreadContext(album, totalPages);
    const spreadLeft = slot.spreadLeft ?? getSpreadLeftPageIndex(slot.pageNum, spreadCtx);
    return spreadHasWholeGridPhoto(albumId, spreadLeft, totalPages, gridLayout);
}

/** Normalize a slot to whole-spread form when it uses spread storage. */
export function normalizeWholeGridSwapSlot(slot, totalPages, album = null) {
    if (!slot || slot.pageNum === 0) return slot;
    const spreadCtx = getSpreadContext(album, totalPages);
    const spreadLeft = slot.spreadLeft ?? getSpreadLeftPageIndex(slot.pageNum, spreadCtx);
    const spreadNum = spreadNumberFromLeftPage(spreadLeft, spreadCtx);
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
    gridLayout = 'two-page',
    album = null
) {
    if (!originSlot) return [];
    const spreadCtx = getSpreadContext(album, totalPages);

    if (originSlot.pageNum === 0 && spreadCtx.hasCovers) {
        return enumerateAlbumPhotoSlots(totalPages, gridLayout, spreadCtx, album).filter(
            (slot) => slot.pageNum === 0 && !slotsMatch(slot, originSlot)
        );
    }

    const originSpreadLeft =
        originSlot.spreadLeft ?? getSpreadLeftPageIndex(originSlot.pageNum, spreadCtx);

    if (isWholeGridSwapSlot(albumId, originSlot, totalPages, gridLayout, album)) {
        const targets = [];
        const totalSpreads = getTotalSpreads(totalPages, spreadCtx);
        for (let spreadIndex = 0; spreadIndex < totalSpreads; spreadIndex += 1) {
            const { left } = getSpreadPages(spreadIndex, totalPages, spreadCtx);
            if (left === originSpreadLeft) continue;
            if (!spreadHasWholeGridPhoto(albumId, left, totalPages, gridLayout)) continue;
            const spreadNum = spreadIndex + 1;
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
        return enumerateSpreadBothTargets(totalPages, originSpreadLeft, album);
    }

    const all = enumerateAlbumPhotoSlots(totalPages, gridLayout, spreadCtx, album);
    return all.filter((slot) => {
        if (slotsMatch(slot, originSlot)) return false;
        if (slot.pageNum === 0 || slot.whole) return false;
        const targetLeft =
            slot.spreadLeft ?? getSpreadLeftPageIndex(slot.pageNum, spreadCtx);
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
    albumId = null,
    album = null
) {
    if (!originSlot) return [];
    const originKind = slotSwapKind(originSlot);
    const spreadCtx = getSpreadContext(album, totalPages);

    if (originKind === 'cover' && spreadCtx.hasCovers) {
        return enumerateAlbumPhotoSlots(totalPages, gridLayout, spreadCtx, album).filter(
            (slot) => slot.pageNum === 0 && !slotsMatch(slot, originSlot)
        );
    }

    if (albumId && isWholeGridSwapSlot(albumId, originSlot, totalPages, gridLayout, album)) {
        return enumerateSwapExecuteCandidates(albumId, originSlot, totalPages, gridLayout, album);
    }

    const originSpreadLeft =
        originSlot.spreadLeft ?? getSpreadLeftPageIndex(originSlot.pageNum, spreadCtx);

    if (scope === 'both' || originKind === 'both') {
        return enumerateSpreadBothTargets(totalPages, originSpreadLeft, album);
    }

    return enumerateSwapExecuteCandidates(albumId, originSlot, totalPages, gridLayout, album);
}

/** Thumbnail for swap picker — whole spread preview when swapping both pages. */
export function getSwapTargetThumbnail(albumId, slot, { showSamples = false, album, totalPages = 0 } = {}) {
    if (!albumId || !slot) return null;
    if (slot.swapScope !== 'both' && !slot.whole) {
        return getSlotThumbnail(albumId, slot, { showSamples, album, totalPages });
    }
    const spreadCtx = getSpreadContext(album, totalPages);
    const spreadLeft = slot.spreadLeft ?? getSpreadLeftPageIndex(slot.pageNum, spreadCtx);
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
