/**
 * Two-photo spread: one full-page slot on the left, one on the right.
 * Cell 1 → left page photo index; cell 2 → right page photo index.
 */

import {
    getEndSpreadPageIndices,
    isCoverInsidePage,
    normalizeSpreadOpts,
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

/** Left page of an inner spread (pages 1, 3, 5, …) uses slot 1. */
export function isProofLeftGridPage(pageNum, { showCover = true, totalPages } = {}) {
    if (pageNum <= 0) return false;
    if (showCover && totalPages != null && isCoverInsidePage(pageNum, totalPages, { showCover })) {
        return false;
    }
    if (!showCover) return pageNum % 2 === 0;
    return pageNum % 2 === 1;
}

export function isProofRightGridPage(pageNum, { showCover = true, totalPages } = {}) {
    if (pageNum <= 0) return false;
    if (showCover && totalPages != null && isCoverInsidePage(pageNum, totalPages, { showCover })) {
        return false;
    }
    if (!showCover) return pageNum % 2 === 1;
    return pageNum % 2 === 0;
}

export function getSpreadLeftPageIndex(pageNum, opts = {}) {
    const { showCover, hasCovers } =
        opts.hasCovers != null
            ? { showCover: opts.hasCovers !== false, hasCovers: opts.hasCovers !== false }
            : { showCover: opts.showCover !== false, hasCovers: opts.showCover !== false };
    const totalPages = opts.totalPages;
    if (pageNum <= 0) return 0;
    if (hasCovers && totalPages != null && totalPages > 0) {
        const { left: endLeft } = getEndSpreadPageIndices(totalPages);
        if (pageNum >= endLeft) return endLeft;
    }
    if (!showCover) {
        return pageNum % 2 === 0 ? pageNum : pageNum - 1;
    }
    /* With cover: inner pairs are 1|2, 3|4, … — left page is odd, right is even. */
    return pageNum % 2 === 1 ? pageNum : pageNum - 1;
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
