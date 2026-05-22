import React, { useCallback, useEffect, useRef, useState } from 'react';
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

function PageSheet({ album, pageNum, totalPages }) {
    if (pageNum < 0 || pageNum >= totalPages) {
        return <div className="ab-page-empty" />;
    }

    if (pageNum === 0) {
        return <div className="ab-page-empty" />;
    }

    if (pageNum === 1) {
        if (album.cover_image_url) {
            return <img src={album.cover_image_url} alt="" className="ab-page-photo" />;
        }
        return <div className="ab-page-placeholder">Add photos to this spread</div>;
    }

    return <div className="ab-page-placeholder">Page {pageNum}</div>;
}

function SpreadPage({ album, pageNum, totalPages }) {
    return (
        <div className="ab-sheet">
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
                    {flip && underPages && (
                        <div className="ab-spread ab-spread--under">
                            <SpreadPage album={album} pageNum={underPages.left} totalPages={totalPages} />
                            <SpreadPage album={album} pageNum={underPages.right} totalPages={totalPages} />
                        </div>
                    )}

                    {!flip && (
                        <div className="ab-spread">
                            <SpreadPage album={album} pageNum={leftNum} totalPages={totalPages} />
                            <SpreadPage album={album} pageNum={rightNum} totalPages={totalPages} />
                        </div>
                    )}

                    {flip?.direction === 'next' && fromPages && (
                        <>
                            <div className="ab-sheet-static ab-sheet-static--left">
                                <SpreadPage album={album} pageNum={fromPages.left} totalPages={totalPages} />
                            </div>
                            <div className="ab-rigid-leaf ab-rigid-leaf--next ab-rigid-leaf--anim">
                                <SpreadPage album={album} pageNum={fromPages.right} totalPages={totalPages} />
                            </div>
                        </>
                    )}

                    {flip?.direction === 'prev' && fromPages && (
                        <>
                            <div className="ab-sheet-static ab-sheet-static--right">
                                <SpreadPage album={album} pageNum={fromPages.right} totalPages={totalPages} />
                            </div>
                            <div className="ab-rigid-leaf ab-rigid-leaf--prev ab-rigid-leaf--anim">
                                <SpreadPage album={album} pageNum={fromPages.left} totalPages={totalPages} />
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
