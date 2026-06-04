import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import HTMLFlipBook from 'react-pageflip';
import AlbumFlipPage from './AlbumFlipPage';
import { getAlbumSpreadOptions, getTotalSpreads, pageToSpreadIndex } from './albumSpreadUtils';
import './AlbumBook.css';
import { parseGridSizeAspect } from './albumGridSize';

const FLIP_TIME_MS = 800;

function getFocusBookDimensions(gridSize = 'square') {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = parseGridSizeAspect(gridSize);
    const spreadWidth = w;
    const maxPageWidth = spreadWidth / 2;
    const pageHeight = Math.floor(Math.min(h, maxPageWidth / aspect));
    const pageWidth = Math.floor(pageHeight * aspect);
    return {
        width: Math.max(160, pageWidth),
        height: Math.max(200, pageHeight),
    };
}

export default function AlbumFocusView({
    album,
    totalPages,
    startPage = 0,
    showSamples = true,
    transformRevision = 0,
    onPageChange,
    onClose,
}) {
    const bookRef = useRef(null);
    const stageRef = useRef(null);
    const prevNavRef = useRef(null);
    const nextNavRef = useRef(null);
    const isFlippingRef = useRef(false);
    const [dims, setDims] = useState(() => getFocusBookDimensions(album?.grid_size));
    const [pageIndex, setPageIndex] = useState(startPage);

    const spreadOpts = getAlbumSpreadOptions(album);
    const spreadCtx = { ...spreadOpts, totalPages };
    const totalSpreads = getTotalSpreads(totalPages, spreadOpts);
    const spreadIndex = pageToSpreadIndex(pageIndex, spreadCtx);
    const atStart = spreadIndex <= 0;
    const atEnd = spreadIndex >= totalSpreads - 1;

    useEffect(() => {
        setPageIndex(startPage);
    }, [startPage]);

    useEffect(() => {
        const update = () => setDims(getFocusBookDimensions(album?.grid_size));
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, [album?.grid_size]);

    useEffect(() => {
        const prevHtmlOverflow = document.documentElement.style.overflow;
        const prevBodyOverflow = document.body.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        return () => {
            document.documentElement.style.overflow = prevHtmlOverflow;
            document.body.style.overflow = prevBodyOverflow;
        };
    }, []);

    useEffect(() => {
        const api = bookRef.current?.pageFlip?.();
        if (!api?.getFlipController?.()) return;
        if (api.getCurrentPageIndex() !== startPage) {
            api.turnToPage(startPage);
        }
        setPageIndex(api.getCurrentPageIndex());
    }, [startPage]);

    const syncNavDisabled = useCallback(() => {
        const flipping = isFlippingRef.current;
        if (prevNavRef.current) prevNavRef.current.disabled = atStart || flipping;
        if (nextNavRef.current) nextNavRef.current.disabled = atEnd || flipping;
    }, [atStart, atEnd]);

    useEffect(() => {
        syncNavDisabled();
    }, [atStart, atEnd, syncNavDisabled]);

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
            isFlippingRef.current = e.data === 'flipping';
            syncNavDisabled();
        },
        [syncNavDisabled]
    );

    const flipPrev = useCallback(() => {
        bookRef.current?.pageFlip?.()?.flipPrev('bottom');
    }, []);

    const flipNext = useCallback(() => {
        bookRef.current?.pageFlip?.()?.flipNext('bottom');
    }, []);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose?.();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                flipPrev();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                flipNext();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [flipPrev, flipNext, onClose]);

    const pages = useMemo(
        () =>
            Array.from({ length: totalPages }, (_, pageNum) => (
                <AlbumFlipPage
                    key={`focus-page-${pageNum}`}
                    album={album}
                    pageNum={pageNum}
                    totalPages={totalPages}
                    editable={false}
                    spreadEdit={false}
                    showSamples={showSamples}
                    previewMode
                    transformRevision={transformRevision}
                />
            )),
        [album, totalPages, showSamples, transformRevision]
    );

    return createPortal(
        <div
            className="ab-focus-view"
            role="dialog"
            aria-modal="true"
            aria-label="Full screen album view"
            onClick={onClose}
        >
            <button
                type="button"
                className="ab-focus-close"
                onClick={onClose}
                aria-label="Close full screen view"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>

            <div className="ab-focus-stage" ref={stageRef} onClick={(e) => e.stopPropagation()}>
                <button
                    type="button"
                    ref={prevNavRef}
                    className="ab-nav ab-nav--prev ab-focus-nav"
                    onClick={flipPrev}
                    disabled={atStart}
                    aria-label="Previous spread"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>

                <div
                    className="ab-focus-flipbook-wrap"
                    style={{ width: dims.width * 2, height: dims.height }}
                >
                    <HTMLFlipBook
                        key={`focus-${album?.id}-${totalPages}`}
                        ref={bookRef}
                        className="ab-html-flipbook ab-html-flipbook--focus"
                        width={dims.width}
                        height={dims.height}
                        size="stretch"
                        minWidth={120}
                        maxWidth={dims.width}
                        minHeight={200}
                        maxHeight={dims.height}
                        drawShadow
                        maxShadowOpacity={0.55}
                        flippingTime={FLIP_TIME_MS}
                        usePortrait={false}
                        useMouseEvents
                        mobileScrollSupport={false}
                        showCover={false}
                        showPageCorners
                        disableFlipByClick={false}
                        startPage={startPage}
                        clickEventForward={false}
                        onFlip={handleFlip}
                        onChangeState={handleChangeState}
                        onInit={() => {
                            requestAnimationFrame(() => {
                                bookRef.current?.pageFlip?.()?.turnToPage(startPage);
                                setPageIndex(bookRef.current?.pageFlip?.()?.getCurrentPageIndex() ?? startPage);
                            });
                        }}
                    >
                        {pages}
                    </HTMLFlipBook>
                </div>

                <button
                    type="button"
                    ref={nextNavRef}
                    className="ab-nav ab-nav--next ab-focus-nav"
                    onClick={flipNext}
                    disabled={atEnd}
                    aria-label="Next spread"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </button>
            </div>
        </div>,
        document.body
    );
}
