import { getAlbumCollection } from './albumCollection';

/** Pages reserved for the back cover spread (left = photo, right = blank). */
export const RESERVED_END_PAGES = 2;

/** Minimum pages when using front + back book-wrap covers (matches createAlbumLayout). */
function minPageCountForCovers(photoCount, gridLayout = 'two-page') {
    const n = Math.max(0, Math.floor(Number(photoCount) || 0));
    if (n === 0) return 5;
    if (isWholeSpreadLayout(gridLayout)) {
        return Math.max(4, 2 * n + 2);
    }
    if (n === 1) return 4;
    const innerCount = Math.max(0, n - 1);
    return Math.max(4, 4 + 2 * Math.ceil(innerCount / 2));
}

/** True when the album uses front + back cover spreads (book wrap or blank). */
export function albumHasCoverSpreads(album) {
    return album?.has_covers === true;
}

/** True when cover spreads are blank (no book-wrap photo). */
export function albumHasBlankCovers(album) {
    return album?.blank_covers === true;
}

/** True when photo 1 is placed on the book wrap (front + back cover image). */
export function albumUsesBookWrap(album) {
    return albumHasCoverSpreads(album) && !albumHasBlankCovers(album);
}

/** Spread layout flags from album settings. */
export function getAlbumSpreadOptions(album, { collectionCount = 0 } = {}) {
    let hasCovers = albumHasCoverSpreads(album);
    const pageCount = album?.page_count ?? 21;
    const n = Math.max(0, Math.floor(Number(collectionCount) || 0));
    const gridLayout = album?.grid_layout;

    const photoCountForMin = n > 0 ? n : pageCount;
    const minPages = minPageCountForCovers(photoCountForMin, gridLayout);

    // Album saved with too few pages for cover spreads (e.g. 6 pages / 6 photos) — use linear layout.
    if (hasCovers && pageCount < minPages) {
        hasCovers = false;
    }

    return { showCover: hasCovers, hasCovers };
}

/** Spread layout flags plus page count (for grid / slot index helpers). */
export function getSpreadContext(album, totalPages, { collectionCount } = {}) {
    const count =
        collectionCount ??
        (album?.id ? getAlbumCollection(album.id).length : 0);
    return {
        ...getAlbumSpreadOptions(album, { collectionCount: count }),
        blankCovers: albumHasBlankCovers(album),
        totalPages,
    };
}

/** 1-based spread number for UI labels from a spread's left page index. */
export function spreadNumberFromLeftPage(leftPage, opts = {}) {
    const { hasCovers } = normalizeSpreadOpts(opts);
    if (leftPage <= 0 && !hasCovers) return 1;
    if (!hasCovers) return Math.floor(leftPage / 2) + 1;
    return Math.floor((leftPage - 1) / 2) + 1;
}

export function normalizeSpreadOpts(opts = {}) {
    const blankCovers = opts.blankCovers === true;
    if (typeof opts.hasCovers === 'boolean') {
        return { showCover: opts.hasCovers, hasCovers: opts.hasCovers, blankCovers };
    }
    if (typeof opts.showCover === 'boolean') {
        return { showCover: opts.showCover, hasCovers: opts.showCover, blankCovers };
    }
    return { showCover: false, hasCovers: false, blankCovers };
}

/** Pages are 0-based. With showCover: spread 0 = front [0|1], inner pairs, then back cover. */
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

/** Index where new pages are inserted (before the back-cover spread). */
export function getPageInsertIndex(totalPages, opts = {}) {
    const { hasCovers } = normalizeSpreadOpts(opts);
    if (!hasCovers) return Math.max(0, totalPages);
    return Math.max(1, totalPages - RESERVED_END_PAGES);
}

/**
 * Index where pages are removed when shrinking — inner spread before the back cover
 * (never removes front cover pages 0–1 or the back-cover spread).
 */
export function getPageRemoveIndex(totalPages, removeCount = RESERVED_END_PAGES, opts = {}) {
    const { hasCovers } = normalizeSpreadOpts(opts);
    if (!hasCovers) return Math.max(0, totalPages - removeCount);
    const { left: endLeft } = getEndSpreadPageIndices(totalPages);
    return Math.max(2, endLeft - removeCount);
}

