/** Pages are 0-based: spread 0 → 0|1, spread 1 → 2|3 … */
export function getSpreadPages(spreadIndex) {
    const left = spreadIndex * 2;
    return { left, right: left + 1 };
}

export function getTotalSpreads(totalPages) {
    return Math.max(1, Math.ceil(totalPages / 2));
}

export function pageToSpreadIndex(pageIndex) {
    return Math.max(0, Math.floor(pageIndex / 2));
}
