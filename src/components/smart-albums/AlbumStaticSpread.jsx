import React from 'react';
import AlbumFlipPage from './AlbumFlipPage';
import { getSpreadPages } from './albumSpreadUtils';

/**
 * Editor spread view — two pages side-by-side without react-pageflip.
 * Avoids reload glitches from page-flip DOM/state desync.
 */
export default function AlbumStaticSpread({
    spreadIndex,
    totalPages,
    album,
    pageWidth,
    pageHeight,
    editable = false,
    spreadEdit = false,
    placementMode = 'single',
    showSamples = true,
    previewMode = false,
}) {
    const { left, right } = getSpreadPages(spreadIndex, totalPages, { showCover: true });
    const pageStyle = { width: pageWidth, height: pageHeight };
    const pageProps = {
        album,
        totalPages,
        editable,
        spreadEdit,
        placementMode,
        showSamples,
        previewMode,
    };

    return (
        <div
            className={`ab-static-spread${spreadIndex === 0 ? ' ab-static-spread--cover' : ''}`}
            style={{ width: pageWidth * 2, height: pageHeight }}
        >
            <div className="ab-static-spread-page" style={pageStyle}>
                <AlbumFlipPage pageNum={left} {...pageProps} />
            </div>
            <div className="ab-static-spread-page" style={pageStyle}>
                {right !== left ? (
                    <AlbumFlipPage pageNum={right} {...pageProps} />
                ) : (
                    <div className="ab-page-empty" aria-hidden />
                )}
            </div>
        </div>
    );
}