export function usesReservedEndSpread(totalPages, opts = {}) {
    const { hasCovers, showCover } = normalizeSpreadOpts(opts);
    if (!hasCovers) return false;
    if (!showCover) return totalPages >= RESERVED_END_PAGES;
    return totalPages >= 1 + RESERVED_END_PAGES;
}

/** Front cover: page 0 is blank; page 1 shows the right half of the wrap image. */
export function isCoverInsidePage(pageNum, _totalPages, { hasCovers } = {}) {
    return hasCovers === true && pageNum === 0;
}

/** Front cover spread (pages 0|1). */
export function isFrontCoverSpreadLeft(spreadLeftPage, { hasCovers } = {}) {
    return hasCovers === true && spreadLeftPage === 0;
}

/** Back cover spread (last spread): left half of wrap on the left page. */
export function isBackCoverSpreadLeft(spreadLeftPage, totalPages, opts = {}) {
    if (!isEndHalfSpreadLeftPage(spreadLeftPage, totalPages, opts)) return false;
    const { left } = getEndSpreadPageIndices(totalPages);
    return spreadLeftPage === left;
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

    // Inner spreads: 2|3, 4|5, … (spread 0 = front cover 0|1).
    const left = hasCovers && showCover ? spreadIndex * 2 : spreadIndex * 2;
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
    const innerSpreads = Math.ceil(getInnerPageCount(totalPages, spreadOpts) / 2);
    return 1 + innerSpreads + 1;
}

