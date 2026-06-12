import {
    getGridSlotPhoto,
    getInsideCoverRightPhotoSrc,
    getPagePhotoOverride,
    getSpreadPhotoOverride,
    resolveCoverImageSrc,
} from './albumPagePhotos';
import { getAlbumLayoutPhotoCount } from './albumCollection';
import {
    getProofCellPhotoIndex,
    getSpreadLeftPageIndex,
    isProofLeftGridPage,
    isProofRightGridPage,
} from './albumSpreadGrid';
import {
    getAlbumSpreadOptions,
    getEndSpreadPageRole,
    getLastSpreadInfo,
    getPreBackSpreadPageRole,
    isCoverInsidePage,
    isEndHalfSpreadLeftPage,
    isFrontCoverSpreadLeft,
    isInsideCoverLeftPage,
    isInsideCoverRightPage,
    isInsideCoverSpreadLeft,
    isPreBackHalfSpreadLeftPage,
    isPreBackHalfSpreadRightPage,
    isWholeSpreadLayout,
} from './albumSpreadUtils';
import { getSampleImageForPage } from './sampleAlbumImages';

function pageHasGridPhoto(album, albumId, pageNum, totalPages, wholeSpread, spreadOpts) {
    if (!albumId || pageNum < 0) return false;
    const opts = { ...spreadOpts, totalPages };
    const spreadLeft = getSpreadLeftPageIndex(pageNum, opts);
    if (isProofLeftGridPage(pageNum, opts)) {
        const slot = getGridSlotPhoto(albumId, pageNum, 1, spreadLeft, totalPages, {
            wholeSpread,
            spreadOpts: opts,
        });
        if (slot?.src) return true;
    }
    if (isProofRightGridPage(pageNum, opts)) {
        const slot = getGridSlotPhoto(albumId, pageNum, 2, spreadLeft, totalPages, {
            wholeSpread,
            spreadOpts: opts,
        });
        if (slot?.src) return true;
    }
    return false;
}

/**
 * Grid cell slot — mirrors AlbumPageGrid.resolveSlotImage.
 */
export function resolveAlbumGridSlot(
    album,
    pageNum,
    totalPages,
    { placementMode = 'single', showSamples = false, spreadOpts: spreadOptsIn } = {}
) {
    const albumId = album?.id;
    const collectionCount = albumId ? getAlbumLayoutPhotoCount(albumId, album) : 0;
    const spreadOpts = spreadOptsIn ?? getAlbumSpreadOptions(album, { collectionCount });
    const spreadCtx = { ...spreadOpts, totalPages };
    const spreadLeft = getSpreadLeftPageIndex(pageNum, spreadCtx);

    const endHalfSpreadLeft = isEndHalfSpreadLeftPage(spreadLeft, totalPages, spreadOpts);
    const isWholeSpreadAlbum = isWholeSpreadLayout(album?.grid_layout);
    const spreadWholePhoto = Boolean(albumId && getSpreadPhotoOverride(albumId, spreadLeft));
    const insideCoverSpread =
        isInsideCoverSpreadLeft(spreadLeft, totalPages, spreadOpts) &&
        (!isWholeSpreadAlbum || !spreadWholePhoto);
    const preBackHalfSpread = isPreBackHalfSpreadLeftPage(spreadLeft, totalPages, spreadOpts);
    const frontCoverSpread = isFrontCoverSpreadLeft(spreadLeft, spreadOpts);
    const wholePlacement =
        placementMode === 'whole' &&
        !endHalfSpreadLeft &&
        !insideCoverSpread &&
        !preBackHalfSpread &&
        !frontCoverSpread;
    const wholeSpread = wholePlacement;

    let cellId = null;
    if (isProofLeftGridPage(pageNum, spreadCtx) && !endHalfSpreadLeft) {
        cellId = 1;
    } else if (isProofRightGridPage(pageNum, spreadCtx) && !(spreadOpts.hasCovers && pageNum === 1)) {
        cellId = 2;
    }

    if (!cellId) {
        return { src: null, panoramic: null };
    }

    const photoIndex = getProofCellPhotoIndex(pageNum, cellId, totalPages, spreadCtx);
    const slot = getGridSlotPhoto(albumId, photoIndex, cellId, spreadLeft, totalPages, {
        wholeSpread,
        spreadOpts: spreadCtx,
    });
    if (slot?.src) return slot;

    const sample = showSamples ? getSampleImageForPage(pageNum) : null;
    return sample ? { src: sample, panoramic: null } : { src: null, panoramic: null };
}

