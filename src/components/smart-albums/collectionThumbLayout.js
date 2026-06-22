import { photoFillsWholeSpread } from './albumGridSize';
import { getCollectionItemDisplayUrl } from './albumCollection';
import {
    enumerateCollectionPlacementPages,
    enumerateWholeSpreadBlankCoverPlacements,
    getAlbumSpreadOptions,
    isWholeSpreadLayout,
} from './albumSpreadUtils';

function pageToSpreadSide(pageNum) {
    return pageNum % 2 === 0 ? 'left' : 'right';
}

/** Thumbnail preview only — require known dimensions before treating as whole-spread. */
function itemFillsWholeSpreadForThumb(item, pageGridSize) {
    if (item?.width > 0 && item?.height > 0) {
        return photoFillsWholeSpread(item.width, item.height, pageGridSize);
    }
    return false;
}

/**
 * Preview layout for a collection thumbnail — whole spread, half spread, or plain photo.
 * @returns {{ mode: 'spread-whole' | 'spread-half' | 'photo', src: string | null, side?: 'left' | 'right' }}
 */
export function resolveCollectionThumbLayout(index, collectionItems, album, totalPages) {
    const item = collectionItems[index];
    const src = getCollectionItemDisplayUrl(item) || null;
    if (!src) return { mode: 'photo', src: null };

    const gridLayout = album?.grid_layout || 'two-page';
    const pageGridSize = album?.grid_size || 'square';
    const spreadOpts = getAlbumSpreadOptions(album);
    const placementOpts = {
        showCover: spreadOpts.showCover,
        hasCovers: spreadOpts.hasCovers,
        blankCovers: spreadOpts.blankCovers,
        gridLayout,
    };

    if (isWholeSpreadLayout(gridLayout) && spreadOpts.hasCovers && spreadOpts.blankCovers) {
        const photoFillsWhole = collectionItems.map((row) =>
            itemFillsWholeSpreadForThumb(row, pageGridSize)
        );
        const slots = enumerateWholeSpreadBlankCoverPlacements(
            collectionItems.length,
            totalPages,
            { pageGridSize, photoFillsWhole }
        );
        const slot = slots[index];
        if (slot?.type === 'spread') return { mode: 'spread-whole', src };
        if (slot?.type === 'page') {
            return { mode: 'spread-half', src, side: pageToSpreadSide(slot.pageNum) };
        }
    }

    if (isWholeSpreadLayout(gridLayout)) {
        if (itemFillsWholeSpreadForThumb(item, pageGridSize)) {
            return { mode: 'spread-whole', src };
        }
    }

    const pages = enumerateCollectionPlacementPages(
        collectionItems.length,
        totalPages,
        placementOpts
    );
    const pageNum = pages[index];
    if (pageNum != null) {
        if (isWholeSpreadLayout(gridLayout) && itemFillsWholeSpreadForThumb(item, pageGridSize)) {
            return { mode: 'spread-whole', src };
        }
        return { mode: 'spread-half', src, side: pageToSpreadSide(pageNum) };
    }

    return { mode: 'photo', src };
}
