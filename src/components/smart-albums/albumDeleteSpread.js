/**
 * Delete spread — resolves the storage left-page index for the spread shown in the menu.
 * UI "Spread 3" on a cover album → spreadIndex 2 → spreadLeft 4 → removes pages 4 and 5.
 */

import { MIN_ALBUM_PAGES, PAGES_PER_SPREAD } from './albumPageStorage';
import { getSpreadLeftPageIndex } from './albumSpreadGrid';
import {
    formatOverviewSpreadLabel,
    getSpreadPages,
    getTotalSpreads,
    isEndHalfSpreadLeftPage,
    isFrontCoverSpreadLeft,
    isPreBackHalfSpreadLeftPage,
    normalizeSpreadOpts,
    pageToSpreadIndex,
} from './albumSpreadUtils';

/** Spread index from menu label, matching flipbook counter (e.g. "Spread 3" → index 2). */
export function spreadIndexFromMenuLabel(label, totalPages, opts = {}) {
    const m = String(label || '').match(/Spread\s+(\d+)/i);
    if (!m) return null;
    const displayNum = parseInt(m[1], 10);
    if (!Number.isFinite(displayNum) || displayNum < 1) return null;

    const pages = Math.max(0, Number(totalPages) || 0);
    const spreadOpts = normalizeSpreadOpts(opts);
    const totalSpreads = getTotalSpreads(pages, spreadOpts);
    const displayStr = String(displayNum);

    for (let idx = 0; idx < totalSpreads; idx += 1) {
        if (formatOverviewSpreadLabel(idx, pages, spreadOpts) === displayStr) {
            return idx;
        }
    }

    // Cover albums: "Spread 2" = index 1 (cover is not "Spread 1")
    const fallbackIdx = displayNum - 1;
    if (fallbackIdx >= 0 && fallbackIdx < totalSpreads) {
        return fallbackIdx;
    }
    return null;
}

/** Left storage page for a spread index. */
export function spreadLeftFromSpreadIndex(spreadIndex, totalPages, opts = {}) {
    const idx = Number(spreadIndex);
    if (!Number.isFinite(idx)) return null;
    return getSpreadPages(idx, totalPages, normalizeSpreadOpts(opts)).left;
}

/** Left storage page from menu label (e.g. "Spread 3 · Left" → 4). */
export function spreadLeftFromMenuLabel(label, totalPages, opts = {}) {
    const spreadIndex = spreadIndexFromMenuLabel(label, totalPages, opts);
    if (spreadIndex == null) return null;
    return spreadLeftFromSpreadIndex(spreadIndex, totalPages, opts);
}

/** Spread index from a photo-slot click (matches flipbook counter). */
export function spreadIndexForSlot(slot, totalPages, opts = {}) {
    if (!slot) return null;
    const spreadOpts = normalizeSpreadOpts(opts);
    const spreadCtx = { ...spreadOpts, totalPages };

    const fromSpreadLeft = Number(slot.spreadLeft);
    if (Number.isFinite(fromSpreadLeft)) {
        return pageToSpreadIndex(fromSpreadLeft, spreadCtx);
    }

    const pageNum = Number(slot.pageNum);
    if (!Number.isFinite(pageNum)) return null;
    const left = getSpreadLeftPageIndex(pageNum, spreadCtx);
    return pageToSpreadIndex(left, spreadCtx);
}

/** Left storage page from a photo-slot click. */
export function spreadLeftForSlot(slot, totalPages, opts = {}) {
    const spreadIndex = spreadIndexForSlot(slot, totalPages, opts);
    if (spreadIndex == null) return null;
    return spreadLeftFromSpreadIndex(spreadIndex, totalPages, opts);
}

/**
 * Resolve which spread to delete for the popup menu.
 * Prefer the clicked slot's spreadLeft (authoritative); fall back to menu label.
 */
export function resolveDeleteSpreadTarget(slot, menuLabel, totalPages, opts = {}) {
    const spreadOpts = normalizeSpreadOpts(opts);
    const spreadCtx = { ...spreadOpts, totalPages };

    let spreadIndex = null;
    let removeAtLeft = null;

    const slotLeft = Number(slot?.spreadLeft);
    if (Number.isFinite(slotLeft)) {
        removeAtLeft = slotLeft;
        spreadIndex = pageToSpreadIndex(slotLeft, spreadCtx);
    }

    if (spreadIndex == null && menuLabel) {
        spreadIndex = spreadIndexFromMenuLabel(menuLabel, totalPages, opts);
        if (spreadIndex != null) {
            removeAtLeft = spreadLeftFromSpreadIndex(spreadIndex, totalPages, spreadOpts);
        }
    }

    if (spreadIndex == null || removeAtLeft == null) return null;

    return { spreadIndex, spreadLeft: removeAtLeft, removeAtLeft };
}

/** @deprecated Use resolveDeleteSpreadTarget */
export function resolveDeleteSpreadLeft(slot, menuLabel, totalPages, opts = {}) {
    return resolveDeleteSpreadTarget(slot, menuLabel, totalPages, opts)?.spreadLeft ?? null;
}

/** Whether a flipbook spread index may be deleted. */
export function canDeleteSpreadAtSpreadIndex(spreadIndex, totalPages, opts = {}) {
    const left = spreadLeftFromSpreadIndex(spreadIndex, totalPages, opts);
    if (left == null) return false;
    return canDeleteSpreadAtLeftPage(left, totalPages, opts);
}

/** Whether the spread starting at spreadLeft may be deleted. */
export function canDeleteSpreadAtLeftPage(spreadLeft, totalPages, opts = {}) {
    const left = Number(spreadLeft);
    if (!Number.isFinite(left)) return false;

    const spreadOpts = normalizeSpreadOpts(opts);
    if (spreadOpts.hasCovers && isFrontCoverSpreadLeft(left, spreadOpts)) return false;
    if (isPreBackHalfSpreadLeftPage(left, totalPages, spreadOpts)) return false;
    if (isEndHalfSpreadLeftPage(left, totalPages, spreadOpts)) return false;

    const minPages = spreadOpts.hasCovers ? MIN_ALBUM_PAGES : 2;
    return totalPages - PAGES_PER_SPREAD >= minPages;
}