/**
 * Full page slot — mirrors AlbumFlipPage (preview / single placement).
 */
export function resolveAlbumPageSlot(
    album,
    pageNum,
    totalPages,
    { placementMode = 'single', showSamples = false, spreadOpts: spreadOptsIn } = {}
) {
    if (pageNum == null || pageNum < 0 || pageNum >= totalPages) {
        return { src: null, panoramic: null };
    }

    const albumId = album?.id;
    const collectionCount = albumId ? getAlbumLayoutPhotoCount(albumId, album) : 0;
    const spreadOpts = spreadOptsIn ?? getAlbumSpreadOptions(album, { collectionCount });
    const coverLayoutOpts =
        spreadOpts.hasCovers || album?.has_covers === true
            ? { ...spreadOpts, hasCovers: true, showCover: true }
            : spreadOpts;
    const gridOpts = { ...spreadOpts, totalPages };
    const isWholeSpreadAlbum = isWholeSpreadLayout(album?.grid_layout);

    if (isCoverInsidePage(pageNum, totalPages, coverLayoutOpts)) {
        return { src: null, panoramic: null };
    }

    const { right: lastSpreadRight } = getLastSpreadInfo(totalPages, spreadOpts);
    const rightPageHasPhoto = pageHasGridPhoto(
        album,
        albumId,
        lastSpreadRight,
        totalPages,
        isWholeSpreadAlbum,
        spreadOpts
    );
    const endSpreadRole = getEndSpreadPageRole(pageNum, totalPages, {
        ...spreadOpts,
        rightPageHasPhoto,
    });
    const preBackSpreadRole = getPreBackSpreadPageRole(pageNum, totalPages, spreadOpts);
    const spreadLeftForPage = getSpreadLeftPageIndex(pageNum, gridOpts);
    const spreadWholePhoto = Boolean(albumId && getSpreadPhotoOverride(albumId, spreadLeftForPage));
    const useHalfSpreadLayout = !isWholeSpreadAlbum || !spreadWholePhoto;

    if (useHalfSpreadLayout) {
        if (
            preBackSpreadRole === 'half-blank' ||
            isPreBackHalfSpreadRightPage(pageNum, totalPages, spreadOpts)
        ) {
            return { src: null, panoramic: null };
        }
        if (endSpreadRole === 'half-blank') {
            return { src: null, panoramic: null };
        }
        if (isInsideCoverLeftPage(pageNum, spreadOpts)) {
            return { src: null, panoramic: null };
        }
    }

    if (spreadOpts.hasCovers && pageNum === 1) {
        const coverSrc = resolveCoverImageSrc(album, { showSamples });
        return coverSrc ? { src: coverSrc, panoramic: 'right' } : { src: null, panoramic: null };
    }

    if (endSpreadRole === 'half-left' && spreadOpts.hasCovers) {
        const coverSrc = resolveCoverImageSrc(album, { showSamples });
        return coverSrc ? { src: coverSrc, panoramic: 'left' } : { src: null, panoramic: null };
    }

    if (isInsideCoverRightPage(pageNum, totalPages, spreadOpts)) {
        const src = getInsideCoverRightPhotoSrc(albumId, { showSamples });
        return src ? { src, panoramic: null } : { src: null, panoramic: null };
    }

    if (useHalfSpreadLayout && preBackSpreadRole === 'half-left') {
        const src =
            (albumId && getPagePhotoOverride(albumId, pageNum)) ||
            resolveCoverImageSrc(album, { showSamples });
        return src ? { src, panoramic: null } : { src: null, panoramic: null };
    }

    if (isProofLeftGridPage(pageNum, gridOpts) && !isEndHalfSpreadLeftPage(spreadLeftForPage, totalPages, spreadOpts)) {
        return resolveAlbumGridSlot(album, pageNum, totalPages, {
            placementMode,
            showSamples,
            spreadOpts,
        });
    }

    if (isProofRightGridPage(pageNum, gridOpts) && !(spreadOpts.hasCovers && pageNum === 1)) {
        return resolveAlbumGridSlot(album, pageNum, totalPages, {
            placementMode,
            showSamples,
            spreadOpts,
        });
    }

    return { src: null, panoramic: null };
}

export function isPanoramicSpreadPair(leftSlot, rightSlot) {
    return (
        leftSlot?.src &&
        rightSlot?.src &&
        leftSlot.src === rightSlot.src &&
        leftSlot.panoramic === 'left' &&
        rightSlot.panoramic === 'right'
    );
}
