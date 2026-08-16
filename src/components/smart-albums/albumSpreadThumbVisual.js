import {
    albumShowsLeatherCover,
    getSpreadContext,
    getSpreadPages,
    isEndHalfSpreadIndex,
    isInsideCoverLeftPage,
    isInsideCoverSpreadLeft,
    isPreBackHalfSpreadLeftPage,
    isPreBackHalfSpreadRightPage,
    isWholeSpreadLayout,
} from './albumSpreadUtils';
import { getSpreadLeftPageIndex } from './albumSpreadGrid';
import {
    getGridSlotPhoto,
    getInsideCoverRightPhotoSrc,
    getPagePhotoOverride,
    getSpreadPhotoOverride,
    resolveCoverImageSrc,
} from './albumPagePhotos';
import { parseSlotKey } from './albumSwapMarks';

function getSpreadPageImage(album, pageNum, totalPages) {
    const albumId = album?.id;
    const spreadOpts = getSpreadContext(album, totalPages);
    if ((pageNum === 0 || pageNum === 1) && spreadOpts.hasCovers) {
        return resolveCoverImageSrc(album, { showSamples: false });
    }
    if (isInsideCoverLeftPage(pageNum, spreadOpts)) {
        return null;
    }
    if (isInsideCoverRightPageSafe(pageNum, spreadOpts)) {
        return getInsideCoverRightPhotoSrc(albumId, { showSamples: false });
    }
    if (isPreBackHalfSpreadRightPage(pageNum, totalPages, spreadOpts)) {
        return null;
    }
    const directSrc = getPagePhotoOverride(albumId, pageNum);
    if (directSrc) return directSrc;
    const spreadLeft = getSpreadLeftPageIndex(pageNum, { ...spreadOpts, totalPages });
    const cellId = pageNum === spreadLeft ? 1 : 2;
    const slot = getGridSlotPhoto(albumId, pageNum, cellId, spreadLeft, totalPages, {
        wholeSpread:
            isWholeSpreadLayout(album?.grid_layout) &&
            !isInsideCoverSpreadLeft(spreadLeft, totalPages, spreadOpts) &&
            !isPreBackHalfSpreadLeftPage(spreadLeft, totalPages, spreadOpts),
        spreadOpts,
    });
    return slot.src || null;
}

function isInsideCoverRightPageSafe(pageNum, spreadOpts) {
    return spreadOpts?.hasCovers === true && pageNum === 3;
}

/** Live spread thumb visual — same source as the editor filmstrip. */
export function resolveSpreadThumbVisual(album, spreadIndex, totalPages) {
    const spreadOpts = getSpreadContext(album, totalPages);
    const { left, right } = getSpreadPages(spreadIndex, totalPages, spreadOpts);
    const isCover = spreadOpts.hasCovers && spreadIndex === 0;
    const isEndSpread = isEndHalfSpreadIndex(spreadIndex, totalPages, spreadOpts);
    const isInsideCover = isInsideCoverSpreadLeft(left, totalPages, spreadOpts);
    const isPreBack = isPreBackHalfSpreadLeftPage(left, totalPages, spreadOpts);
    const spreadSrc =
        !isCover && !isEndSpread && !isInsideCover && !isPreBack
            ? getSpreadPhotoOverride(album?.id, left)
            : null;
    const coverSrc =
        isCover || isEndSpread ? resolveCoverImageSrc(album, { showSamples: false }) : null;
    const leftSrc = getSpreadPageImage(album, left, totalPages);
    const rightSrc =
        right !== left && !isPreBack ? getSpreadPageImage(album, right, totalPages) : null;

    return {
        leftPage: left,
        rightPage: right,
        isCover,
        isEndSpread,
        spreadSrc,
        coverSrc,
        leftSrc,
        rightSrc,
        showSpreadFull: Boolean(spreadSrc),
        useLeather: (isCover || isEndSpread) && albumShowsLeatherCover(album, coverSrc),
    };
}

/** Which half of a spread a swap slot key belongs to. */
export function resolveSwapSlotSide(slotKey, album, totalPages) {
    if (!slotKey) return null;
    const { pageNum, cellId } = parseSlotKey(slotKey);
    const spreadOpts = getSpreadContext(album, totalPages);
    const spreadLeft = getSpreadLeftPageIndex(pageNum, { ...spreadOpts, totalPages });
    if (cellId === 2 || (cellId !== 1 && pageNum !== spreadLeft)) return 'right';
    if (cellId === 1 || pageNum === spreadLeft) return 'left';
    return null;
}

export function spreadThumbHasImage(visual) {
    if (!visual) return false;
    return Boolean(
        visual.showSpreadFull
            ? visual.spreadSrc
            : visual.coverSrc || visual.leftSrc || visual.rightSrc
    );
}
