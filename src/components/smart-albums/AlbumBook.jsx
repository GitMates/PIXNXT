import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import AlbumFlipPage from './AlbumFlipPage';
import {
    getGridSlotPhoto,
    getPagePhotoOverride,
    getSpreadPhotoOverride,
} from './albumPagePhotos';
import { getSpreadLeftPageIndex } from './albumSpreadGrid';
import { getSpreadPages, getTotalSpreads, pageToSpreadIndex } from './albumSpreadUtils';
import { getSampleImageForPage } from './sampleAlbumImages';
import './AlbumBook.css';

export { getSpreadPages, getTotalSpreads, pageToSpreadIndex } from './albumSpreadUtils';

const FLIP_TIME_MS = 800;
const BOOK_PAGE_HEIGHT_MIN = 300;
const BOOK_PAGE_HEIGHT_MAX = 520;
const BOOK_PAGE_HEIGHT_SCALE = 0.93;

const GRID_SIZE_ASPECT = {
    square: 1,
    portrait: 0.8,
    landscape: 1.25,
    wide: 16 / 9,
};

function getBookDimensions(stageEl, gridSize = 'square') {
    if (!stageEl) return { width: 480, height: 480 };
    const w = stageEl.clientWidth;
    const h = stageEl.clientHeight;
    const aspect = GRID_SIZE_ASPECT[gridSize] || GRID_SIZE_ASPECT.square;
    const maxPageWidth = w / 2;
    const maxPageHeight = h * BOOK_PAGE_HEIGHT_SCALE;
    const pageHeight = Math.floor(Math.min(maxPageHeight, maxPageWidth / aspect));
    const clampedPageHeight = Math.max(
        BOOK_PAGE_HEIGHT_MIN,
        Math.min(BOOK_PAGE_HEIGHT_MAX, pageHeight)
    );
    return {
        width: Math.round(clampedPageHeight * aspect),
        height: clampedPageHeight,
    };
}

function getOverviewPageImage(album, pageNum, totalPages, showSamples) {
    const albumId = album?.id;
    const directSrc = getPagePhotoOverride(albumId, pageNum);
    if (directSrc) return directSrc;
    if (pageNum === 0) {
        return album?.cover_image_url || (showSamples ? getSampleImageForPage(pageNum) : null);
    }
    const spreadLeft = getSpreadLeftPageIndex(pageNum, { showCover: true });
    const cellId = pageNum === spreadLeft ? 1 : 2;
    const slot = getGridSlotPhoto(albumId, pageNum, cellId, spreadLeft);
    return slot.src || (showSamples ? getSampleImageForPage(pageNum) : null);
}

