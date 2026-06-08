import { getTotalSpreads, pageToSpreadIndex } from './albumSpreadUtils';

/**
 * page-flip showNext() can increment past the last spread and crash in showSpread().
 * Guard flip APIs using our spread index math (matches HTMLFlipBook showCover={false}).
 */
export function installSafePageFlip(api, { totalPages, spreadOpts }) {
    if (!api || api.__pixnxtSafeFlip) return api;

    const spreadCtx = { ...spreadOpts, totalPages };
    const maxSpreadIndex = Math.max(0, getTotalSpreads(totalPages, spreadOpts) - 1);

    const spreadIndex = () => pageToSpreadIndex(api.getCurrentPageIndex(), spreadCtx);

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
    wrap('turnToPrevPage', () => spreadIndex() <= 0);
    wrap('flipPrev', () => spreadIndex() <= 0);

    api.__pixnxtSafeFlip = true;
    return api;
}
