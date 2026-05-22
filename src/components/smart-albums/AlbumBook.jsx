import React, { useEffect, useState } from 'react';
import { AlbumPageFlipAnimation } from './AlbumPageFlipAnimation';
import { AlbumSpreadPage } from './AlbumSpreadPage';
import { getSpreadPages, getTotalSpreads, pageToSpreadIndex } from './albumSpreadUtils';
import { useAlbumPageFlip } from './useAlbumPageFlip';
import './AlbumBook.css';

export { getSpreadPages, getTotalSpreads, pageToSpreadIndex } from './albumSpreadUtils';

const AlbumBook = ({ album, totalPages, initialPage = 0, onPageChange }) => {
    const [currentSpread, setCurrentSpread] = useState(pageToSpreadIndex(initialPage));

    const totalSpreads = getTotalSpreads(totalPages);

    const { flip, isAnimating, startFlip } = useAlbumPageFlip({
        currentSpread,
        totalSpreads,
        setCurrentSpread,
        onPageChange,
    });

    useEffect(() => {
        setCurrentSpread(pageToSpreadIndex(initialPage));
    }, [initialPage]);

    const { left: leftNum, right: rightNum } = getSpreadPages(currentSpread);
    const counterLabel = `${currentSpread + 1}/${totalSpreads}`;
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
                    <AlbumPageFlipAnimation
                        flip={flip}
                        album={album}
                        totalPages={totalPages}
                        activeSpread={activeSpread}
                        totalSpreads={totalSpreads}
                    />

                    {!flip && (
                        <div className="ab-spread">
                            <AlbumSpreadPage album={album} pageNum={leftNum} totalPages={totalPages} isLeft />
                            <AlbumSpreadPage album={album} pageNum={rightNum} totalPages={totalPages} isLeft={false} />
                        </div>
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
