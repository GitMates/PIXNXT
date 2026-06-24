import React from 'react';
import { parseGridSizeAspect } from './albumGridSize';
import { getAlbumCoverColor } from './albumCoverColor';
import { resolveFrontCoverDisplayText } from './albumCoverText';
import { getCoverLeatherSurfaceStyle } from './coverLeatherSurface';

/** Small leather cover face for overview / swap-picker thumbnails. */
export default function OverviewLeatherCover({ album, showTitle = false }) {
    const albumId = album?.id;
    const pageAspect = parseGridSizeAspect(album?.grid_size || 'square');
    const coverColorId = albumId ? getAlbumCoverColor(albumId) : 'cream';
    const coverText =
        showTitle && albumId ? resolveFrontCoverDisplayText(album, albumId) : '';
    const style = {
        ...getCoverLeatherSurfaceStyle(coverColorId, {
            aspect: pageAspect,
            ...(showTitle && coverText ? { title: coverText } : {}),
        }),
        backgroundSize: '100% 100%',
    };

    return (
        <span
            className="ab-cover-leather-canvas ab-cover-leather--flat ab-overview-leather-cover"
            style={style}
            aria-hidden={!showTitle || !coverText}
            aria-label={showTitle && coverText ? coverText : undefined}
        />
    );
}
