import React, { useMemo } from 'react';
import AlbumBook from '../AlbumBook';
import BookScene from './BookScene';
import { getSpreadContext, getTotalSpreads, pageToSpreadIndex } from '../albumSpreadUtils';
import './BookHybridView.css';

/** Front or back cover spread — 3D closed book only. */
export function isCoverSpread(spreadIndex, totalSpreads) {
    return spreadIndex <= 0 || spreadIndex >= totalSpreads - 1;
}

/**
 * Hybrid preview: 3D closed book on covers, 2D AlbumBook for inner pages and turns.
 */
export default function BookHybridView({
    album,
    totalPages,
    initialPage,
    onPageChange,
    showSamples = false,
    albumBookProps = {},
}) {
    const spreadOpts = useMemo(() => getSpreadContext(album, totalPages), [album, totalPages]);
    const totalSpreads = useMemo(
        () => getTotalSpreads(totalPages, spreadOpts),
        [totalPages, spreadOpts]
    );
    const spreadIndex = useMemo(
        () => pageToSpreadIndex(initialPage ?? 0, { ...spreadOpts, totalPages }),
        [initialPage, spreadOpts, totalPages]
    );

    const use3dCover = spreadOpts.hasCovers && isCoverSpread(spreadIndex, totalSpreads);

    if (use3dCover) {
        return (
            <BookScene
                album={album}
                totalPages={totalPages}
                initialPage={initialPage}
                onPageChange={onPageChange}
                showSamples={showSamples}
                coversOnly
            />
        );
    }

    return (
        <div className="ab-book-hybrid">
            <AlbumBook
                album={album}
                totalPages={totalPages}
                initialPage={initialPage}
                onPageChange={onPageChange}
                showSamples={showSamples}
                {...albumBookProps}
            />
        </div>
    );
}
