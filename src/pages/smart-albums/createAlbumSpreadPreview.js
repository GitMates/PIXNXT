import { parseGridSizeAspect } from '../../components/smart-albums/albumGridSize';
import {
    enumerateCollectionPlacementPages,
    getEndSpreadPageIndices,
    getSpreadPages,
    getTotalSpreads,
    isCoverInsidePage,
    isEndHalfSpreadIndex,
    isWholeSpreadLayout,
} from '../../components/smart-albums/albumSpreadUtils';
import { computePageCountFromPhotoCount } from './createAlbumLayout';

function resolveSpreadPage(pageNum, pageCount, spreadOpts, pageToPhoto, { isCoverSpread, isEndSpread }) {
    if (spreadOpts.hasCovers && isCoverSpread && isCoverInsidePage(pageNum, pageCount, spreadOpts)) {
        return { kind: 'blank' };
    }
    if (spreadOpts.hasCovers && isEndSpread) {
        const { right: endRight } = getEndSpreadPageIndices(pageCount);
        if (pageNum === endRight) {
            return { kind: 'blank' };
        }
    }

    const entry = pageToPhoto.get(pageNum);
    if (!entry) return { kind: 'empty' };

    return {
        kind: 'photo',
        order: entry.order,
        url: entry.slot?.url ?? null,
        ready: Boolean(entry.slot?.thumbReady && entry.slot?.url),
    };
}

function spreadLabel(spreadIndex, totalSpreads, includeCovers, isEndSpread) {
    if (!includeCovers) return `Spread ${spreadIndex + 1}`;
    if (spreadIndex === 0) return 'Cover';
    if (isEndSpread) return 'End cover';
    return `Spread ${spreadIndex}`;
}

/**
 * Mini spread map for the create page — mirrors editor placement (covers, two-page grid).
 */
export function buildCreateAlbumSpreadPreview({
    previewSlots,
    includeCovers,
    gridLayout,
    pageGridSize,
}) {
    const photoCount = previewSlots?.length ?? 0;
    if (!photoCount) return null;

    const pageCount = computePageCountFromPhotoCount(photoCount, {
        includeCovers,
        gridLayout,
    });
    const spreadOpts = { showCover: includeCovers, hasCovers: includeCovers };
    const placementPages = enumerateCollectionPlacementPages(photoCount, pageCount, {
        showCover: includeCovers,
        hasCovers: includeCovers,
        gridLayout,
    });

    const pageToPhoto = new Map();
    placementPages.forEach((pageNum, photoIndex) => {
        pageToPhoto.set(pageNum, {
            order: photoIndex + 1,
            slot: previewSlots[photoIndex] ?? null,
        });
    });

    const totalSpreads = getTotalSpreads(pageCount, spreadOpts);
    const wholeSpread = isWholeSpreadLayout(gridLayout);
    const spreads = [];

    for (let spreadIndex = 0; spreadIndex < totalSpreads; spreadIndex += 1) {
        const { left, right } = getSpreadPages(spreadIndex, pageCount, spreadOpts);
        const isCoverSpread = includeCovers && spreadIndex === 0;
        const isEndSpread = isEndHalfSpreadIndex(spreadIndex, pageCount, spreadOpts);

        const leftPage = resolveSpreadPage(left, pageCount, spreadOpts, pageToPhoto, {
            isCoverSpread,
            isEndSpread,
        });
        const rightPage =
            right !== left
                ? resolveSpreadPage(right, pageCount, spreadOpts, pageToPhoto, {
                      isCoverSpread,
                      isEndSpread,
                  })
                : null;

        spreads.push({
            index: spreadIndex,
            label: spreadLabel(spreadIndex, totalSpreads, includeCovers, isEndSpread),
            isCoverSpread,
            isEndSpread,
            wholeSpread,
            left: leftPage,
            right: rightPage,
        });
    }

    const referenceSlot = previewSlots[0] ?? null;
    const pageAspect = parseGridSizeAspect(pageGridSize || 'square');

    return {
        spreads,
        referenceSlot,
        pageAspect,
        pageCount,
        photoCount,
        wholeSpread,
    };
}
