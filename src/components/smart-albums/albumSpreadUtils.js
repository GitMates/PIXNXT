/** Pages reserved for the back cover spread (left = photo, right = blank). */
export const RESERVED_END_PAGES = 2;

/** Pages are 0-based. With showCover: spread 0 = cover [0|1], inner pairs, then end [n-2|n-1]. */
export function getInnerPageCount(totalPages, { showCover = true } = {}) {
    if (totalPages <= 0) return 0;
    if (!showCover) return Math.max(0, totalPages - RESERVED_END_PAGES);
    return Math.max(0, totalPages - 2 - RESERVED_END_PAGES);
}

export function getEndSpreadPageIndices(totalPages) {
    if (totalPages < RESERVED_END_PAGES) {
        return { left: 0, right: Math.max(0, totalPages - 1) };
    }
    return {
        left: totalPages - RESERVED_END_PAGES,
        right: totalPages - 1,
    };
}

/** Index where new pages are inserted (before the end-cover spread). */
export function getPageInsertIndex(totalPages) {
    return Math.max(1, totalPages - RESERVED_END_PAGES);
}

/**
 * Index where pages are removed when shrinking — the inner spread immediately
 * before the reserved end cover (never removes end-cover pages).
 */
export function getPageRemoveIndex(totalPages, removeCount = RESERVED_END_PAGES) {
    const { left: endLeft } = getEndSpreadPageIndices(totalPages);
    return Math.max(1, endLeft - removeCount);
}

export function usesReservedEndSpread(totalPages, { showCover = true } = {}) {
    if (!showCover) return totalPages >= RESERVED_END_PAGES;
    return totalPages >= 1 + RESERVED_END_PAGES;
}

/** Page 1 — blank inside-cover leaf paired with the front cover (page 0). */
export function isCoverInsidePage(pageNum, totalPages, { showCover = true } = {}) {
    // Disabled special inside-cover handling; treat as normal page.
    // This forces page 1 to behave like a regular spread without a forced blank left page.
    return false;
}

/** First inner spread (pages 1|2): left is inside cover — never panoramic / whole-spread. */
export function isInsideCoverSpreadLeft(spreadLeftPage, totalPages, { showCover = true } = {}) {
    return (
        showCover &&
        spreadLeftPage === 1 &&
        isCoverInsidePage(1, totalPages, { showCover })
    );
}

/** Page 2 — first photo page beside the blank inside cover (page 1). */
export function isInsideCoverRightPage(pageNum, totalPages, { showCover = true } = {}) {
    return showCover && pageNum === 2 && isCoverInsidePage(1, totalPages, { showCover });
}

export function getSpreadPages(spreadIndex, totalPages, { showCover = true } = {}) {
    if (totalPages <= 0) {
        return { left: 0, right: 0 };
    }

    const totalSpreads = getTotalSpreads(totalPages, { showCover });
    const lastIdx = totalSpreads - 1;

    if (showCover && spreadIndex <= 0) {
        return { left: 0, right: Math.min(1, totalPages - 1) };
    }

    if (usesReservedEndSpread(totalPages, { showCover }) && spreadIndex === lastIdx) {
        return getEndSpreadPageIndices(totalPages);
    }

    const left = showCover ? spreadIndex * 2 - 1 : spreadIndex * 2;
    const maxInnerRight = usesReservedEndSpread(totalPages, { showCover })
        ? totalPages - RESERVED_END_PAGES - 1
        : totalPages - 1;

    return { left, right: Math.min(left + 1, maxInnerRight) };
}

export function getTotalSpreads(totalPages, { showCover = true } = {}) {
    if (totalPages <= 0) return 1;
    if (!showCover) {
        const inner = Math.max(0, totalPages - RESERVED_END_PAGES);
        const innerSpreads = Math.max(0, Math.ceil(inner / 2));
        return Math.max(1, innerSpreads + (totalPages >= RESERVED_END_PAGES ? 1 : 0));
    }
    if (!usesReservedEndSpread(totalPages, { showCover })) {
        return 1;
    }
    const innerSpreads = Math.ceil(getInnerPageCount(totalPages, { showCover }) / 2);
    return 1 + innerSpreads + 1;
}

