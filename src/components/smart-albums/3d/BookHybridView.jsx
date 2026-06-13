import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
 * Hybrid preview: 3D covers with open/close animation, 2D AlbumBook for inner spreads.
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

    const [sceneBridge, setSceneBridge] = useState(null);

    useEffect(() => {
        if (!sceneBridge) return;
        if (initialPage === sceneBridge.targetPage) {
            setSceneBridge(null);
        }
    }, [initialPage, sceneBridge]);

    const onCoverSpread = spreadOpts.hasCovers && isCoverSpread(spreadIndex, totalSpreads);
    const show3dScene = onCoverSpread || sceneBridge != null;

    const navLocked = sceneBridge != null;

    const prevNavDisabled = navLocked || spreadIndex <= 0;
    const nextNavDisabled = navLocked || spreadIndex >= totalSpreads - 1;

    const handleCoverTransitionComplete = useCallback(
        (pageIdx) => {
            onPageChange?.(pageIdx);
        },
        [onPageChange]
    );

    const handleInnerPageChange = useCallback(
        (pageIdx) => {
            const nextSpread = pageToSpreadIndex(pageIdx, { ...spreadOpts, totalPages });
            const closingFrontCover = spreadIndex === 1 && nextSpread === 0;
            const closingBackCover =
                spreadIndex === totalSpreads - 2 && nextSpread === totalSpreads - 1;

            if (closingFrontCover || closingBackCover) {
                setSceneBridge({ fromSpread: spreadIndex, targetPage: pageIdx });
                return;
            }

            onPageChange?.(pageIdx);
        },
        [onPageChange, spreadIndex, spreadOpts, totalPages, totalSpreads]
    );

    const goPrev = useCallback(() => {
        if (prevNavDisabled || !show3dScene) return;
        if (spreadIndex === totalSpreads - 1) {
            const { left } = getSpreadPages(totalSpreads - 2, totalPages, spreadOpts);
            onPageChange?.(left);
        }
    }, [onPageChange, prevNavDisabled, show3dScene, spreadIndex, spreadOpts, totalPages, totalSpreads]);

    const goNext = useCallback(() => {
        if (nextNavDisabled || !show3dScene) return;
        if (spreadIndex === 0) {
            const { left } = getSpreadPages(1, totalPages, spreadOpts);
            onPageChange?.(left);
        }
    }, [nextNavDisabled, onPageChange, show3dScene, spreadIndex, spreadOpts, totalPages]);

    const sceneInitialPage = sceneBridge?.targetPage ?? initialPage;
    const sceneFromSpread = sceneBridge?.fromSpread ?? null;
    const sceneKey = `${album?.id ?? 'album'}-3d-cover`;

    if (show3dScene) {
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
                        key={sceneKey}
                        album={album}
                        totalPages={totalPages}
                        initialPage={sceneInitialPage}
                        animateFromSpread={sceneFromSpread}
                        onTransitionComplete={handleCoverTransitionComplete}
                        showSamples={showSamples}
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
                onPageChange={handleInnerPageChange}
                showSamples={showSamples}
                coverHandoff3d
                {...albumBookProps}
            />
        </div>
    );
}
