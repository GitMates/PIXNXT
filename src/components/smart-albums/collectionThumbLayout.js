import { photoFillsWholeSpread } from './albumGridSize';
import { getCollectionItemDisplayUrl, getAlbumCollectionRevision, isCoverWrapCollectionItem } from './albumCollection';
import { getCollectionItemPlacementInfo } from './albumPagePhotos';
import {
    enumerateCollectionPlacementPages,
    enumerateCoverCollectionPlacements,
    enumerateWholeSpreadBlankCoverPlacements,
    formatOverviewSpreadLabel,
    getAlbumSpreadOptions,
    isWholeSpreadLayout,
    pageToSpreadIndex,
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

function layoutFromPlacementSlot(slot, src) {
    if (!slot) return null;
    if (slot.type === 'book-wrap' || slot.type === 'spread') {
        return { mode: 'spread-whole', src };
    }
    if (slot.type === 'page') {
        return { mode: 'spread-half', src, side: pageToSpreadSide(slot.pageNum) };
    }
    return null;
}

/** Placement slots for inner photos — mirrors autoPlaceCollectionItems (excludes cover-wrap). */
function getCollectionPlacementSlots(collectionItems, album, totalPages) {
    const gridLayout = album?.grid_layout || 'two-page';
    const pageGridSize = album?.grid_size || 'square';
    const spreadOpts = getAlbumSpreadOptions(album);
    const placementItems = spreadOpts.blankCovers
        ? collectionItems.filter((row) => !isCoverWrapCollectionItem(row))
        : collectionItems;

    if (!placementItems.length) {
        return { placementItems, slots: [] };
    }

    const photoFillsWhole = placementItems.map((row) =>
        itemFillsWholeSpreadForThumb(row, pageGridSize)
    );

    if (isWholeSpreadLayout(gridLayout) && spreadOpts.hasCovers && spreadOpts.blankCovers) {
        return {
            placementItems,
            slots: enumerateWholeSpreadBlankCoverPlacements(placementItems.length, totalPages, {
                pageGridSize,
                photoFillsWhole,
            }),
        };
    }

    if (spreadOpts.hasCovers) {
        return {
            placementItems,
            slots: enumerateCoverCollectionPlacements(placementItems.length, totalPages, {
                gridLayout,
                blankCovers: spreadOpts.blankCovers,
            }),
        };
    }

    return { placementItems, slots: [] };
}

/**
 * Preview layout for a collection thumbnail — whole spread, half spread, or plain photo.
 * @returns {{ mode: 'spread-whole' | 'spread-half' | 'photo', src: string | null, side?: 'left' | 'right' }}
 */
export function resolveCollectionThumbLayout(index, collectionItems, album, totalPages) {
    const item = collectionItems[index];
    const cacheBust = album?.id ? getAlbumCollectionRevision(album.id) : null;
    const src = getCollectionItemDisplayUrl(item, { cacheBust }) || null;
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

    if (spreadOpts.blankCovers && isCoverWrapCollectionItem(item)) {
        return { mode: 'spread-whole', src };
    }

    const placement = getCollectionItemPlacementInfo(album?.id, item.id);
    if (placement) {
        if (placement.mode === 'spread') {
            return { mode: 'spread-whole', src };
        }
        return { mode: 'spread-half', src, side: pageToSpreadSide(placement.pageNum) };
    }

    const { placementItems, slots } = getCollectionPlacementSlots(
        collectionItems,
        album,
        totalPages
    );
    const placementIndex = placementItems.findIndex((row) => row.id === item.id);
    if (placementIndex >= 0) {
        const slotLayout = layoutFromPlacementSlot(slots[placementIndex], src);
        if (slotLayout) return slotLayout;
    }

    if (isWholeSpreadLayout(gridLayout)) {
        if (itemFillsWholeSpreadForThumb(item, pageGridSize)) {
            return { mode: 'spread-whole', src };
        }
    }

    const pages = enumerateCollectionPlacementPages(
        placementItems.length,
        totalPages,
        placementOpts
    );
    const pageNum = placementIndex >= 0 ? pages[placementIndex] : pages[index];
    if (pageNum != null) {
        if (isWholeSpreadLayout(gridLayout) && itemFillsWholeSpreadForThumb(item, pageGridSize)) {
            return { mode: 'spread-whole', src };
        }
        return { mode: 'spread-half', src, side: pageToSpreadSide(pageNum) };
    }

    return { mode: 'photo', src };
}

function leftPageFromPlacementSlot(slot) {
    if (!slot) return null;
    if (slot.type === 'book-wrap' || slot.type === 'spread') {
        return slot.leftPage;
    }
    if (slot.type === 'page') {
        return slot.pageNum;
    }
    return null;
}

function spreadLabelFromLeftPage(leftPage, totalPages, spreadOpts) {
    if (leftPage == null || Number.isNaN(leftPage)) return '';
    const spreadIndex = pageToSpreadIndex(leftPage, { ...spreadOpts, totalPages });
    return formatOverviewSpreadLabel(spreadIndex, totalPages, spreadOpts);
}

/** Spread number label for a collection thumbnail — matches flipbook counter (e.g. 3/6 → "3"). */
export function resolveCollectionSpreadLabel(index, collectionItems, album, totalPages) {
    const item = collectionItems[index];
    if (!item) return '';

    const gridLayout = album?.grid_layout || 'two-page';
    const spreadOpts = getAlbumSpreadOptions(album);
    const placementOpts = {
        showCover: spreadOpts.showCover,
        hasCovers: spreadOpts.hasCovers,
        blankCovers: spreadOpts.blankCovers,
        gridLayout,
    };

    if (spreadOpts.blankCovers && isCoverWrapCollectionItem(item)) {
        return formatOverviewSpreadLabel(0, totalPages, spreadOpts);
    }

    const placement = getCollectionItemPlacementInfo(album?.id, item.id);
    if (placement) {
        const leftPage =
            placement.mode === 'spread' ? placement.spreadLeft : placement.pageNum;
        return spreadLabelFromLeftPage(leftPage, totalPages, spreadOpts);
    }

    const { placementItems, slots } = getCollectionPlacementSlots(
        collectionItems,
        album,
        totalPages
    );
    const placementIndex = placementItems.findIndex((row) => row.id === item.id);
    if (placementIndex >= 0 && slots[placementIndex]) {
        const leftPage = leftPageFromPlacementSlot(slots[placementIndex]);
        if (leftPage != null) {
            return spreadLabelFromLeftPage(leftPage, totalPages, spreadOpts);
        }
    }

    const pages = enumerateCollectionPlacementPages(
        placementItems.length,
        totalPages,
        placementOpts
    );
    const pageNum = placementIndex >= 0 ? pages[placementIndex] : pages[index];
    return spreadLabelFromLeftPage(pageNum, totalPages, spreadOpts);
}
