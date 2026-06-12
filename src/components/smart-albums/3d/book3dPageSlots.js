import { resolveAlbumPageSlot } from '../albumGridSlotResolve';

export { isPanoramicSpreadPair } from '../albumGridSlotResolve';

/**
 * Resolve a single page's image slot for 3D — uses shared 2D slot rules.
 */
export function resolveBook3dPageSlot(
    album,
    pageNum,
    totalPages,
    spreadOpts,
    { showSamples = false, placementMode = 'single' } = {}
) {
    return resolveAlbumPageSlot(album, pageNum, totalPages, {
        showSamples,
        placementMode,
        spreadOpts,
    });
}
