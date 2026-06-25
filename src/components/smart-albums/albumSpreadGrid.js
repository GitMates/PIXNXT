/**
 * Two-photo spread: one full-page slot on the left, one on the right.
 * Cell 1 → left page photo index; cell 2 → right page photo index.
 */

import {
    getEndSpreadPageIndices,
    getSpreadPages,
    isCoverInsidePage,
    normalizeSpreadOpts,
    usesReservedEndSpread,
} from './albumSpreadUtils';

export const PROOF_SLOT_COUNT = 2;

export const PROOF_VINO_RATIOS = {
    gutterSpread: 0.012,
};

export function getProofSpreadGutter(pageWidth, pageHeight) {
    const spreadW = pageWidth * 2;
    return Math.max(4, Math.round(Math.min(spreadW, pageHeight) * PROOF_VINO_RATIOS.gutterSpread));
}

export function calculateProofLeftPageGrid(pageWidth, pageHeight) {
    const gutter = getProofSpreadGutter(pageWidth, pageHeight);
    return {
        gutter,
        pageWidth,
        pageHeight,
        cells: [{ id: 1, x: 0, y: 0, width: pageWidth, height: pageHeight }],
    };
}

export function calculateProofRightPageGrid(pageWidth, pageHeight) {
    const gutter = getProofSpreadGutter(pageWidth, pageHeight);
    return {
        gutter,
        pageWidth,
        pageHeight,
        cells: [{ id: 2, x: 0, y: 0, width: pageWidth, height: pageHeight }],
    };
}

/**
 * Left page of a spread uses slot 1.
 * No covers: pages 0|2|4…
 * With covers: front cover page 0, inner 2|4|… through the last spread.
 */
export function isProofLeftGridPage(pageNum, { showCover = true, hasCovers, totalPages } = {}) {
    if (pageNum < 0) return false;
    const covers = hasCovers ?? showCover;
    if (!covers) return pageNum % 2 === 0;
    if (pageNum === 0) return false;
    if (totalPages != null && usesReservedEndSpread(totalPages, { hasCovers: covers, showCover: covers })) {
        const { left: endLeft } = getEndSpreadPageIndices(totalPages);
        if (pageNum === endLeft) return true;
    }
    return pageNum >= 2 && pageNum % 2 === 0;
}

export function isProofRightGridPage(pageNum, { showCover = true, hasCovers, totalPages } = {}) {
    if (pageNum < 0) return false;
    const covers = hasCovers ?? showCover;
    if (!covers) return pageNum % 2 === 1;
    if (pageNum === 1) return true;
    if (totalPages != null && usesReservedEndSpread(totalPages, { hasCovers: covers, showCover: covers })) {
        const { right } = getEndSpreadPageIndices(totalPages);
        if (pageNum === right) return true;
    }
    return pageNum >= 3 && pageNum % 2 === 1;
}

export function getSpreadLeftPageIndex(pageNum, opts = {}) {
    const { showCover, hasCovers } =
        opts.hasCovers != null
            ? { showCover: opts.hasCovers === true, hasCovers: opts.hasCovers === true }
            : { showCover: opts.showCover === true, hasCovers: opts.showCover === true };
    const totalPages = opts.totalPages;
    if (pageNum <= 0) return 0;
    if (hasCovers && totalPages != null && totalPages > 0) {
        const { left: endLeft } = getEndSpreadPageIndices(totalPages);
        if (pageNum >= endLeft) return endLeft;
        if (showCover && pageNum <= 1) return 0;
        return pageNum % 2 === 0 ? pageNum : pageNum - 1;
    }
    if (!showCover) {
        return pageNum % 2 === 0 ? pageNum : pageNum - 1;
    }
    return pageNum % 2 === 0 ? pageNum : pageNum - 1;
}

/** Resolve remove-at page from any page/cell on a spread. */
export function resolveSpreadRemoveAt(pageNum, opts = {}) {
    const spreadOpts = normalizeSpreadOpts(opts);
    const totalPages = opts.totalPages ?? 0;
    return getSpreadLeftPageIndex(pageNum, { ...spreadOpts, totalPages });
}

/**
 * Storage page index for a flipbook leaf / slot.
 * Auto-place stores photos at physical page keys (0, 1, 2, …) — display must use the same index.
 */
export function getProofCellPhotoIndex(pageNum, cellId, totalPages, opts = {}) {
    void cellId;
    const pages = opts.totalPages ?? totalPages ?? 1;
    return Math.min(Math.max(0, pageNum), Math.max(0, pages - 1));
}

export function getProofSpreadSlotPageIndices(leftPage, totalPages, options = {}) {
    const spreadOpts = normalizeSpreadOpts({
        ...options,
        totalPages: options.totalPages ?? totalPages,
    });
    const pages = spreadOpts.totalPages ?? totalPages ?? 1;
    const max = Math.max(0, pages - 1);
    const left = Math.min(Math.max(0, leftPage), max);

    if (!spreadOpts.hasCovers) {
        return [left, Math.min(left + 1, max)];
    }

    return Array.from({ length: PROOF_SLOT_COUNT }, (_, i) => {
        const cellId = i + 1;
        const spreadLeft = getSpreadLeftPageIndex(left, { ...spreadOpts, totalPages: pages });
        return Math.min(spreadLeft + (cellId - 1), max);
    });
}

/** Right page index for a spread starting at `leftPage`. */
export function getSpreadRightPageIndex(leftPage, totalPages, options) {
    const [left, right] = getProofSpreadSlotPageIndices(leftPage, totalPages, options);
    void left;
    return right;
}

export const PROOF_CELL_LABELS = {
    1: 'Left page',
    2: 'Right page',
};

export function getProofLeftPageGridPercent() {
    return {
        cells: [{ id: 1, left: '0%', top: '0%', width: '100%', height: '100%' }],
    };
}

export function getProofRightPageGridPercent() {
    return {
        cells: [{ id: 2, left: '0%', top: '0%', width: '100%', height: '100%' }],
    };
}

export function formatProofLeftGridSummary(pageWidth, pageHeight) {
    const { cells } = calculateProofLeftPageGrid(pageWidth, pageHeight);
    const [a] = cells;
    return {
        image1: { width: a.width, height: a.height },
    };
}
