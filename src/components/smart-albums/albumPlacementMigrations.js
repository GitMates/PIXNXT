/**
 * Cover / inside-cover / end-half placement migrations shared by workspace
 * hydrate and the editor. Must finish BEFORE HTMLFlipBook remounts — otherwise
 * renderOnlyPageLengthChange freezes a cover-wrap leaf onto Spread 01 until reload.
 */
import {
    albumUsesBookWrap,
    getAlbumSpreadOptions,
    getEndSpreadPageIndices,
    isWholeSpreadLayout,
} from './albumSpreadUtils';
import {
    migrateBackCoverUsesBookWrap,
    migrateEndHalfSpreadToLeftPage,
    migrateFrontCoverToFullSpread,
    migrateInsideCoverSpreadToPageTwo,
    migrateMiskeyedInnerSpreadPhotos,
    migratePreBackHalfSpreadToLeftPage,
    migrateWholeSpreadPagePhotosToSpreadKeys,
    migrateWholeSpreadPhotoOffRightPage,
    reconcileCoverWrapPlacements,
} from './albumPagePhotos';
import { clearAlbumSpineBoundsOverride } from './albumSpineSettings';
import {
    migrateInsideCoverSpreadTransform,
    migrateMiskeyedInnerSpreadTransforms,
} from './albumPageTransforms';

/**
 * @param {string} albumId
 * @param {object|null} albumMeta
 * @param {number} totalPages
 * @returns {boolean} true when any placement / transform changed
 */
export function runAlbumPlacementMigrations(albumId, albumMeta, totalPages) {
    if (!albumId || totalPages == null || !Number.isFinite(Number(totalPages))) {
        return false;
    }
    const pages = Number(totalPages);
    let changed = false;

    const spreadOpts = getAlbumSpreadOptions(albumMeta);
    // Treat explicit has_covers as covered even when page_count briefly undershoots
    // MIN_ALBUM_PAGES during hydrate (avoids wrapping Spread 01 as an end-half).
    const hasCovers = spreadOpts.hasCovers || albumMeta?.has_covers === true;
    const wholeSpreadAlbum = isWholeSpreadLayout(albumMeta?.grid_layout);

    if (migrateEndHalfSpreadToLeftPage(albumId, pages, albumMeta)) changed = true;
    if (migrateMiskeyedInnerSpreadPhotos(albumId, pages, albumMeta)) changed = true;
    if (migrateWholeSpreadPhotoOffRightPage(albumId, albumMeta)) changed = true;

    if (wholeSpreadAlbum || !hasCovers) {
        if (migrateWholeSpreadPagePhotosToSpreadKeys(albumId, pages, albumMeta)) {
            changed = true;
        }
    }

    if (hasCovers) {
        if (migrateFrontCoverToFullSpread(albumId)) changed = true;
        if (albumUsesBookWrap(albumMeta) && migrateBackCoverUsesBookWrap(albumId, pages, albumMeta)) {
            changed = true;
        }
        if (migrateInsideCoverSpreadToPageTwo(albumId, pages, albumMeta)) changed = true;
        if (migrateInsideCoverSpreadTransform(albumId)) changed = true;
        if (migratePreBackHalfSpreadToLeftPage(albumId, pages, albumMeta)) changed = true;
        if (migrateEndHalfSpreadToLeftPage(albumId, pages, albumMeta)) changed = true;
        if (reconcileCoverWrapPlacements(albumId, albumMeta)) {
            clearAlbumSpineBoundsOverride(albumId);
            changed = true;
        }
        const { left: endLeft } = getEndSpreadPageIndices(pages);
        if (migrateMiskeyedInnerSpreadTransforms(albumId, endLeft)) changed = true;
    }

    return changed;
}