const AlbumBook = ({
    album,
    totalPages,
    initialPage = 0,
    onPageChange,
    clickToFlip = false,
    editable = false,
    spreadEdit = false,
    placementMode = 'single',
    showSamples = true,
    previewMode = false,
    gridSelection = null,
    onSelectGridCell,
    onSelectGridSpread,
    onSelectCover,
    onTransformChange,
    transformRevision = 0,
    canAddPages = false,
    onAddPages,
    pageCountBusy = false,
    overviewReopenToken = 0,
}) => {
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
    const [dims, setDims] = useState({ width: 480, height: 480 });
    const [pageIndex, setPageIndex] = useState(initialPage);
    const [overviewOpen, setOverviewOpen] = useState(false);
    const [focusOpen, setFocusOpen] = useState(false);

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
                setDims(getBookDimensions(stage, album?.grid_size));
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
    }, [album?.grid_size]);

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

    useEffect(() => {
        if (!overviewOpen) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') setOverviewOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [overviewOpen]);

    useEffect(() => {
        if (overviewReopenToken) setOverviewOpen(true);
    }, [overviewReopenToken]);

    const closeFocusView = useCallback(() => {
        setFocusOpen(false);
        if (document.fullscreenElement) {
            document.exitFullscreen?.().catch(() => {});
        }
    }, []);

    const openFocusView = useCallback(() => {
        setOverviewOpen(false);
        setFocusOpen(true);
        document.documentElement.requestFullscreen?.().catch(() => {});
    }, []);

    useEffect(() => {
        if (!focusOpen) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') closeFocusView();
        };
        const onFullscreenChange = () => {
            if (!document.fullscreenElement) setFocusOpen(false);
        };
        window.addEventListener('keydown', onKey);
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => {
            window.removeEventListener('keydown', onKey);
            document.removeEventListener('fullscreenchange', onFullscreenChange);
        };
    }, [focusOpen, closeFocusView]);

    const pages = useMemo(
        () =>
            Array.from({ length: totalPages }, (_, pageNum) => (
                <AlbumFlipPage
                    key={`page-${pageNum}`}
                    album={album}
                    pageNum={pageNum}
                    totalPages={totalPages}
                    editable={editable}
                    spreadEdit={spreadEdit}
                    placementMode={placementMode}
                    showSamples={showSamples}
                    previewMode={previewMode}
                    selectionLeftPage={gridSelection?.leftPage ?? null}
                    selectionMode={gridSelection?.mode ?? null}
                    selectedCellId={gridSelection?.cellId ?? null}
                    onSelectCell={onSelectGridCell}
                    onSelectSpread={onSelectGridSpread}
                    onSelectCover={onSelectCover}
                    onTransformChange={onTransformChange}
                    transformRevision={transformRevision}
                />
            )),
        [
            album,
            totalPages,
            editable,
            spreadEdit,
            placementMode,
            showSamples,
            previewMode,
            gridSelection?.leftPage,
            gridSelection?.mode,
            gridSelection?.cellId,
            onSelectGridCell,
            onSelectGridSpread,
            onSelectCover,
            onTransformChange,
            transformRevision,
        ]
    );

    return (
        <div className={`ab-root${previewMode ? ' ab-root--preview' : ''}`} ref={rootRef}>
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
                        minWidth={BOOK_PAGE_HEIGHT_MIN}
                        maxWidth={Math.max(520, dims.width)}
                        minHeight={BOOK_PAGE_HEIGHT_MIN}
                        maxHeight={BOOK_PAGE_HEIGHT_MAX}
                        drawShadow
                        maxShadowOpacity={0.5}
                        flippingTime={FLIP_TIME_MS}
                        usePortrait={false}
                        useMouseEvents={clickToFlip}
                        mobileScrollSupport={false}
                        showCover
                        showPageCorners={clickToFlip}
                        disableFlipByClick
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
                    <button
                        type="button"
                        className="ab-control-icon ab-control-icon--button"
                        aria-label="Show spread full screen"
                        onClick={openFocusView}
                    >
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                            <path d="M5 11V5h6M17 5h6v6M23 17v6h-6M11 23H5v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
                            <path d="M6 6l6 6M22 6l-6 6M22 22l-6-6M6 22l6-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        className="ab-control-icon ab-control-icon--button"
                        aria-label="Show page overview"
                        onClick={() => setOverviewOpen(true)}
                    >
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                            {Array.from({ length: 9 }, (_, i) => {
                                const x = 5 + (i % 3) * 7;
                                const y = 5 + Math.floor(i / 3) * 7;
                                return <rect key={i} x={x} y={y} width="4" height="4" stroke="currentColor" strokeWidth="1.5" />;
                            })}
                        </svg>
                    </button>
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

            {overviewOpen && (
                <div
                    className="ab-overview"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Page overview"
                    onClick={() => setOverviewOpen(false)}
                >
                    <button
                        type="button"
                        className="ab-overview-close"
                        aria-label="Close page overview"
                        onClick={() => setOverviewOpen(false)}
                    >
                        ×
                    </button>
                    <div className="ab-overview-grid" onClick={(e) => e.stopPropagation()}>
                        {Array.from({ length: totalSpreads }, (_, overviewSpreadIndex) => {
                            const { left, right } = getSpreadPages(
                                overviewSpreadIndex,
                                totalPages,
                                { showCover: true }
                            );
                            const targetPage = overviewSpreadIndex === 0 ? 0 : left;
                            const leftSrc = getOverviewPageImage(
                                album,
                                left,
                                totalPages,
                                showSamples
                            );
                            const rightSrc =
                                right !== left
                                    ? getOverviewPageImage(album, right, totalPages, showSamples)
                                    : null;
                            const spreadSrc =
                                overviewSpreadIndex > 0
                                    ? getSpreadPhotoOverride(album?.id, left)
                                    : null;
                            const isCurrent = overviewSpreadIndex === spreadIndex;
                            return (
                                <button
                                    key={overviewSpreadIndex}
                                    type="button"
                                    className={`ab-overview-item${
                                        isCurrent ? ' ab-overview-item--active' : ''
                                    }`}
                                    onClick={() => {
                                        bookRef.current?.pageFlip?.()?.turnToPage(targetPage);
                                        setPageIndex(targetPage);
                                        onPageChange?.(targetPage);
                                        setOverviewOpen(false);
                                    }}
                                >
                                    <span className="ab-overview-thumb ab-overview-thumb--spread">
                                        {spreadSrc ? (
                                            <span className="ab-overview-page ab-overview-page--spread-full">
                                                <img src={spreadSrc} alt="" loading="lazy" />
                                            </span>
                                        ) : (
                                            <span className="ab-overview-page">
                                                {leftSrc ? (
                                                    <img src={leftSrc} alt="" loading="lazy" />
                                                ) : (
                                                    <span className="ab-overview-placeholder" />
                                                )}
                                            </span>
                                        )}
                                        {overviewSpreadIndex > 0 && !spreadSrc && (
                                            <span className="ab-overview-page">
                                                {rightSrc ? (
                                                    <img src={rightSrc} alt="" loading="lazy" />
                                                ) : (
                                                    <span className="ab-overview-placeholder" />
                                                )}
                                            </span>
                                        )}
                                    </span>
                                    <span className="ab-overview-label">
                                        {overviewSpreadIndex + 1}
                                    </span>
                                </button>
                            );
                        })}
                        {canAddPages && onAddPages && (
                            <button
                                type="button"
                                className="ab-overview-item ab-overview-item--add"
                                disabled={pageCountBusy}
                                onClick={async () => {
                                    await onAddPages();
                                }}
                            >
                                <span className="ab-overview-thumb ab-overview-thumb--add">
                                    <span className="ab-overview-add-plus">+</span>
                                </span>
                                <span className="ab-overview-label">
                                    {pageCountBusy ? 'Adding...' : 'Add page'}
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {focusOpen && (
                <div
                    className="ab-focus-view"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Full screen spread view"
                    onClick={closeFocusView}
                >
                    {(() => {
                        const spreadSrc =
                            spreadIndex > 0 ? getSpreadPhotoOverride(album?.id, leftNum) : null;
                        const leftSrc = getOverviewPageImage(
                            album,
                            leftNum,
                            totalPages,
                            showSamples
                        );
                        const rightSrc =
                            rightNum !== leftNum
                                ? getOverviewPageImage(album, rightNum, totalPages, showSamples)
                                : null;
                        const backdropSrc = spreadSrc || rightSrc || leftSrc;

                        return (
                            <>
                                {backdropSrc && (
                                    <img
                                        className="ab-focus-backdrop-img"
                                        src={backdropSrc}
                                        alt=""
                                        aria-hidden="true"
                                    />
                                )}
                                <div
                                    className={`ab-focus-spread${
                                        spreadSrc ? ' ab-focus-spread--single-image' : ''
                                    }`}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {spreadSrc ? (
                                        <img src={spreadSrc} alt="" className="ab-focus-image" />
                                    ) : (
                                        <>
                                            <div className="ab-focus-page">
                                                {leftSrc && <img src={leftSrc} alt="" />}
                                            </div>
                                            {rightSrc && (
                                                <div className="ab-focus-page">
                                                    <img src={rightSrc} alt="" />
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </>
                        );
                    })()}
                </div>
            )}
        </div>
    );
};

export default AlbumBook;
