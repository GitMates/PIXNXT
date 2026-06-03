/** Pages reserved for the back cover spread (left = photo, right = blank). */
export const RESERVED_END_PAGES = 2;

/** Spread layout flags from album settings (defaults to cover spreads for legacy albums). */
export function getAlbumSpreadOptions(album) {
    const hasCovers = album?.has_covers !== false;
    return { showCover: hasCovers, hasCovers };
}

/** Spread layout flags plus page count (for grid / slot index helpers). */
export function getSpreadContext(album, totalPages) {
    return { ...getAlbumSpreadOptions(album), totalPages };
}

/** 1-based spread number for UI labels from a spread's left page index. */
export function spreadNumberFromLeftPage(leftPage, opts = {}) {
    const { hasCovers } = normalizeSpreadOpts(opts);
    if (leftPage <= 0 && !hasCovers) return 1;
    if (!hasCovers) return Math.floor(leftPage / 2) + 1;
    return Math.floor((leftPage - 1) / 2) + 1;
}

export function normalizeSpreadOpts(opts = {}) {
    const hasCovers = opts.hasCovers ?? opts.showCover ?? true;
    return { showCover: hasCovers, hasCovers };
}

/** Pages are 0-based. With showCover: spread 0 = cover [0|1], inner pairs, then end [n-2|n-1]. */
export function getInnerPageCount(totalPages, opts = {}) {
    const { hasCovers, showCover } = normalizeSpreadOpts(opts);
    if (totalPages <= 0) return 0;
    if (!hasCovers) return totalPages;
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
export function getPageInsertIndex(totalPages, opts = {}) {
    const { hasCovers } = normalizeSpreadOpts(opts);
    if (!hasCovers) return Math.max(0, totalPages);
    return Math.max(1, totalPages - RESERVED_END_PAGES);
}

/**
 * Index where pages are removed when shrinking — the inner spread immediately
 * before the reserved end cover (never removes end-cover pages).
 */
export function getPageRemoveIndex(totalPages, removeCount = RESERVED_END_PAGES, opts = {}) {
    const { hasCovers } = normalizeSpreadOpts(opts);
    if (!hasCovers) return Math.max(0, totalPages - removeCount);
    const { left: endLeft } = getEndSpreadPageIndices(totalPages);
    return Math.max(1, endLeft - removeCount);
}

export function usesReservedEndSpread(totalPages, opts = {}) {
    const { hasCovers, showCover } = normalizeSpreadOpts(opts);
    if (!hasCovers) return false;
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

export function getSpreadPages(spreadIndex, totalPages, opts = {}) {
    const { hasCovers, showCover } = normalizeSpreadOpts(opts);
    if (totalPages <= 0) {
        return { left: 0, right: 0 };
    }

    const spreadOpts = { showCover, hasCovers };
    const totalSpreads = getTotalSpreads(totalPages, spreadOpts);
    const lastIdx = totalSpreads - 1;

    if (hasCovers && showCover && spreadIndex <= 0) {
        return { left: 0, right: Math.min(1, totalPages - 1) };
    }

    if (usesReservedEndSpread(totalPages, spreadOpts) && spreadIndex === lastIdx) {
        return getEndSpreadPageIndices(totalPages);
    }

    const left = hasCovers && showCover ? spreadIndex * 2 - 1 : spreadIndex * 2;
    const maxInnerRight = usesReservedEndSpread(totalPages, spreadOpts)
        ? totalPages - RESERVED_END_PAGES - 1
        : totalPages - 1;

    return { left, right: Math.min(left + 1, maxInnerRight) };
}

export function getTotalSpreads(totalPages, opts = {}) {
    const spreadOpts = normalizeSpreadOpts(opts);
    const { hasCovers, showCover } = spreadOpts;
    if (totalPages <= 0) return 1;
    if (!hasCovers) {
        return Math.max(1, Math.ceil(totalPages / 2));
    }
    if (!showCover) {
        const inner = Math.max(0, totalPages - RESERVED_END_PAGES);
        const innerSpreads = Math.max(0, Math.ceil(inner / 2));
        return Math.max(1, innerSpreads + (totalPages >= RESERVED_END_PAGES ? 1 : 0));
    }
    if (!usesReservedEndSpread(totalPages, spreadOpts)) {
        return 1;
    }
    const innerSpreads = Math.ceil(getInnerPageCount(totalPages, spreadOpts) / 2);
    return 1 + innerSpreads + 1;
}

/** Map flipbook page index → spread index (matches page-flip showCover spreads). */
export function pageToSpreadIndex(pageIndex, opts = {}) {
    const { hasCovers, showCover } = normalizeSpreadOpts(opts);
    const totalPages = opts.totalPages ?? 0;
    const spreadOpts = { showCover, hasCovers };

    if (!hasCovers) return Math.max(0, Math.floor(pageIndex / 2));
    if (pageIndex <= 0) return 0;
    if (usesReservedEndSpread(totalPages, spreadOpts)) {
        const { left: endLeft } = getEndSpreadPageIndices(totalPages);
        if (pageIndex >= endLeft) {
            return getTotalSpreads(totalPages, spreadOpts) - 1;
        }
    }
    if (!showCover) return Math.max(0, Math.floor(pageIndex / 2));
    return Math.floor((pageIndex + 1) / 2);
}

/** Map spread index → book page index (left page of spread in flipbook) */
export function spreadIndexToPage(spreadIndex, opts = {}) {
    const { hasCovers, showCover } = normalizeSpreadOpts(opts);
    const totalPages = opts.totalPages ?? 0;
    const spreadOpts = { showCover, hasCovers };

    if (hasCovers && showCover && spreadIndex <= 0) return 0;
    const lastIdx = getTotalSpreads(totalPages, spreadOpts) - 1;
    if (usesReservedEndSpread(totalPages, spreadOpts) && spreadIndex === lastIdx) {
        return getEndSpreadPageIndices(totalPages).left;
    }
    if (!hasCovers || !showCover) return Math.max(0, spreadIndex * 2);
    return Math.max(0, spreadIndex * 2 - 1);
}

/** Last spread indices — always the reserved end-cover spread when enabled. */
export function getLastSpreadInfo(totalPages, opts = {}) {
    const spreadOpts = normalizeSpreadOpts(opts);
    const spreadIndex = Math.max(0, getTotalSpreads(totalPages, spreadOpts) - 1);
    const { left, right } = getSpreadPages(spreadIndex, totalPages, spreadOpts);
    const orphanInnerPage = usesReservedEndSpread(totalPages, spreadOpts);
    return { spreadIndex, left, right, orphanInnerPage };
}

/**
 * Role for end-spread half layout: photo on the left page, blank on the right.
 * @returns {'half-left' | 'half-blank' | null}
 */
export function getEndSpreadPageRole(
    pageNum,
    totalPages,
    { showCover = true, hasCovers, rightPageHasPhoto = false } = {}
) {
    const spreadOpts = normalizeSpreadOpts({ showCover, hasCovers });
    if (!spreadOpts.hasCovers) return null;
    if (pageNum <= 0 || totalPages <= 1) return null;
    const { spreadIndex, left, right } = getLastSpreadInfo(totalPages, spreadOpts);
    if (spreadIndex <= 0) return null;

    if (!usesReservedEndSpread(totalPages, spreadOpts)) {
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
export function isEndHalfSpreadIndex(spreadIndex, totalPages, opts = {}) {
    const spreadOpts = normalizeSpreadOpts(opts);
    const info = getLastSpreadInfo(totalPages, spreadOpts);
    if (spreadIndex !== info.spreadIndex || spreadIndex <= 0) return false;
    return usesReservedEndSpread(totalPages, spreadOpts) || info.orphanInnerPage;
}

/** Last spread with photo on the left page only (not a full two-page placement). */
export function isEndHalfSpreadLeftPage(leftPage, totalPages, opts = {}) {
    const spreadOpts = normalizeSpreadOpts(opts);
    if (!spreadOpts.hasCovers) return false;
    if (leftPage <= 0 || totalPages <= 1) return false;
    const spreadIdx = pageToSpreadIndex(leftPage, { ...spreadOpts, totalPages });
    if (!isEndHalfSpreadIndex(spreadIdx, totalPages, spreadOpts)) return false;
    const { left } = getSpreadPages(spreadIdx, totalPages, spreadOpts);
    return leftPage === left;
}

function isWholeSpreadLayout(gridLayout) {
    return gridLayout === 'whole-spread' || String(gridLayout || '').startsWith('whole-spread');
}

/** Whether a page index can hold a user photo (skips end-cover blank right leaf). */
export function isAutoPlacePhotoPage(pageNum, totalPages, opts = {}) {
    if (pageNum < 0 || pageNum >= totalPages) return false;
    const spreadOpts = normalizeSpreadOpts(opts);
    if (!spreadOpts.hasCovers) return true;
    const role = getEndSpreadPageRole(pageNum, totalPages, spreadOpts);
    return role !== 'half-blank';
}

/**
 * Page indices in spread order for auto-fill (cover → inner spreads → end cover).
 * Matches what the flipbook shows so photo 1, 2, 3… align with collection order.
 */
export function enumerateAutoPlacePageTargets(
    totalPages,
    { showCover = true, hasCovers, gridLayout = 'two-page' } = {}
) {
    const spreadOpts = normalizeSpreadOpts({
        showCover,
        hasCovers: hasCovers ?? showCover,
    });
    const targets = [];
    const seen = new Set();

    const pushPage = (page) => {
        if (seen.has(page) || !isAutoPlacePhotoPage(page, totalPages, spreadOpts)) return;
        seen.add(page);
        targets.push(page);
    };

    if (isWholeSpreadLayout(gridLayout)) {
        const start = spreadOpts.showCover && spreadOpts.hasCovers ? 1 : 0;
        for (let left = start; left < totalPages; left += 2) {
            if (isEndHalfSpreadLeftPage(left, totalPages, spreadOpts)) {
                pushPage(left);
                break;
            }
            pushPage(left);
        }
        return targets;
    }

    const totalSpreads = getTotalSpreads(totalPages, spreadOpts);
    for (let spreadIndex = 0; spreadIndex < totalSpreads; spreadIndex += 1) {
        const { left, right } = getSpreadPages(spreadIndex, totalPages, spreadOpts);

        if (isEndHalfSpreadIndex(spreadIndex, totalPages, spreadOpts)) {
            pushPage(left);
            continue;
        }

        pushPage(left);
        if (right > left) {
            pushPage(right);
        }
    }

    return targets;
}