/** Map flipbook page index → spread index (matches page-flip showCover spreads). */
export function pageToSpreadIndex(pageIndex, { showCover = true, totalPages = 0 } = {}) {
    if (pageIndex <= 0) return 0;
    if (usesReservedEndSpread(totalPages, { showCover })) {
        const { left: endLeft } = getEndSpreadPageIndices(totalPages);
        if (pageIndex >= endLeft) {
            return getTotalSpreads(totalPages, { showCover }) - 1;
        }
    }
    if (!showCover) return Math.max(0, Math.floor(pageIndex / 2));
    return Math.floor((pageIndex + 1) / 2);
}

/** Map spread index → book page index (left page of spread in flipbook) */
export function spreadIndexToPage(spreadIndex, { showCover = true, totalPages = 0 } = {}) {
    if (showCover && spreadIndex <= 0) return 0;
    const lastIdx = getTotalSpreads(totalPages, { showCover }) - 1;
    if (usesReservedEndSpread(totalPages, { showCover }) && spreadIndex === lastIdx) {
        return getEndSpreadPageIndices(totalPages).left;
    }
    if (!showCover) return Math.max(0, spreadIndex * 2);
    return Math.max(0, spreadIndex * 2 - 1);
}

/** Last spread indices — always the reserved end-cover spread when enabled. */
export function getLastSpreadInfo(totalPages, { showCover = true } = {}) {
    const spreadIndex = Math.max(0, getTotalSpreads(totalPages, { showCover }) - 1);
    const { left, right } = getSpreadPages(spreadIndex, totalPages, { showCover });
    const orphanInnerPage = usesReservedEndSpread(totalPages, { showCover });
    return { spreadIndex, left, right, orphanInnerPage };
}

/**
 * Role for end-spread half layout: photo on the left page, blank on the right.
 * @returns {'half-left' | 'half-blank' | null}
 */
export function getEndSpreadPageRole(
    pageNum,
    totalPages,
    { showCover = true, rightPageHasPhoto = false } = {}
) {
    if (pageNum <= 0 || totalPages <= 1) return null;
    const { spreadIndex, left, right } = getLastSpreadInfo(totalPages, { showCover });
    if (spreadIndex <= 0) return null;

    if (!usesReservedEndSpread(totalPages, { showCover })) {
        if (right <= left) return null;
        if (pageNum === right && !rightPageHasPhoto) return 'half-blank';
        if (pageNum === left && !rightPageHasPhoto) return 'half-left';
        return null;
    }

    if (pageNum === right) return 'half-blank';
    if (pageNum === left) return 'half-left';
    return null;
}

/** Whether a spread index is the last spread with a half-blank layout. */
export function isEndHalfSpreadIndex(spreadIndex, totalPages, { showCover = true } = {}) {
    const info = getLastSpreadInfo(totalPages, { showCover });
    if (spreadIndex !== info.spreadIndex || spreadIndex <= 0) return false;
    return usesReservedEndSpread(totalPages, { showCover }) || info.orphanInnerPage;
}

/** Last spread with photo on the left page only (not a full two-page placement). */
export function isEndHalfSpreadLeftPage(leftPage, totalPages, { showCover = true } = {}) {
    if (leftPage <= 0 || totalPages <= 1) return false;
    const spreadIdx = pageToSpreadIndex(leftPage, { showCover, totalPages });
    if (!isEndHalfSpreadIndex(spreadIdx, totalPages, { showCover })) return false;
    const { left } = getSpreadPages(spreadIdx, totalPages, { showCover });
    return leftPage === left;
}
