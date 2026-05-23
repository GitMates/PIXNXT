import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import AlbumFlipPage from './AlbumFlipPage';
import { getSpreadPages, getTotalSpreads, pageToSpreadIndex } from './albumSpreadUtils';
import './AlbumBook.css';

export { getSpreadPages, getTotalSpreads, pageToSpreadIndex } from './albumSpreadUtils';

const FLIP_TIME_MS = 800;

function getBookDimensions(stageEl) {
    if (!stageEl) return { width: 480, height: 340 };
    const w = stageEl.clientWidth;
    const h = stageEl.clientHeight;
    const pageWidth = Math.floor(w / 2);
    const pageHeight = Math.floor(h);
    return {
        width: Math.max(280, Math.min(520, pageWidth)),
        height: Math.max(300, Math.min(560, pageHeight)),
    };
}

const AlbumBook = ({ album, totalPages, initialPage = 0, onPageChange }) => {
    const bookRef = useRef(null);
    const stageRef = useRef(null);
    const [dims, setDims] = useState({ width: 480, height: 340 });
    const [pageIndex, setPageIndex] = useState(initialPage);
    const [isFlipping, setIsFlipping] = useState(false);

    const totalSpreads = getTotalSpreads(totalPages, { showCover: true });
    const spreadIndex = pageToSpreadIndex(pageIndex, { showCover: true });
    const { left: leftNum, right: rightNum } = getSpreadPages(spreadIndex, totalPages, {
        showCover: true,
    });

    const counterLabel = useMemo(() => {
        const spreadNum = spreadIndex + 1;
        return `${spreadNum}/${totalSpreads}`;
    }, [spreadIndex, totalSpreads]);

    const pageRangeLabel = useMemo(() => {
        if (rightNum < totalPages) return `${leftNum}–${rightNum}`;
        return String(leftNum);
    }, [leftNum, rightNum, totalPages]);

    useEffect(() => {
        const api = bookRef.current?.pageFlip?.();
        if (!api) {
            setPageIndex(initialPage);
            return;
        }
        const current = api.getCurrentPageIndex();
        if (current !== initialPage) {
            api.turnToPage(initialPage);
        }
        setPageIndex(initialPage);
    }, [initialPage, album?.id]);

    useEffect(() => {
        const stage = stageRef.current;
        if (!stage) return undefined;

        const update = () => setDims(getBookDimensions(stage));
        update();
        const ro = new ResizeObserver(update);
        ro.observe(stage);
        window.addEventListener('resize', update);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', update);
        };
    }, []);

    const handleFlip = useCallback(
        (e) => {
            const idx = e.data;
            setPageIndex(idx);
            onPageChange?.(idx);
        },
        [onPageChange]
    );

    const handleChangeState = useCallback((e) => {
        setIsFlipping(e.data === 'flipping');
    }, []);

    const flipPrev = useCallback(() => {
        bookRef.current?.pageFlip?.()?.flipPrev('bottom');
    }, []);

    const flipNext = useCallback(() => {
        bookRef.current?.pageFlip?.()?.flipNext('bottom');
    }, []);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                flipPrev();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                flipNext();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [flipPrev, flipNext]);

    const atStart = spreadIndex <= 0;
    const atEnd = spreadIndex >= totalSpreads - 1;

    const pages = useMemo(
        () =>
            Array.from({ length: totalPages }, (_, pageNum) => (
                <AlbumFlipPage
                    key={`page-${pageNum}`}
                    album={album}
                    pageNum={pageNum}
                    totalPages={totalPages}
                />
            )),
        [album, totalPages]
    );

    return (
        <div className="ab-root">
            <button
                type="button"
                className="ab-nav ab-nav--prev"
                onClick={flipPrev}
                disabled={atStart || isFlipping}
                aria-label="Previous page"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
            </button>

            <div className="ab-book-stage" ref={stageRef}>
                <div className="ab-flipbook-wrap">
                    <HTMLFlipBook
                        key={`${album?.id}-${totalPages}`}
                        ref={bookRef}
                        className="ab-html-flipbook"
                        width={dims.width}
                        height={dims.height}
                        size="stretch"
                        minWidth={280}
                        maxWidth={520}
                        minHeight={300}
                        maxHeight={560}
                        drawShadow
                        maxShadowOpacity={0.5}
                        flippingTime={FLIP_TIME_MS}
                        usePortrait={false}
                        useMouseEvents
                        mobileScrollSupport
                        showCover
                        showPageCorners
                        disableFlipByClick={false}
                        startPage={initialPage}
                        clickEventForward={false}
                        onFlip={handleFlip}
                        onChangeState={handleChangeState}
                        onInit={(e) => {
                            const idx = e.data?.page ?? 0;
                            setPageIndex(idx);
                        }}
                    >
                        {pages}
                    </HTMLFlipBook>
                </div>

                <div className="ab-spread-controls">
                    <span className="ab-page-counter" title={`Pages ${pageRangeLabel}`}>
                        {counterLabel}
                    </span>
                </div>
            </div>

            <button
                type="button"
                className="ab-nav ab-nav--next"
                onClick={flipNext}
                disabled={atEnd || isFlipping}
                aria-label="Next page"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            </button>
        </div>
    );
};

export default AlbumBook;
