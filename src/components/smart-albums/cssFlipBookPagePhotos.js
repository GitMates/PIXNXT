import {
    getGridSlotPhoto,
    getInsideCoverRightPhotoSrc,
    getPagePhotoOverride,
    getSpreadPhotoOverride,
    resolveCoverImageSrc,
} from './albumPagePhotos';
import { getPagePhotoTransform, getSpreadPhotoTransform } from './albumPageTransforms';
import { getSampleImageForPage } from './sampleAlbumImages';
import {
    getAlbumSpreadOptions,
    getEndSpreadPageRole,
    isInsideCoverRightPage,
    isWholeSpreadLayout,
} from './albumSpreadUtils';
import {
    getSpreadLeftPageIndex,
    isProofLeftGridPage,
    isProofRightGridPage,
} from './albumSpreadGrid';

/** Map each CSS flip sheet to album storage page indices (front | back). */
export const CSS_FLIP_SHEETS = [
    { checkboxId: 'five', pageId: 'page5', frontPage: 9, backPage: 10 },
    { checkboxId: 'four', pageId: 'page4', frontPage: 7, backPage: 8 },
    { checkboxId: 'three', pageId: 'page3', frontPage: 5, backPage: 6 },
    { checkboxId: 'two', pageId: 'page2', frontPage: 3, backPage: 4 },
    { checkboxId: 'one', pageId: 'page1', frontPage: 1, backPage: 2 },
];

/** Checkboxes flipped in order from the cover sheet outward. */
export const CSS_FLIP_FLIP_ORDER = ['one', 'two', 'three', 'four', 'five'];

/**
 * How many CSS flip sheets should appear turned for a given spread index.
 * Spread 0 (cover) = 0 flipped sheets.
 */
export function spreadIndexToCssFlipCount(spreadIndex, totalSpreads) {
    if (spreadIndex <= 0) return 0;
    if (totalSpreads > 1 && spreadIndex >= totalSpreads - 1) {
        return CSS_FLIP_SHEETS.length;
    }
    return Math.min(spreadIndex, CSS_FLIP_SHEETS.length);
}

export function cssFlipCountToCheckboxIds(flipCount) {
    const n = Math.max(0, Math.min(flipCount, CSS_FLIP_FLIP_ORDER.length));
    return new Set(CSS_FLIP_FLIP_ORDER.slice(0, n));
}

/** Album storage page index after N CSS flip sheets have been turned. */
export function getCssFlipAlbumPage(flipCount, totalPages, album) {
    if (flipCount <= 0) return 0;
    const spreadOpts = { ...getAlbumSpreadOptions(album), totalPages };
    const topSheetIndex = CSS_FLIP_SHEETS.length - flipCount;
    if (topSheetIndex < 0) {
        return getSpreadLeftPageIndex(CSS_FLIP_SHEETS[0].backPage, spreadOpts);
    }
    return getSpreadLeftPageIndex(CSS_FLIP_SHEETS[topSheetIndex].frontPage, spreadOpts);
}

/**
 * Resolve image + transform for one album page face in the CSS 3D flip book.
 */
export function resolveCssFlipPageFace(album, pageNum, totalPages, showSamples = false) {
    const spreadOpts = { ...getAlbumSpreadOptions(album), totalPages };
    const albumId = album?.id;

    if (pageNum < 0 || (totalPages != null && pageNum >= totalPages)) {
        return { src: null, kind: 'empty', transform: null, panoramic: null };
    }

    if (pageNum === 0) {
        return { src: null, kind: 'empty', transform: null, panoramic: null };
    }

    if (pageNum === 1 && spreadOpts.hasCovers) {
        return {
            src: resolveCoverImageSrc(album, { showSamples }),
            kind: 'cover-front',
            transform: albumId ? getSpreadPhotoTransform(albumId, 0) : null,
            panoramic: 'right',
        };
    }

    if (
        spreadOpts.hasCovers &&
        totalPages != null &&
        getEndSpreadPageRole(pageNum, totalPages, spreadOpts) === 'half-left'
    ) {
        return {
            src: resolveCoverImageSrc(album, { showSamples }),
            kind: 'cover-back',
            transform: albumId ? getSpreadPhotoTransform(albumId, 0) : null,
            panoramic: 'left',
        };
    }

    if (totalPages != null && isInsideCoverRightPage(pageNum, totalPages, spreadOpts)) {
        return {
            src: getInsideCoverRightPhotoSrc(albumId, { showSamples }),
            kind: 'photo',
            transform: albumId ? getPagePhotoTransform(albumId, pageNum) : null,
            panoramic: null,
        };
    }

    const spreadLeft = getSpreadLeftPageIndex(pageNum, spreadOpts);
    const wholeSpread = isWholeSpreadLayout(album?.grid_layout);

    if (albumId && !wholeSpread) {
        if (isProofLeftGridPage(pageNum, spreadOpts)) {
            const slot = getGridSlotPhoto(albumId, pageNum, 1, spreadLeft, totalPages, {
                spreadOpts,
            });
            if (slot?.src) {
                return {
                    src: slot.src,
                    kind: 'photo',
                    transform: getPagePhotoTransform(albumId, pageNum),
                    panoramic: slot.panoramic ?? null,
                };
            }
        }
        if (isProofRightGridPage(pageNum, spreadOpts)) {
            const slot = getGridSlotPhoto(albumId, pageNum, 2, spreadLeft, totalPages, {
                spreadOpts,
            });
            if (slot?.src) {
                return {
                    src: slot.src,
                    kind: 'photo',
                    transform: getPagePhotoTransform(albumId, pageNum),
                    panoramic: slot.panoramic ?? null,
                };
            }
        }
    }

    if (albumId) {
        const pageSrc = getPagePhotoOverride(albumId, pageNum);
        if (pageSrc) {
            return {
                src: pageSrc,
                kind: 'photo',
                transform: getPagePhotoTransform(albumId, pageNum),
                panoramic: null,
            };
        }
        const spreadSrc = getSpreadPhotoOverride(albumId, spreadLeft);
        if (spreadSrc) {
            return {
                src: spreadSrc,
                kind: 'photo',
                transform: getSpreadPhotoTransform(albumId, spreadLeft),
                panoramic: null,
            };
        }
    }

    return {
        src: showSamples ? getSampleImageForPage(pageNum) : null,
        kind: 'photo',
        transform: albumId ? getPagePhotoTransform(albumId, pageNum) : null,
        panoramic: null,
    };
}
