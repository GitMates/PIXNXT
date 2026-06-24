import { photoFillsWholeSpread } from '../../components/smart-albums/albumGridSize';
import {
    enumerateWholeSpreadBlankCoverPlacements,
    isWholeSpreadLayout,
} from '../../components/smart-albums/albumSpreadUtils';
import { computePageCountFromPhotoCount } from './createAlbumLayout';

function pageToSpreadSide(pageNum) {
    return pageNum % 2 === 0 ? 'left' : 'right';
}

function slotFillsWholeSpread(slot, pageGridSize) {
    if (slot?.width > 0 && slot?.height > 0) {
        return photoFillsWholeSpread(slot.width, slot.height, pageGridSize);
    }
    return false;
}

/**
 * Preview layout for create-album upload thumbnails.
 * @returns {{ mode: 'spread-whole' | 'spread-half' | 'photo', side?: 'left' | 'right' }}
 */
export function resolveCreateUploadPreviewLayout(index, previewSlots, {
    pageGridSize = 'square',
    gridLayout = 'whole-spread',
    blankCovers = true,
    includeCovers = true,
} = {}) {
    const slot = previewSlots[index];
    if (!slot) return { mode: 'photo' };

    if (isWholeSpreadLayout(gridLayout) && blankCovers && includeCovers) {
        const photoCount = previewSlots.length;
        const pageCount = computePageCountFromPhotoCount(photoCount, {
            includeCovers,
            blankCovers,
            gridLayout,
        });
        const photoFillsWhole = previewSlots.map((row) => slotFillsWholeSpread(row, pageGridSize));
        const placements = enumerateWholeSpreadBlankCoverPlacements(photoCount, pageCount, {
            pageGridSize,
            photoFillsWhole,
        });
        const placement = placements[index];
        if (placement?.type === 'spread') return { mode: 'spread-whole' };
        if (placement?.type === 'page') {
            return { mode: 'spread-half', side: pageToSpreadSide(placement.pageNum) };
        }
    }

    if (isWholeSpreadLayout(gridLayout) && slotFillsWholeSpread(slot, pageGridSize)) {
        return { mode: 'spread-whole' };
    }

    if (isWholeSpreadLayout(gridLayout)) {
        return { mode: 'spread-half', side: index % 2 === 0 ? 'right' : 'left' };
    }

    return { mode: 'photo' };
}
