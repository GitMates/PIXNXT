import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import AlbumFlipPage from './AlbumFlipPage';
import { getSpreadPages, getTotalSpreads, pageToSpreadIndex } from './albumSpreadUtils';
import './AlbumBook.css';

export { getSpreadPages, getTotalSpreads, pageToSpreadIndex } from './albumSpreadUtils';

const FLIP_TIME_MS = 800;
const BOOK_PAGE_HEIGHT_MIN = 300;
const BOOK_PAGE_HEIGHT_MAX = 520;
const BOOK_PAGE_HEIGHT_SCALE = 0.93;

function getBookDimensions(stageEl) {
    if (!stageEl) return { width: 480, height: 340 };
    const w = stageEl.clientWidth;
    const h = stageEl.clientHeight;
    const pageWidth = Math.floor(w / 2);
    const pageHeight = Math.floor(h * BOOK_PAGE_HEIGHT_SCALE);
    return {
        width: Math.max(280, Math.min(520, pageWidth)),
        height: Math.max(BOOK_PAGE_HEIGHT_MIN, Math.min(BOOK_PAGE_HEIGHT_MAX, pageHeight)),
    };
}

const AlbumBook = ({ album, totalPages, initialPage = 0, onPageChange }) => {
    const bookRef = useRef(null);
    const stageRef = useRef(null);
    const rootRef = useRef(null);
    const stageOuterRef = useRef(null);
    const escapeRef = useRef(null);
    const wrapRef = useRef(null);
    const prevNavRef = useRef(null);
    const nextNavRef = useRef(null);
    const isFlippingRef = useRef(false);
    const dimsRafRef = useRef(null);
    const [dims, setDims] = useState({ width: 480, height: 340 });
    const [pageIndex, setPageIndex] = useState(initialPage);

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
        if (isFlippingRef.current) return;

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

        const update = () => {
            if (isFlippingRef.current) return;
            if (dimsRafRef.current != null) cancelAnimationFrame(dimsRafRef.current);
            dimsRafRef.current = requestAnimationFrame(() => {
                dimsRafRef.current = null;
                setDims(getBookDimensions(stage));
            });
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(stage);
        window.addEventListener('resize', update);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', update);
            if (dimsRafRef.current != null) cancelAnimationFrame(dimsRafRef.current);
        };
    }, []);

    const atStart = spreadIndex <= 0;
    const atEnd = spreadIndex >= totalSpreads - 1;

    const syncNavDisabled = useCallback(() => {
        const flipping = isFlippingRef.current;
        if (prevNavRef.current) prevNavRef.current.disabled = atStart || flipping;
        if (nextNavRef.current) nextNavRef.current.disabled = atEnd || flipping;
    }, [atStart, atEnd]);

    const setFlippingUi = useCallback((flipping) => {
        rootRef.current?.classList.toggle('ab-root--flipping', flipping);
        stageOuterRef.current?.classList.toggle('ab-book-stage--flipping', flipping);
        escapeRef.current?.classList.toggle('ab-flip-escape--flipping', flipping);
        wrapRef.current?.classList.toggle('ab-flipbook-wrap--flipping', flipping);
    }, []);

    const handleFlip = useCallback(
        (e) => {
            const idx = e.data;
            requestAnimationFrame(() => {
                setPageIndex(idx);
                onPageChange?.(idx);
            });
        },
        [onPageChange]
    );

    const handleChangeState = useCallback(
        (e) => {
            const flipping = e.data === 'flipping';
            isFlippingRef.current = flipping;
            setFlippingUi(flipping);
            syncNavDisabled();
        },
        [setFlippingUi, syncNavDisabled]
    );

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

    useEffect(() => {
        syncNavDisabled();
    }, [atStart, atEnd, syncNavDisabled]);

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
        <div className="ab-root" ref={rootRef}>
            <button
                type="button"
                ref={prevNavRef}
                className="ab-nav ab-nav--prev"
                onClick={flipPrev}
                disabled={atStart}
                aria-label="Previous page"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
            </button>

            <div className="ab-book-stage" ref={stageOuterRef}>
                <div className="ab-book-stage-inner" ref={stageRef} aria-hidden="true" />
                <div className="ab-flip-escape" ref={escapeRef}>
                <div
                    className="ab-flipbook-wrap"
                    ref={wrapRef}
                    style={{ width: dims.width * 2, height: dims.height }}
                >
                    <HTMLFlipBook
                        key={`${album?.id}-${totalPages}`}
                        ref={bookRef}
                        className="ab-html-flipbook"
                        width={dims.width}
                        height={dims.height}
                        size="stretch"
                        minWidth={280}
                        maxWidth={520}
                        minHeight={BOOK_PAGE_HEIGHT_MIN}
                        maxHeight={BOOK_PAGE_HEIGHT_MAX}
                        drawShadow
                        maxShadowOpacity={0.5}
                        flippingTime={FLIP_TIME_MS}
                        usePortrait={false}
                        useMouseEvents
                        mobileScrollSupport={false}
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
                </div>

                <div className="ab-spread-controls">
                    <span className="ab-page-counter" title={`Pages ${pageRangeLabel}`}>
                        {counterLabel}
                    </span>
                </div>
            </div>

            <button
                type="button"
                ref={nextNavRef}
                className="ab-nav ab-nav--next"
                onClick={flipNext}
                disabled={atEnd}
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
