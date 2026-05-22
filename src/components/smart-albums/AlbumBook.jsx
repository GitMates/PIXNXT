import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getSampleImageForPage } from './sampleAlbumImages';
import './AlbumBook.css';

const FLIP_MS = 720;

/** Pages are 0-based: spread 0 → 0|1, spread 1 → 2|3 … */
export function getSpreadPages(spreadIndex) {
    const left = spreadIndex * 2;
    return { left, right: left + 1 };
}

export function getTotalSpreads(totalPages) {
    return Math.max(1, Math.ceil(totalPages / 2));
}

export function pageToSpreadIndex(pageIndex) {
    return Math.max(0, Math.floor(pageIndex / 2));
}

function getPageImageSrc(album, pageNum) {
    if (pageNum === 1 && album.cover_image_url) {
        return album.cover_image_url;
    }
    return getSampleImageForPage(pageNum);
}

function PageSheet({ album, pageNum, totalPages }) {
    if (pageNum < 0 || pageNum >= totalPages) {
        return <div className="ab-page-empty" />;
    }

    if (pageNum === 0) {
        return <div className="ab-page-empty" />;
    }

    const src = getPageImageSrc(album, pageNum);
    if (src) {
        return <img src={src} alt="" className="ab-page-photo" draggable={false} />;
    }

    return <div className="ab-page-placeholder">Add photos to this spread</div>;
}

function SpreadPage({ album, pageNum, totalPages, isLeft }) {
    return (
        <div className={`ab-sheet ${isLeft ? 'ab-sheet--left' : 'ab-sheet--right'}`}>
            <span className="ab-badge">{pageNum}</span>
            <PageSheet album={album} pageNum={pageNum} totalPages={totalPages} />
        </div>
    );
}

