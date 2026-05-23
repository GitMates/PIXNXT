/**
 * Two-photo spread: one full-page slot on the left, one on the right.
 * Cell 1 → left page photo index; cell 2 → right page photo index.
 */

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
export function isProofLeftGridPage(pageNum, { showCover = true } = {}) {
    if (pageNum <= 0) return false;
    if (!showCover) return pageNum % 2 === 0;
    return pageNum % 2 === 1;
}

export function isProofRightGridPage(pageNum, { showCover = true } = {}) {
    if (pageNum <= 0) return false;
    if (!showCover) return pageNum % 2 === 1;
    return pageNum % 2 === 0;
}

export function getSpreadLeftPageIndex(pageNum, { showCover = true } = {}) {
    if (pageNum <= 0) return 0;
    if (showCover) {
        return pageNum % 2 === 1 ? pageNum : pageNum - 1;
    }
    return pageNum % 2 === 0 ? pageNum : pageNum - 1;
}

/** Photo page index for grid cell 1 (left) or 2 (right). */
export function getProofCellPhotoIndex(pageNum, cellId, totalPages, { showCover = true } = {}) {
    const left = getSpreadLeftPageIndex(pageNum, { showCover });
    const idx = left + (cellId - 1);
    const max = Math.max(0, totalPages - 1);
    return Math.min(Math.max(0, idx), max);
}

export function getProofSpreadSlotPageIndices(leftPage, totalPages, options) {
    return Array.from({ length: PROOF_SLOT_COUNT }, (_, i) =>
        getProofCellPhotoIndex(leftPage, i + 1, totalPages, options)
    );
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
