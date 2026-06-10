import { getAlbumCollection, getAlbumLayoutPhotoCount } from './albumCollection';

/** Pages reserved for the back cover spread (left = photo, right = blank). */
export const RESERVED_END_PAGES = 2;

/** Minimum pages when using front + back cover spreads (matches createAlbumLayout). */
function minPageCountForCovers(photoCount, gridLayout = 'two-page', blankCovers = false) {
    const n = Math.max(0, Math.floor(Number(photoCount) || 0));
    if (n === 0) return 5;
    if (isWholeSpreadLayout(gridLayout)) {
        if (blankCovers) {
            return Math.max(4, 2 + 2 * n + 2);
        }
        return Math.max(4, 2 * n + 2);
    }
    if (blankCovers) {
        if (n <= 1) return 6;
        return Math.max(6, n + 6);
    }
    if (n === 1) return 4;
    if (n === 2) return 6;
    return Math.max(6, n + 5);
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
export function getAlbumSpreadOptions(album, { collectionCount } = {}) {
    let hasCovers = albumHasCoverSpreads(album);
    const pageCount = album?.page_count ?? 21;
    const n =
        collectionCount != null
            ? Math.max(0, Math.floor(Number(collectionCount) || 0))
            : getAlbumLayoutPhotoCount(album?.id, album);
    const gridLayout = album?.grid_layout;

    const blankCovers = albumHasBlankCovers(album);
    const photoCountForMin = n > 0 ? n : pageCount;
    const minPages = minPageCountForCovers(photoCountForMin, gridLayout, blankCovers);

    // Album saved with too few pages for cover spreads (e.g. 6 pages / 6 photos) — use linear layout.
    if (hasCovers && pageCount < minPages) {
        hasCovers = false;
    }

    return {
        showCover: hasCovers,
        hasCovers,
        blankCovers,
        gridLayout: gridLayout || 'two-page',
    };
}

/** Spread layout flags plus page count (for grid / slot index helpers). */
export function getSpreadContext(album, totalPages, { collectionCount } = {}) {
    const count =
        collectionCount ?? getAlbumLayoutPhotoCount(album?.id, album);
    return {
        ...getAlbumSpreadOptions(album, { collectionCount: count }),
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

/** Spread index of the first of the last two spreads (e.g. pre-back before back). */
export function getLastTwoSpreadsStartIndex(totalPages, opts = {}) {
    const spreadOpts = normalizeSpreadOpts(opts);
    const totalSpreads = getTotalSpreads(totalPages, spreadOpts);
    return Math.max(0, totalSpreads - 2);
}

/** Spread index removed when dropping one spread before the last two. */
export function getRemovableSpreadIndex(totalPages, opts = {}) {
    return getLastTwoSpreadsStartIndex(totalPages, opts) - 1;
}

/** Whether the album has a spread that can be removed before the last two. */
export function canRemoveSpreadBeforeLastTwo(totalPages, opts = {}) {
    const spreadOpts = normalizeSpreadOpts(opts);
    const removeIdx = getRemovableSpreadIndex(totalPages, spreadOpts);
    if (removeIdx <= 0) return false;
    const minSpreads = spreadOpts.hasCovers ? 4 : 3;
    if (getTotalSpreads(totalPages, spreadOpts) < minSpreads) return false;
    const { left } = getSpreadPages(removeIdx, totalPages, spreadOpts);
    const minLeft = spreadOpts.hasCovers ? 2 : 0;
    return left >= minLeft;
}

/** Index where new pages are inserted (before the last two spreads). */
export function getPageInsertIndex(totalPages, opts = {}) {
    const spreadOpts = normalizeSpreadOpts(opts);
    const { left: insertAt } = getSpreadPages(
        getLastTwoSpreadsStartIndex(totalPages, spreadOpts),
        totalPages,
        spreadOpts
    );
    if (!spreadOpts.hasCovers) return Math.max(0, insertAt);
    return Math.max(2, insertAt);
}

/**
 * Index where pages are removed when shrinking — the spread before the last two
 * (never removes front cover pages 0–1 or the last two spreads).
 */
export function getPageRemoveIndex(totalPages, removeCount = RESERVED_END_PAGES, opts = {}) {
    const spreadOpts = normalizeSpreadOpts(opts);
    const { left: beforeLastTwo } = getSpreadPages(
        getLastTwoSpreadsStartIndex(totalPages, spreadOpts),
        totalPages,
        spreadOpts
    );
    const removeAt = beforeLastTwo - removeCount;
    if (!spreadOpts.hasCovers) return Math.max(0, removeAt);
    return Math.max(2, removeAt);
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

/** Inside-cover spread (pages 2|3): left page stays blank. */
export function isInsideCoverSpreadLeft(spreadLeftPage, totalPagesOrOpts, maybeOpts) {
    const opts =
        typeof totalPagesOrOpts === 'object' && totalPagesOrOpts != null
            ? totalPagesOrOpts
            : maybeOpts ?? {};
    return (opts.hasCovers ?? opts.showCover) === true && spreadLeftPage === 2;
}

/** Page 2 — blank left half of the inside-cover spread. */
export function isInsideCoverLeftPage(pageNum, totalPagesOrOpts, maybeOpts) {
    const opts =
        typeof totalPagesOrOpts === 'object' && totalPagesOrOpts != null
            ? totalPagesOrOpts
            : maybeOpts ?? {};
    return (opts.hasCovers ?? opts.showCover) === true && pageNum === 2;
}

/** Page 3 — first inner photo beside the blank inside-cover left page. */
export function isInsideCoverRightPage(pageNum, totalPagesOrOpts, maybeOpts) {
    const opts =
        typeof totalPagesOrOpts === 'object' && totalPagesOrOpts != null
            ? totalPagesOrOpts
            : maybeOpts ?? {};
    return (opts.hasCovers ?? opts.showCover) === true && pageNum === 3;
}

/** Spread before the back cover: left photo, right blank. */
export function getPreBackHalfSpreadInfo(totalPages, opts = {}) {
    const spreadOpts = normalizeSpreadOpts(opts);
    if (!spreadOpts.hasCovers || totalPages < 6) return null;
    const totalSpreads = getTotalSpreads(totalPages, spreadOpts);
    const preBackIdx = totalSpreads - 2;
    if (preBackIdx <= 1) return null;
    const { left, right } = getSpreadPages(preBackIdx, totalPages, spreadOpts);
    return { spreadIndex: preBackIdx, left, right };
}

export function isPreBackHalfSpreadLeftPage(leftPage, totalPages, opts = {}) {
    const info = getPreBackHalfSpreadInfo(totalPages, opts);
    return info != null && leftPage === info.left;
}

/** Inner spreads in whole-spread albums that accept one photo across both pages (manual upload). */
export function isManualWholeSpreadPlacement(leftPage, totalPages, album, opts = {}) {
    if (!album || !isWholeSpreadLayout(album?.grid_layout)) return false;
    const spreadOpts = normalizeSpreadOpts(opts);
    if (spreadOpts.hasCovers && leftPage === 0) return false;
    if (spreadOpts.hasCovers && leftPage <= 0) return false;
    if (totalPages != null && isCoverInsidePage(leftPage, totalPages, spreadOpts)) return false;
    if (isEndHalfSpreadLeftPage(leftPage, totalPages, spreadOpts)) return false;
    if (isPreBackHalfSpreadLeftPage(leftPage, totalPages, spreadOpts)) return false;
    if (albumHasBlankCovers(album) && isInsideCoverSpreadLeft(leftPage, totalPages, spreadOpts)) {
        return false;
    }
    return true;
}

export function isPreBackHalfSpreadRightPage(pageNum, totalPages, opts = {}) {
    const info = getPreBackHalfSpreadInfo(totalPages, opts);
    return info != null && pageNum === info.right;
}

export function getPreBackSpreadPageRole(pageNum, totalPages, opts = {}) {
    const info = getPreBackHalfSpreadInfo(totalPages, opts);
    if (!info) return null;
    if (pageNum === info.right) return 'half-blank';
    if (pageNum === info.left) return 'half-left';
    return null;
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

/** True when this storage page is the unused back-cover right leaf (omitted from the flipbook). */
export function isEndCoverBlankPage(pageNum, totalPages, opts = {}) {
    const spreadOpts = normalizeSpreadOpts(opts);
    if (!usesReservedEndSpread(totalPages, spreadOpts)) return false;
    const { left, right } = getEndSpreadPageIndices(totalPages);
    return right > left && pageNum === right;
}

/** Clamp storage page indices off the omitted back-cover blank leaf. */
export function normalizeStoragePageIndex(pageNum, totalPages, opts = {}) {
    const spreadOpts = normalizeSpreadOpts(opts);
    const clamped = Math.max(0, Math.min(totalPages - 1, Math.floor(Number(pageNum) || 0)));
    if (isEndCoverBlankPage(clamped, totalPages, spreadOpts)) {
        return getEndSpreadPageIndices(totalPages).left;
    }
    return clamped;
}

/** Storage pages rendered as flipbook leaves (skips back-cover blank right). */
export function getFlipbookStoragePages(totalPages, opts = {}) {
    const spreadOpts = normalizeSpreadOpts(opts);
    const pages = [];
    for (let pageNum = 0; pageNum < totalPages; pageNum += 1) {
        if (!isEndCoverBlankPage(pageNum, totalPages, spreadOpts)) {
            pages.push(pageNum);
        }
    }
    return pages;
}

export function getFlipbookPageCount(totalPages, opts = {}) {
    return getFlipbookStoragePages(totalPages, opts).length;
}

export function storagePageToFlipbookIndex(pageNum, totalPages, opts = {}) {
    const storagePage = normalizeStoragePageIndex(pageNum, totalPages, opts);
    const pages = getFlipbookStoragePages(totalPages, opts);
    const idx = pages.indexOf(storagePage);
    return idx >= 0 ? idx : Math.max(0, pages.length - 1);
}

export function flipbookIndexToStoragePage(flipIndex, totalPages, opts = {}) {
    const pages = getFlipbookStoragePages(totalPages, opts);
    if (!pages.length) return 0;
    const idx = Math.max(0, Math.min(pages.length - 1, Math.floor(Number(flipIndex) || 0)));
    return pages[idx];
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
    const gridLayout = opts.gridLayout ?? 'two-page';
    const twoPageHalves =
        spreadOpts.hasCovers &&
        (!isWholeSpreadLayout(gridLayout) ||
            (isWholeSpreadLayout(gridLayout) && spreadOpts.blankCovers));
    if (!spreadOpts.hasCovers) return true;
    if (twoPageHalves) {
        if (isInsideCoverLeftPage(pageNum, spreadOpts)) return false;
        if (getPreBackSpreadPageRole(pageNum, totalPages, spreadOpts) === 'half-blank') return false;
    }
    const { left: endLeft } = getEndSpreadPageIndices(totalPages);
    if (pageNum >= endLeft) return false;
    if (spreadOpts.blankCovers) {
        if (isCoverInsidePage(pageNum, totalPages, spreadOpts)) return false;
        if (pageNum === 1) return false;
    }
    return true;
}

/**
 * Whole-spread + blank covers: place each photo on a spread or single page.
 * Half-width photos: first → page 3, last → next spread left, middle → left page only.
 * Full-width photos: one photo across both pages of the spread.
 */
export function enumerateWholeSpreadBlankCoverPlacements(
    photoCount,
    totalPages,
    { pageGridSize = 'square', photoFillsWhole = [] } = {}
) {
    const n = Math.max(0, Math.floor(Number(photoCount) || 0));
    if (n === 0 || totalPages < 4) return [];

    const { left: endLeft } = getEndSpreadPageIndices(totalPages);
    const slots = [];
    let spreadLeft = 2;

    for (let i = 0; i < n; i += 1) {
        const isFirst = i === 0;
        const isLast = i === n - 1;
        const fillsWhole = photoFillsWhole[i] !== false;

        if (!fillsWhole && isFirst) {
            slots.push({ type: 'page', pageNum: 3 });
            spreadLeft = 4;
            continue;
        }

        if (!fillsWhole && isLast) {
            if (spreadLeft < endLeft) {
                slots.push({ type: 'page', pageNum: spreadLeft });
            }
            continue;
        }

        if (!fillsWhole) {
            if (spreadLeft >= endLeft) break;
            slots.push({ type: 'page', pageNum: spreadLeft });
            spreadLeft += 2;
            continue;
        }

        if (spreadLeft >= endLeft) break;
        slots.push({
            type: 'spread',
            leftPage: spreadLeft,
            rightPage: Math.min(spreadLeft + 1, totalPages - 1),
        });
        spreadLeft += 2;
    }

    return slots;
}

/**
 * Whole-spread + blank covers (all full-width): one photo per inner spread (pages 2|3, 4|5, …).
 * Skips front cover (0|1) and back cover (endLeft|endLeft+1).
 */
export function enumerateWholeSpreadBlankCoverTargets(totalPages, opts = {}) {
    const spreadOpts = normalizeSpreadOpts(opts);
    if (!spreadOpts.hasCovers || !spreadOpts.blankCovers || totalPages < 4) return [];
    const { left: endLeft } = getEndSpreadPageIndices(totalPages);
    const targets = [];
    for (let left = 2; left < endLeft; left += 2) {
        targets.push(left);
    }
    return targets;
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
        if (spreadOpts.hasCovers && spreadOpts.blankCovers) {
            return enumerateWholeSpreadBlankCoverTargets(totalPages, spreadOpts);
        }
        for (let left = 0; left < totalPages; left += 2) {
            if (isEndHalfSpreadLeftPage(left, totalPages, spreadOpts)) {
                pushPage(left);
                break;
            }
            pushPage(left);
        }
        return targets;
    }

    if (spreadOpts.hasCovers) {
        for (const page of enumerateCoverTwoPagePageTargets(totalPages, {
            blankCovers: spreadOpts.blankCovers,
        })) {
            pushPage(page);
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
 * Ordered page targets for two-page cover albums (inside + middle + pre-back slots).
 * Book wrap: photo 1 uses spread:0; pages listed here start at photo 2.
 * Blank covers: photo 1 on page 3; pages listed here match collection order.
 */
export function enumerateCoverTwoPagePageTargets(totalPages, { blankCovers = false } = {}) {
    if (totalPages <= 0) return [];
    const spreadOpts = { showCover: true, hasCovers: true, blankCovers };
    const pages = [];
    const preBack = getPreBackHalfSpreadInfo(totalPages, spreadOpts);
    const preBackLeft = preBack?.left;
    const middleEnd = preBackLeft != null ? preBackLeft - 1 : totalPages - 3;

    pages.push(3);
    for (let page = 4; page <= middleEnd; page += 1) {
        pages.push(page);
    }
    if (preBackLeft != null) {
        pages.push(preBackLeft);
    }

    return pages.filter((page) => isAutoPlacePhotoPage(page, totalPages, spreadOpts));
}

/**
 * Placement slots for two-page cover albums in collection order.
 * Book wrap: photo 1 → wrap; photo 2 → page 3; middle photos → pages 4…; last → pre-back left.
 * Blank covers: photo 1 → page 3; middle → pages 4…; last → pre-back left.
 */
export function enumerateCoverTwoPagePlacements(
    photoCount,
    totalPages,
    { blankCovers = false } = {}
) {
    const n = Math.max(0, Math.floor(Number(photoCount) || 0));
    if (n === 0 || totalPages <= 0) return [];

    const slots = [];
    const pageTargets = enumerateCoverTwoPagePageTargets(totalPages, { blankCovers });
    const minPhotosForPreBack = blankCovers ? 2 : 3;
    const usableTargets =
        n >= minPhotosForPreBack ? pageTargets : pageTargets.filter((page) => {
              const preBack = getPreBackHalfSpreadInfo(totalPages, {
                  showCover: true,
                  hasCovers: true,
                  blankCovers,
              });
              return preBack == null || page !== preBack.left;
          });

    if (!blankCovers && n >= 1) {
        slots.push({
            type: 'book-wrap',
            leftPage: 0,
            rightPage: Math.min(1, totalPages - 1),
        });
    }

    const pageSlots = usableTargets.slice(0, blankCovers ? n : Math.max(0, n - 1));
    for (const pageNum of pageSlots) {
        slots.push({ type: 'page', pageNum });
    }

    return slots;
}

/**
 * Placement slots for cover albums: photo 1 → book wrap (front right + back left),
 * photos 2…n → inner pages only.
 * @returns {Array<{ type: 'book-wrap' | 'spread', leftPage: number, rightPage: number } | { type: 'page', pageNum: number }>}
 */
export function enumerateCoverAlbumPlacements(photoCount, totalPages, { gridLayout = 'two-page', blankCovers = false } = {}) {
    const n = Math.max(0, Math.floor(Number(photoCount) || 0));
    if (n === 0 || totalPages <= 0) return [];

    if (!isWholeSpreadLayout(gridLayout)) {
        return enumerateCoverTwoPagePlacements(n, totalPages, { blankCovers });
    }

    const spreadOpts = { showCover: true, hasCovers: true, totalPages };
    const { left: endLeft } = getEndSpreadPageIndices(totalPages);
    const slots = [];
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
            hasCovers: spreadOpts.hasCovers,
            blankCovers: true,
            gridLayout,
        }).slice(0, n);
    }

    return enumerateCoverAlbumPlacements(n, totalPages, { gridLayout, blankCovers: false })
        .filter((slot) => slot.type === 'page')
        .map((slot) => slot.pageNum);
}

/** Cover placement slots (spread or page) in collection order — use in autoPlace. */
export function enumerateCoverCollectionPlacements(
    photoCount,
    totalPages,
    { gridLayout = 'two-page', blankCovers = false } = {}
) {
    return enumerateCoverAlbumPlacements(photoCount, totalPages, { gridLayout, blankCovers });
}
