import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import HTMLFlipBook from 'react-pageflip';
import AlbumFlipPage from './AlbumFlipPage';
import { getAlbumSpreadOptions, getTotalSpreads, pageToSpreadIndex } from './albumSpreadUtils';
import { installSafePageFlip } from './pageFlipSafe';
import './AlbumBook.css';
import { parseGridSizeAspect } from './albumGridSize';

const FLIP_TIME_MS = 900;

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
    placementMode = 'single',
    showSamples = true,
    transformRevision = 0,
    photoRevision = 0,
    onPageChange,
    onClose,
}) {
    const bookRef = useRef(null);
    const prevNavRef = useRef(null);
    const nextNavRef = useRef(null);
    const isFlippingRef = useRef(false);
    const [bookFlipping, setBookFlipping] = useState(false);
    const [dims, setDims] = useState(() => getFocusBookDimensions(album?.grid_size));
    const [pageIndex, setPageIndex] = useState(startPage);

    const spreadOpts = getAlbumSpreadOptions(album);
    const spreadCtx = { ...spreadOpts, totalPages };
    const totalSpreads = getTotalSpreads(totalPages, spreadOpts);
    const spreadIndex = pageToSpreadIndex(pageIndex, spreadCtx);
    const atStart = spreadIndex <= 0;
    const atEnd = spreadIndex >= totalSpreads - 1;

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
            const flipping = e.data === 'flipping';
            isFlippingRef.current = flipping;
            setBookFlipping(flipping);
            syncNavDisabled();
        },
        [syncNavDisabled]
    );

    const flipPrev = useCallback(() => {
        if (atStart || isFlippingRef.current) return;
        bookRef.current?.pageFlip?.()?.flipPrev('bottom');
    }, [atStart]);

    const flipNext = useCallback(() => {
        if (atEnd || isFlippingRef.current) return;
        bookRef.current?.pageFlip?.()?.flipNext('bottom');
    }, [atEnd]);

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
                    placementMode={placementMode}
                    showSamples={showSamples}
                    previewMode
                    transformRevision={transformRevision}
                    photoRevision={photoRevision}
                />
            )),
        [album, totalPages, placementMode, showSamples, transformRevision, photoRevision]
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

            <div className="ab-focus-stage" onClick={(e) => e.stopPropagation()}>
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
                    className={`ab-book-3d-scene${
                        bookFlipping ? ' ab-book-3d-scene--flipping' : ''
                    }`}
                >
                    <div className="ab-book-spine" aria-hidden />
                    <div
                        className={`ab-focus-flipbook-wrap ab-flipbook-wrap ab-flipbook-wrap--book-3d${
                            !bookFlipping ? ' ab-flipbook-wrap--book-3d-idle' : ''
                        }${bookFlipping ? ' ab-flipbook-wrap--flipping' : ''}`}
                        style={{ width: dims.width * 2, height: dims.height }}
                    >
                        <HTMLFlipBook
                            key={`focus-${album?.id}-${totalPages}-${startPage}`}
                            ref={bookRef}
                            className="ab-html-flipbook ab-html-flipbook--focus"
                            style={{
                                width: dims.width * 2,
                                height: dims.height,
                            }}
                            width={dims.width}
                            height={dims.height}
                            size="fixed"
                            autoSize={false}
                            minWidth={dims.width}
                            maxWidth={dims.width}
                            minHeight={dims.height}
                            maxHeight={dims.height}
                            drawShadow
                            maxShadowOpacity={0.72}
                            flippingTime={FLIP_TIME_MS}
                            usePortrait={false}
                            useMouseEvents={false}
                            mobileScrollSupport={false}
                            showCover={false}
                            showPageCorners={false}
                            disableFlipByClick
                            startPage={startPage}
                            clickEventForward={false}
                            onFlip={handleFlip}
                            onChangeState={handleChangeState}
                            onInit={() => {
                                const api = bookRef.current?.pageFlip?.();
                                installSafePageFlip(api, { totalPages, spreadOpts });
                                requestAnimationFrame(() => {
                                    api?.turnToPage(startPage);
                                    const idx = api?.getCurrentPageIndex() ?? startPage;
                                    setPageIndex(idx);
                                    onPageChange?.(idx);
                                });
                            }}
                        >
                            {pages}
                        </HTMLFlipBook>
                    </div>
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
