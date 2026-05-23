/**
 * Proof Albums "ABI VINO" spread proportions (measured from reference layout).
 * Spread width = 2 × pageWidth, spread height = pageHeight.
 *
 * Full spread horizontal split:
 *   - Left page (images 1 & 2): 50% of spread width (= 100% of one page)
 *   - Right page (images 3–5): 50% of spread width
 *
 * Image 1: 21% of spread width, 100% spread height
 * Image 2: 29% of spread width, 86% spread height (vertically centered)
 * Image 3: 50% spread width, ~46% spread height
 * Images 4 & 5: 25% spread width each, remaining height
 */

export const PROOF_VINO_RATIOS = {
    spreadLeftShare: 0.5,
    img1SpreadWidth: 0.21,
    img2SpreadWidth: 0.29,
    img2SpreadHeight: 0.86,
    img3SpreadHeight: 0.46,
    gutterSpread: 0.012,
};

export function getProofSpreadGutter(pageWidth, pageHeight) {
    const spreadW = pageWidth * 2;
    return Math.max(4, Math.round(Math.min(spreadW, pageHeight) * PROOF_VINO_RATIOS.gutterSpread));
}

/**
 * @param {number} pageWidth - single page width (px)
 * @param {number} pageHeight - page height (px)
 * @returns {{ gutter: number, cells: Array<{ id: number, x: number, y: number, width: number, height: number }> }}
 */
export function calculateProofLeftPageGrid(pageWidth, pageHeight) {
    const gutter = getProofSpreadGutter(pageWidth, pageHeight);
    const innerW = pageWidth - gutter;
    const w1 = Math.floor(innerW * (PROOF_VINO_RATIOS.img1SpreadWidth / PROOF_VINO_RATIOS.spreadLeftShare));
    const w2 = innerW - w1;
    const h2 = Math.floor(pageHeight * PROOF_VINO_RATIOS.img2SpreadHeight);
    const y2 = Math.floor((pageHeight - h2) / 2);

    return {
        gutter,
        pageWidth,
        pageHeight,
        cells: [
            { id: 1, x: 0, y: 0, width: w1, height: pageHeight },
            { id: 2, x: w1 + gutter, y: y2, width: w2, height: h2 },
        ],
    };
}

/**
 * @param {number} pageWidth
 * @param {number} pageHeight
 */
export function calculateProofRightPageGrid(pageWidth, pageHeight) {
    const gutter = getProofSpreadGutter(pageWidth, pageHeight);

    const h3 = Math.floor(pageHeight * PROOF_VINO_RATIOS.img3SpreadHeight);
    const hBottom = pageHeight - h3 - gutter;
    const w4 = Math.floor((pageWidth - gutter) / 2);
    const w5 = pageWidth - gutter - w4;

    return {
        gutter,
        pageWidth,
        pageHeight,
        cells: [
            { id: 3, x: 0, y: 0, width: pageWidth, height: h3 },
            { id: 4, x: 0, y: h3 + gutter, width: w4, height: hBottom },
            { id: 5, x: w4 + gutter, y: h3 + gutter, width: w5, height: hBottom },
        ],
    };
}

/** Left page of an inner spread (pages 1, 3, 5, …) uses the two-cell grid. */
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

/** Left page index of the spread that contains `pageNum`. */
export function getSpreadLeftPageIndex(pageNum, { showCover = true } = {}) {
    if (pageNum <= 0) return 0;
    if (showCover) {
        return pageNum % 2 === 1 ? pageNum : pageNum - 1;
    }
    return pageNum % 2 === 0 ? pageNum : pageNum - 1;
}

/**
 * Photo index for grid cell 1–5 across the whole spread (left + right page).
 * Cell 1–2 sit on the left page; 3–5 on the right — indices must not restart at the right page.
 */
export function getProofCellPhotoIndex(pageNum, cellId, totalPages, { showCover = true } = {}) {
    const left = getSpreadLeftPageIndex(pageNum, { showCover });
    const idx = left + (cellId - 1);
    const max = Math.max(0, totalPages - 1);
    return Math.min(Math.max(0, idx), max);
}

/** Page indices for proof slots 1–5 on the spread whose left page is `leftPage`. */
export function getProofSpreadSlotPageIndices(leftPage, totalPages, options) {
    return [1, 2, 3, 4, 5].map((cellId) =>
        getProofCellPhotoIndex(leftPage, cellId, totalPages, options)
    );
}

export const PROOF_CELL_LABELS = {
    1: 'Tall left',
    2: 'Framed portrait',
    3: 'Hero',
    4: 'Thumbnail left',
    5: 'Thumbnail right',
};

/** Percent-based layout (scales with flipbook page size; book dimensions unchanged). */
export function getProofLeftPageGridPercent() {
    const gutterPct = PROOF_VINO_RATIOS.gutterSpread * 100;
    const innerPct = 100 - gutterPct;
    const w1Pct = innerPct * (PROOF_VINO_RATIOS.img1SpreadWidth / PROOF_VINO_RATIOS.spreadLeftShare);
    const w2Pct = innerPct - w1Pct;
    const h2Pct = PROOF_VINO_RATIOS.img2SpreadHeight * 100;
    const y2Pct = (100 - h2Pct) / 2;

    return {
        cells: [
            { id: 1, left: '0%', top: '0%', width: `${w1Pct}%`, height: '100%' },
            {
                id: 2,
                left: `calc(${w1Pct}% + ${gutterPct}%)`,
                top: `${y2Pct}%`,
                width: `${w2Pct}%`,
                height: `${h2Pct}%`,
                framed: true,
            },
        ],
    };
}

export function getProofRightPageGridPercent() {
    const h3Pct = PROOF_VINO_RATIOS.img3SpreadHeight * 100;
    const hBottomPct = 100 - h3Pct - PROOF_VINO_RATIOS.gutterSpread * 100;
    const halfPct = (100 - PROOF_VINO_RATIOS.gutterSpread * 100) / 2;
    const gutterPct = PROOF_VINO_RATIOS.gutterSpread * 100;

    return {
        cells: [
            { id: 3, left: '0%', top: '0%', width: '100%', height: `${h3Pct}%` },
            {
                id: 4,
                left: '0%',
                top: `calc(${h3Pct}% + ${gutterPct}%)`,
                width: `${halfPct}%`,
                height: `${hBottomPct}%`,
            },
            {
                id: 5,
                left: `calc(${halfPct}% + ${gutterPct}%)`,
                top: `calc(${h3Pct}% + ${gutterPct}%)`,
                width: `${halfPct}%`,
                height: `${hBottomPct}%`,
            },
        ],
    };
}

/**
 * Pixel sizes for a given book page (for tooling / tests).
 * @example calculateProofLeftPageGrid(520, 560) → image1: 218×560, image2: 302×481 at y≈40
 */
export function formatProofLeftGridSummary(pageWidth, pageHeight) {
    const { cells } = calculateProofLeftPageGrid(pageWidth, pageHeight);
    const [a, b] = cells;
    return {
        image1: { width: a.width, height: a.height },
        image2: { width: b.width, height: b.height, top: b.y },
    };
}
