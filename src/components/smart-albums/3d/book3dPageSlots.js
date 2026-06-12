import {
    getGridSlotPhoto,
    getInsideCoverRightPhotoSrc,
    getPagePhotoOverride,
    getSpreadPhotoOverride,
    resolveCoverImageSrc,
} from '../albumPagePhotos';
import { isProofLeftGridPage, isProofRightGridPage, getSpreadLeftPageIndex } from '../albumSpreadGrid';
import {
    getEndSpreadPageRole,
    getLastSpreadInfo,
    getPreBackSpreadPageRole,
    isCoverInsidePage,
    isInsideCoverLeftPage,
    isInsideCoverRightPage,
    isWholeSpreadLayout,
} from '../albumSpreadUtils';
import { getSampleImageForPage } from '../sampleAlbumImages';

function spreadUsesWholePhoto(albumId, spreadLeft, album) {
    if (!albumId || spreadLeft == null) return false;
    if (!isWholeSpreadLayout(album?.grid_layout)) return false;
    return Boolean(getSpreadPhotoOverride(albumId, spreadLeft));
}

function pageHasGridPhoto(album, albumId, pageNum, totalPages, spreadOpts) {
    if (!albumId || pageNum < 0) return false;
    const opts = { ...spreadOpts, totalPages };
    const spreadLeft = getSpreadLeftPageIndex(pageNum, opts);
    const wholeSpread = spreadUsesWholePhoto(albumId, spreadLeft, album);
    if (isProofLeftGridPage(pageNum, opts)) {
        const slot = getGridSlotPhoto(albumId, pageNum, 1, spreadLeft, totalPages, {
            wholeSpread,
            spreadOpts,
        });
        if (slot?.src) return true;
    }
    if (isProofRightGridPage(pageNum, opts)) {
        const slot = getGridSlotPhoto(albumId, pageNum, 2, spreadLeft, totalPages, {
            wholeSpread,
            spreadOpts,
        });
        if (slot?.src) return true;
    }
    return false;
}

/**
 * Resolve a single page's image slot for 3D — mirrors AlbumFlipPage / AlbumBook photo rules.
 */
export function resolveBook3dPageSlot(
    album,
    pageNum,
    totalPages,
    spreadOpts,
    { showSamples = false } = {}
) {
    const albumId = album?.id;
    const opts = { ...spreadOpts, totalPages };

    if (pageNum == null || pageNum < 0 || pageNum >= totalPages) {
        return { src: null };
    }

    if (isCoverInsidePage(pageNum, totalPages, opts)) {
        return { src: null };
    }

    if (isInsideCoverLeftPage(pageNum, spreadOpts)) {
        return { src: null };
    }

    const { right: lastSpreadRight } = getLastSpreadInfo(totalPages, spreadOpts);
    const rightPageHasPhoto = pageHasGridPhoto(
        album,
        albumId,
        lastSpreadRight,
        totalPages,
        spreadOpts
    );

    const endSpreadRole = getEndSpreadPageRole(pageNum, totalPages, {
        ...spreadOpts,
        rightPageHasPhoto,
    });
    if (endSpreadRole === 'half-blank') {
        return { src: null };
    }

    const preBackRole = getPreBackSpreadPageRole(pageNum, totalPages, spreadOpts);
    if (preBackRole === 'half-blank') {
        return { src: null };
    }

    if (spreadOpts.hasCovers && pageNum === 1) {
        const coverSrc = resolveCoverImageSrc(album, { showSamples });
        return coverSrc ? { src: coverSrc, panoramic: 'right' } : { src: null };
    }

    if (endSpreadRole === 'half-left' && spreadOpts.hasCovers) {
        const coverSrc = resolveCoverImageSrc(album, { showSamples });
        return coverSrc ? { src: coverSrc, panoramic: 'left' } : { src: null };
    }

    if (isInsideCoverRightPage(pageNum, totalPages, spreadOpts)) {
        const src = getInsideCoverRightPhotoSrc(albumId, { showSamples });
        return src ? { src } : { src: null };
    }

    if (albumId) {
        const override = getPagePhotoOverride(albumId, pageNum);
        if (override) return { src: override };
    }

    const spreadLeft = getSpreadLeftPageIndex(pageNum, opts);
    const wholeSpread = spreadUsesWholePhoto(albumId, spreadLeft, album);

    if (isProofLeftGridPage(pageNum, opts)) {
        const slot = getGridSlotPhoto(albumId, pageNum, 1, spreadLeft, totalPages, {
            wholeSpread,
            spreadOpts,
        });
        if (slot?.src) return slot;
    }

    if (isProofRightGridPage(pageNum, opts)) {
        const slot = getGridSlotPhoto(albumId, pageNum, 2, spreadLeft, totalPages, {
            wholeSpread,
            spreadOpts,
        });
        if (slot?.src) return slot;
    }

    const sample = showSamples ? getSampleImageForPage(pageNum) : null;
    return sample ? { src: sample } : { src: null };
}
