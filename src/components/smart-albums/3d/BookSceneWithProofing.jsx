import React, { useCallback, useEffect, useMemo, useState } from 'react';
import BookScene from './BookScene';
import AlbumSpreadProofOverlay from './AlbumSpreadProofOverlay';
import useAlbumBookProofing from '../useAlbumBookProofing';
import {
    getSpreadContext,
    getSpreadPages,
    getTotalSpreads,
    pageToSpreadIndex,
} from '../albumSpreadUtils';
import '../AlbumBook.css';
import './BookSceneWithProofing.css';

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

function isClosedBackSpread(spreadIndex, totalSpreads, spreadOpts) {
    return spreadOpts.hasCovers && totalSpreads > 1 && spreadIndex >= totalSpreads - 1;
}

function isOpenInnerSpread(spreadIndex, totalSpreads, spreadOpts) {
    if (spreadIndex < 0 || spreadIndex >= totalSpreads) return false;
    if (!spreadOpts.hasCovers) return true;
    if (spreadIndex <= 0) return false;
    return !isClosedBackSpread(spreadIndex, totalSpreads, spreadOpts);
}

/**
 * Full 3D book with a transparent 2D spread overlay for proofing (comment, swap, transforms).
 */
export default function BookSceneWithProofing({
    album,
    totalPages,
    initialPage,
    onPageChange,
    showSamples = false,
    albumBookProps = {},
    photoRevision = 0,
}) {
    const spreadOpts = useMemo(
        () => getSpreadContext(album, totalPages),
        [album, totalPages]
    );
    const totalSpreads = useMemo(
        () => getTotalSpreads(totalPages, spreadOpts),
        [totalPages, spreadOpts]
    );
    const initialSpread = useMemo(
        () => pageToSpreadIndex(initialPage ?? 0, { ...spreadOpts, totalPages }),
        [initialPage, spreadOpts, totalPages]
    );

    const [displaySpread, setDisplaySpread] = useState(initialSpread);
    const [flipping, setFlipping] = useState(false);

    useEffect(() => {
        setDisplaySpread(initialSpread);
    }, [initialSpread]);

    const {
        previewMode = true,
        placementMode = 'single',
        transformRevision = 0,
        proofSpotPicker = false,
        spotCanComment = false,
        spotCanSwap = false,
        swapMarkMode = false,
        pinMarkMode = false,
        proofToolsHover = false,
        showGridComments = false,
    } = albumBookProps;

    const proofingEnabled = proofSpotPicker || swapMarkMode || pinMarkMode;

    const { pageContextValue } = useAlbumBookProofing({
        album,
        previewMode,
        placementMode,
        transformRevision,
        photoRevision,
        swapMarkMode,
        pinMarkMode,
        proofToolsHover,
        proofSpotPicker,
        spotCanComment,
        spotCanSwap,
        showGridComments,
    });

    const showProofOverlay =
        proofingEnabled &&
        !flipping &&
        isOpenInnerSpread(displaySpread, totalSpreads, spreadOpts);

    const prevDisabled = displaySpread <= 0 || flipping;
    const nextDisabled = displaySpread >= totalSpreads - 1 || flipping;

    const navigate = useCallback(
        (direction) => {
            const nextSpread = displaySpread + direction;
            if (nextSpread < 0 || nextSpread >= totalSpreads || flipping) return;
            const { left } = getSpreadPages(nextSpread, totalPages, spreadOpts);
            onPageChange?.(left);
        },
        [displaySpread, flipping, onPageChange, spreadOpts, totalPages, totalSpreads]
    );

    const handleDisplaySpreadChange = useCallback((spreadIndex) => {
        setDisplaySpread(spreadIndex);
    }, []);

    const handleFlipStateChange = useCallback((isFlipping) => {
        setFlipping(isFlipping);
    }, []);

    return (
        <div className="ab-book-scene-with-proofing ab-root ab-root--preview">
            <button
                type="button"
                className={`ab-nav ab-nav--prev${!prevDisabled ? ' ab-nav--enabled' : ''}`}
                onClick={() => navigate(-1)}
                disabled={prevDisabled}
                aria-label="Previous page"
            >
                <NavPrevIcon />
            </button>

            <div className="ab-book-scene-with-proofing__stage">
                <BookScene
                    key={`${album?.id ?? 'album'}-3d-r${photoRevision}`}
                    album={album}
                    totalPages={totalPages}
                    initialPage={initialPage}
                    onPageChange={onPageChange}
                    showSamples={showSamples}
                    placementMode={placementMode}
                    onDisplaySpreadChange={handleDisplaySpreadChange}
                    onFlipStateChange={handleFlipStateChange}
                />
                {proofingEnabled && (
                    <AlbumSpreadProofOverlay
                        album={album}
                        totalPages={totalPages}
                        spreadIndex={displaySpread}
                        pageContextValue={pageContextValue}
                        placementMode={placementMode}
                        showSamples={showSamples}
                        transformRevision={transformRevision}
                        photoRevision={photoRevision}
                        hidden={!showProofOverlay}
                    />
                )}
            </div>

            <button
                type="button"
                className={`ab-nav ab-nav--next${!nextDisabled ? ' ab-nav--enabled' : ''}`}
                onClick={() => navigate(1)}
                disabled={nextDisabled}
                aria-label="Next page"
            >
                <NavNextIcon />
            </button>
        </div>
    );
}