/** Map flipbook page index → spread index (matches page-flip showCover spreads). */
export function pageToSpreadIndex(pageIndex, opts = {}) {
    const { hasCovers, showCover } = normalizeSpreadOpts(opts);
    const totalPages = opts.totalPages ?? 0;
    const spreadOpts = { showCover, hasCovers };

    if (!hasCovers) return Math.max(0, Math.floor(pageIndex / 2));
    if (showCover && pageIndex <= 1) return 0;
    if (usesReservedEndSpread(totalPages, spreadOpts)) {
        const { left: endLeft } = getEndSpreadPageIndices(totalPages);
        if (pageIndex >= endLeft) {
            return getTotalSpreads(totalPages, spreadOpts) - 1;
        }
    }
    if (!showCover) return Math.max(0, Math.floor(pageIndex / 2));
    return Math.floor((pageIndex - 2) / 2) + 1;
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
    return Math.max(0, spreadIndex * 2);
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

/** End cover spread: photo on the left page only, right page blank. */
export function isEndHalfSpreadLeftPage(leftPage, totalPages, opts = {}) {
    const spreadOpts = normalizeSpreadOpts(opts);
    if (!spreadOpts.hasCovers) return false;
    if (leftPage <= 0 || totalPages <= 1) return false;
    const spreadIdx = pageToSpreadIndex(leftPage, { ...spreadOpts, totalPages });
    if (!isEndHalfSpreadIndex(spreadIdx, totalPages, spreadOpts)) return false;
    const { left } = getSpreadPages(spreadIdx, totalPages, spreadOpts);
    return leftPage === left;
}

export function isWholeSpreadLayout(gridLayout) {
    return gridLayout === 'whole-spread' || String(gridLayout || '').startsWith('whole-spread');
}

/** Whether a page index can hold a user photo (skips end-cover blank right leaf). */
export function isAutoPlacePhotoPage(pageNum, totalPages, opts = {}) {
    if (pageNum < 0 || pageNum >= totalPages) return false;
    const spreadOpts = normalizeSpreadOpts(opts);
    if (!spreadOpts.hasCovers) return true;
    if (spreadOpts.blankCovers) {
        if (isCoverInsidePage(pageNum, totalPages, spreadOpts)) return false;
        if (pageNum === 1) return false;
    }
    const role = getEndSpreadPageRole(pageNum, totalPages, spreadOpts);
    if (role === 'half-blank') return false;
    if (spreadOpts.blankCovers && role === 'half-left') return false;
    return true;
}

/**
 * Page indices in spread order for auto-fill (front cover → inner spreads).
 * Matches what the flipbook shows so photo 1, 2, 3… align with collection order.
 */
export function enumerateAutoPlacePageTargets(
    totalPages,
    { showCover = true, hasCovers, blankCovers = false, gridLayout = 'two-page' } = {}
) {
    const spreadOpts = normalizeSpreadOpts({
        showCover,
        hasCovers: hasCovers ?? showCover,
        blankCovers,
    });
    const targets = [];
    const seen = new Set();

    const pushPage = (page) => {
        if (seen.has(page) || !isAutoPlacePhotoPage(page, totalPages, spreadOpts)) return;
        seen.add(page);
        targets.push(page);
    };

    if (isWholeSpreadLayout(gridLayout)) {
        for (let left = 0; left < totalPages; left += 2) {
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

        if (spreadOpts.hasCovers && spreadOpts.showCover && spreadIndex === 0) {
            if (!spreadOpts.blankCovers) {
                pushPage(Math.min(1, totalPages - 1));
            }
            continue;
        }

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

/**
 * Placement slots for cover albums: photo 1 → book wrap (front right + back left),
 * photos 2…n → inner pages only.
 * @returns {Array<{ type: 'book-wrap' | 'spread', leftPage: number, rightPage: number } | { type: 'page', pageNum: number }>}
 */
export function enumerateCoverAlbumPlacements(photoCount, totalPages, { gridLayout = 'two-page' } = {}) {
    const n = Math.max(0, Math.floor(Number(photoCount) || 0));
    if (n === 0 || totalPages <= 0) return [];

    const spreadOpts = { showCover: true, hasCovers: true, totalPages };
    const { left: endLeft } = getEndSpreadPageIndices(totalPages);
    const slots = [];

    if (isWholeSpreadLayout(gridLayout)) {
        for (let i = 0; i < n; i += 1) {
            if (i === 0) {
                slots.push({
                    type: 'book-wrap',
                    leftPage: 0,
                    rightPage: Math.min(1, totalPages - 1),
                });
                continue;
            }
            const leftPage = 2 + (i - 1) * 2;
            if (leftPage >= endLeft) break;
            slots.push({
                type: 'spread',
                leftPage,
                rightPage: Math.min(leftPage + 1, totalPages - 1),
            });
        }
        return slots;
    }

    if (n >= 1) {
        slots.push({
            type: 'book-wrap',
            leftPage: 0,
            rightPage: Math.min(1, totalPages - 1),
        });
    }

    const innerCount = Math.max(0, n - 1);
    let page = 2;
    for (let i = 0; i < innerCount && page < endLeft; i += 1) {
        slots.push({ type: 'page', pageNum: page });
        page += 1;
    }

    return slots;
}

/**
 * Page indices for placing N collection photos in display order.
 * No covers: photo 1 → page 0, 2 → page 1, … (one photo per page, left then right per spread).
 * With covers: photo 1 → book wrap, photos 2…n → inner pages.
 */
export function enumerateCollectionPlacementPages(
    photoCount,
    totalPages,
    { showCover = true, hasCovers, blankCovers = false, gridLayout = 'two-page' } = {}
) {
    const n = Math.max(0, Math.floor(Number(photoCount) || 0));
    if (n === 0 || totalPages <= 0) return [];

    const spreadOpts = normalizeSpreadOpts({
        showCover,
        hasCovers: hasCovers ?? showCover,
        blankCovers,
    });

    if (isWholeSpreadLayout(gridLayout)) {
        return enumerateAutoPlacePageTargets(totalPages, {
            showCover,
            hasCovers: spreadOpts.hasCovers,
            blankCovers: spreadOpts.blankCovers,
            gridLayout: 'whole-spread',
        }).slice(0, n);
    }

    if (!spreadOpts.hasCovers) {
        return Array.from({ length: Math.min(n, totalPages) }, (_, i) => i);
    }

    if (spreadOpts.blankCovers) {
        return enumerateAutoPlacePageTargets(totalPages, {
            showCover,
            hasCovers: true,
            blankCovers: true,
            gridLayout: 'two-page',
        }).slice(0, n);
    }

    return enumerateCoverAlbumPlacements(n, totalPages, { gridLayout })
        .filter((slot) => slot.type === 'page')
        .map((slot) => slot.pageNum);
}

/** Cover placement slots (spread or page) in collection order — use in autoPlace. */
export function enumerateCoverCollectionPlacements(photoCount, totalPages, { gridLayout = 'two-page' } = {}) {
    return enumerateCoverAlbumPlacements(photoCount, totalPages, { gridLayout });
}
