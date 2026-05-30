import React from 'react';
import AlbumFlipPage from './AlbumFlipPage';

const noopRef = { current: null };

/**
 * Direct spread render for client preview — avoids StPageFlip DOM clones
 * so reload always matches the editor at the same spread.
 */
export default function AlbumPreviewSpread({
    album,
    leftPage,
    rightPage,
    totalPages,
    isCoverSpread,
    pageWidth,
    pageHeight,
    showSamples = false,
    transformRevision = 0,
}) {
    const pageProps = {
        album,
        totalPages,
        editable: false,
        spreadEdit: false,
        placementMode: 'single',
        showSamples,
        previewMode: true,
        showGridComments: false,
        transformRevision,
    };

    return (
        <div
            className={`ab-preview-static-spread${isCoverSpread ? ' ab-preview-static-spread--cover' : ''}`}
            style={{ width: pageWidth * 2, height: pageHeight }}
        >
            <div
                className="ab-preview-static-page"
                style={{ width: pageWidth, height: pageHeight }}
            >
                <AlbumFlipPage
                    ref={noopRef}
                    key={`preview-left-${leftPage}-${transformRevision}`}
                    pageNum={leftPage}
                    {...pageProps}
                />
            </div>
            {!isCoverSpread && rightPage > leftPage && (
                <div
                    className="ab-preview-static-page"
                    style={{ width: pageWidth, height: pageHeight }}
                >
                    <AlbumFlipPage
                        ref={noopRef}
                        key={`preview-right-${rightPage}-${transformRevision}`}
                        pageNum={rightPage}
                        {...pageProps}
                    />
                </div>
            )}
        </div>
    );
}
