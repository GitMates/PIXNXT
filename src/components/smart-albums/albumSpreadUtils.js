/** Pages are 0-based. With showCover: spread 0 = cover [0], then [1|2], [3|4] … */
export function getSpreadPages(spreadIndex, totalPages, { showCover = true } = {}) {
    if (showCover && spreadIndex <= 0) {
        return { left: 0, right: Math.min(1, totalPages - 1) };
    }
    const left = showCover ? spreadIndex * 2 - 1 : spreadIndex * 2;
    return { left, right: Math.min(left + 1, totalPages - 1) };
}

export function getTotalSpreads(totalPages, { showCover = true } = {}) {
    if (totalPages <= 0) return 1;
    if (!showCover) return Math.max(1, Math.ceil(totalPages / 2));
    return 1 + Math.ceil((totalPages - 1) / 2);
}

/** Map page-flip page index (left page of spread) → spread index */
export function pageToSpreadIndex(pageIndex, { showCover = true } = {}) {
    if (pageIndex <= 0) return 0;
    if (!showCover) return Math.max(0, Math.floor(pageIndex / 2));
    return Math.floor((pageIndex + 1) / 2);
}

/** Map spread index → book page index (left page of spread in flipbook) */
export function spreadIndexToPage(spreadIndex, { showCover = true } = {}) {
    if (showCover && spreadIndex <= 0) return 0;
    if (!showCover) return Math.max(0, spreadIndex * 2);
    return Math.max(0, spreadIndex * 2 - 1);
}
