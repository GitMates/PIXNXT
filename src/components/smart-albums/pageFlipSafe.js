import {
    flipbookIndexToStoragePage,
    getFlipbookPageCount,
    getTotalSpreads,
    pageToSpreadIndex,
} from './albumSpreadUtils';

/**
 * page-flip showNext() can increment past the last leaf and crash in showSpread().
 * Next is limited by spread (last spread); prev by flip leaf (cover uses multiple leaves).
 */
export function installSafePageFlip(api, { totalPages, spreadOpts }) {
    if (!api || api.__pixnxtSafeFlip) return api;

    const spreadCtx = { ...spreadOpts, totalPages };
    const maxSpreadIndex = Math.max(0, getTotalSpreads(totalPages, spreadOpts) - 1);
    const maxFlipIndex = Math.max(0, getFlipbookPageCount(totalPages, spreadOpts) - 1);

    const currentFlipIndex = () =>
        Math.max(0, Math.min(maxFlipIndex, Math.floor(Number(api.getCurrentPageIndex()) || 0)));

    const spreadIndex = () => {
        const storagePage = flipbookIndexToStoragePage(
            api.getCurrentPageIndex(),
            totalPages,
            spreadOpts
        );
        return pageToSpreadIndex(storagePage, spreadCtx);
    };

    const wrap = (method, blockWhen) => {
        if (typeof api[method] !== 'function') return;
        const original = api[method].bind(api);
        api[method] = (...args) => {
            if (blockWhen()) return undefined;
            return original(...args);
        };
    };

    wrap('turnToNextPage', () => spreadIndex() >= maxSpreadIndex);
    wrap('flipNext', () => spreadIndex() >= maxSpreadIndex);
    wrap('turnToPrevPage', () => currentFlipIndex() <= 0);
    wrap('flipPrev', () => currentFlipIndex() <= 0);

    api.__pixnxtSafeFlip = true;
    return api;
}