const AlbumBook = ({ album, totalPages, initialPage = 0, onPageChange }) => {
    const [currentSpread, setCurrentSpread] = useState(pageToSpreadIndex(initialPage));
    const [flip, setFlip] = useState(null);
    const timerRef = useRef(null);

    const totalSpreads = getTotalSpreads(totalPages);

    useEffect(() => {
        setCurrentSpread(pageToSpreadIndex(initialPage));
    }, [initialPage]);

    useEffect(() => () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    }, []);

    const isAnimating = Boolean(flip);

    const finishFlip = useCallback(
        (toSpread) => {
            setCurrentSpread(toSpread);
            onPageChange?.(toSpread * 2);
            setFlip(null);
        },
        [onPageChange]
    );

    const startFlip = (direction) => {
        if (isAnimating) return;

        const toSpread = direction === 'next' ? currentSpread + 1 : currentSpread - 1;
        if (toSpread < 0 || toSpread >= totalSpreads) return;

        const fromSpread = currentSpread;
        const fromPages = getSpreadPages(fromSpread);
        const toPages = getSpreadPages(toSpread);

        setFlip({ direction, fromSpread, toSpread, fromPages, toPages });

        timerRef.current = setTimeout(() => finishFlip(toSpread), FLIP_MS);
    };

    const { left: leftNum, right: rightNum } = getSpreadPages(currentSpread);
    const counterLabel = `${currentSpread + 1}/${totalSpreads}`;

    const underPages = flip ? getSpreadPages(flip.toSpread) : null;
    const fromPages = flip?.fromPages ?? null;

    const activeSpread = flip ? flip.toSpread : currentSpread;

    return (
        <div className="ab-root">
            <button
                type="button"
                className="ab-nav ab-nav--prev"
                onClick={() => startFlip('prev')}
                disabled={currentSpread <= 0 || isAnimating}
                aria-label="Previous spread"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
            </button>

            <div className="ab-book-stage">
                <div className={`ab-book ${flip ? 'ab-book--flipping' : ''}`}>
                    {/* Left Peek Page (Previous Spread Left Page) */}
                    {activeSpread > 0 && (
                        <div className="ab-peek-page ab-peek-page--left">
                            <SpreadPage album={album} pageNum={(activeSpread - 1) * 2} totalPages={totalPages} isLeft={true} />
                        </div>
                    )}

                    {/* Right Peek Page (Next Spread Right Page) */}
                    {activeSpread < totalSpreads - 1 && (
                        <div className="ab-peek-page ab-peek-page--right">
                            <SpreadPage album={album} pageNum={(activeSpread + 1) * 2 + 1} totalPages={totalPages} isLeft={false} />
                        </div>
                    )}

                    {!flip && (
                        <div className="ab-spread">
                            <SpreadPage album={album} pageNum={leftNum} totalPages={totalPages} isLeft={true} />
                            <SpreadPage album={album} pageNum={rightNum} totalPages={totalPages} isLeft={false} />
                        </div>
                    )}

                    {flip?.direction === 'next' && fromPages && underPages && (
                        <>
                            {/* Under spread: Destination pages */}
                            <div className="ab-spread ab-spread--under">
                                <SpreadPage album={album} pageNum={underPages.left} totalPages={totalPages} isLeft={true} />
                                <div className="ab-under-right-wrapper">
                                    <SpreadPage album={album} pageNum={underPages.right} totalPages={totalPages} isLeft={false} />
                                    <div className="ab-static-shadow ab-static-shadow--under-right" />
                                </div>
                            </div>

                            {/* Static Left page (Current page being covered) */}
                            <div className="ab-sheet-static ab-sheet-static--left">
                                <SpreadPage album={album} pageNum={fromPages.left} totalPages={totalPages} isLeft={true} />
                                <div className="ab-static-shadow ab-static-shadow--static-left" />
                            </div>

                            {/* Flipping Leaf */}
                            <div className="ab-rigid-leaf ab-rigid-leaf--next ab-rigid-leaf--anim">
                                <div className="ab-rigid-leaf-side ab-rigid-leaf-side--front">
                                    <SpreadPage album={album} pageNum={fromPages.right} totalPages={totalPages} isLeft={false} />
                                    <div className="ab-leaf-overlay ab-leaf-overlay--front" />
                                </div>
                                <div className="ab-rigid-leaf-side ab-rigid-leaf-side--back">
                                    <SpreadPage album={album} pageNum={underPages.left} totalPages={totalPages} isLeft={true} />
                                    <div className="ab-leaf-overlay ab-leaf-overlay--back" />
                                </div>
                            </div>
                        </>
                    )}

                    {flip?.direction === 'prev' && fromPages && underPages && (
                        <>
                            {/* Under spread: Destination pages */}
                            <div className="ab-spread ab-spread--under">
                                <div className="ab-under-left-wrapper">
                                    <SpreadPage album={album} pageNum={underPages.left} totalPages={totalPages} isLeft={true} />
                                    <div className="ab-static-shadow ab-static-shadow--under-left" />
                                </div>
                                <SpreadPage album={album} pageNum={underPages.right} totalPages={totalPages} isLeft={false} />
                            </div>

                            {/* Static Right page (Current page being covered) */}
                            <div className="ab-sheet-static ab-sheet-static--right">
                                <SpreadPage album={album} pageNum={fromPages.right} totalPages={totalPages} isLeft={false} />
                                <div className="ab-static-shadow ab-static-shadow--static-right" />
                            </div>

                            {/* Flipping Leaf */}
                            <div className="ab-rigid-leaf ab-rigid-leaf--prev ab-rigid-leaf--anim">
                                <div className="ab-rigid-leaf-side ab-rigid-leaf-side--front">
                                    <SpreadPage album={album} pageNum={fromPages.left} totalPages={totalPages} isLeft={true} />
                                    <div className="ab-leaf-overlay ab-leaf-overlay--front" />
                                </div>
                                <div className="ab-rigid-leaf-side ab-rigid-leaf-side--back">
                                    <SpreadPage album={album} pageNum={underPages.right} totalPages={totalPages} isLeft={false} />
                                    <div className="ab-leaf-overlay ab-leaf-overlay--back" />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="ab-gutter" />
                </div>

                <div className="ab-spread-controls">
                    <span className="ab-page-counter" title={`Pages ${leftNum}–${rightNum}`}>
                        {flip ? `${flip.toSpread + 1}/${totalSpreads}` : counterLabel}
                    </span>
                </div>
            </div>

            <button
                type="button"
                className="ab-nav ab-nav--next"
                onClick={() => startFlip('next')}
                disabled={currentSpread >= totalSpreads - 1 || isAnimating}
                aria-label="Next spread"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            </button>
        </div>
    );
};

export default AlbumBook;
