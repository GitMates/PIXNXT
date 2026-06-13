import React, { useCallback, useMemo } from 'react';
import AlbumBook from '../AlbumBook';
import BookScene from './BookScene';
import {
    getSpreadContext,
    getSpreadPages,
    getTotalSpreads,
    pageToSpreadIndex,
} from '../albumSpreadUtils';
import '../AlbumBook.css';
import './BookHybridView.css';

const NavPrevIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
    >
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const NavNextIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
    >
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

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

    const prevNavDisabled = spreadIndex <= 0;
    const nextNavDisabled = spreadIndex >= totalSpreads - 1;

    const goToSpread = useCallback(
        (targetSpread) => {
            if (targetSpread < 0 || targetSpread >= totalSpreads) return;
            const { left } = getSpreadPages(targetSpread, totalPages, spreadOpts);
            onPageChange?.(left);
        },
        [onPageChange, spreadOpts, totalPages, totalSpreads]
    );

    const goPrev = useCallback(() => {
        if (prevNavDisabled) return;
        goToSpread(spreadIndex - 1);
    }, [goToSpread, prevNavDisabled, spreadIndex]);

    const goNext = useCallback(() => {
        if (nextNavDisabled) return;
        goToSpread(spreadIndex + 1);
    }, [goToSpread, nextNavDisabled, spreadIndex]);

    if (use3dCover) {
        return (
            <div className="ab-book-hybrid ab-book-hybrid--cover ab-root ab-root--preview">
                <button
                    type="button"
                    className={`ab-nav ab-nav--prev${
                        !prevNavDisabled ? ' ab-nav--enabled' : ''
                    }`}
                    onClick={goPrev}
                    disabled={prevNavDisabled}
                    aria-label="Previous page"
                >
                    <NavPrevIcon />
                </button>

                <div className="ab-book-hybrid-cover-stage">
                    <BookScene
                        album={album}
                        totalPages={totalPages}
                        initialPage={initialPage}
                        onPageChange={onPageChange}
                        showSamples={showSamples}
                        coversOnly
                    />
                </div>

                <button
                    type="button"
                    className={`ab-nav ab-nav--next${
                        !nextNavDisabled ? ' ab-nav--enabled' : ''
                    }`}
                    onClick={goNext}
                    disabled={nextNavDisabled}
                    aria-label="Next page"
                >
                    <NavNextIcon />
                </button>
            </div>
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
