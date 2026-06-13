import React, { useMemo } from 'react';
import AlbumFlipPage from '../AlbumFlipPage';
import { AlbumBookPageContext } from '../AlbumBookPageContext';
import { getSpreadContext, getSpreadPages } from '../albumSpreadUtils';
import { parseGridSizeAspect } from '../albumGridSize';
import './AlbumSpreadProofOverlay.css';

/**
 * Transparent 2D spread layer aligned over the 3D book — reuses AlbumFlipPage
 * for comment, swap, and transform-aware photo slots.
 */
export default function AlbumSpreadProofOverlay({
    album,
    totalPages,
    spreadIndex,
    pageContextValue,
    placementMode = 'single',
    showSamples = false,
    transformRevision = 0,
    photoRevision = 0,
    hidden = false,
}) {
    const spreadOpts = useMemo(
        () => getSpreadContext(album, totalPages),
        [album, totalPages]
    );
    const { left, right } = useMemo(
        () => getSpreadPages(spreadIndex, totalPages, spreadOpts),
        [spreadIndex, totalPages, spreadOpts]
    );
    const pageAspect = parseGridSizeAspect(album?.grid_size);
    const spreadAspect = pageAspect * 2;

    if (hidden || spreadIndex == null) return null;

    return (
        <AlbumBookPageContext.Provider value={pageContextValue}>
            <div
                className="ab-spread-proof-overlay"
                aria-hidden={hidden}
                style={{ aspectRatio: spreadAspect }}
            >
                <div className="ab-spread-proof-overlay__spread">
                    <AlbumFlipPage
                        album={album}
                        pageNum={left}
                        totalPages={totalPages}
                        placementMode={placementMode}
                        showSamples={showSamples}
                        previewMode
                        transformRevision={transformRevision}
                        photoRevision={photoRevision}
                    />
                    <AlbumFlipPage
                        album={album}
                        pageNum={right}
                        totalPages={totalPages}
                        placementMode={placementMode}
                        showSamples={showSamples}
                        previewMode
                        transformRevision={transformRevision}
                        photoRevision={photoRevision}
                    />
                </div>
            </div>
        </AlbumBookPageContext.Provider>
    );
}
