import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import AlbumFlipPage from './AlbumFlipPage';
import {
    getGridSlotPhoto,
    getPagePhotoOverride,
    getSpreadPhotoOverride,
    resolveCoverImageSrc,
} from './albumPagePhotos';
import { getSpreadLeftPageIndex } from './albumSpreadGrid';
import {
    getSpreadPages,
    getTotalSpreads,
    isEndHalfSpreadIndex,
    pageToSpreadIndex,
} from './albumSpreadUtils';
import { getSampleImageForPage } from './sampleAlbumImages';
import SpreadGridComments from './SpreadGridComments';
import AlbumFocusView from './AlbumFocusView';
import AlbumSwapPickerModal from './AlbumSwapPickerModal';
import AlbumPinComposer from './AlbumPinComposer';
import {
    addSwapMark,
    getSwapMarkForSlot,
    getSwapMarks,
    isSlotSwapLocked,
    SWAP_MARKS_CHANGED_EVENT,
} from './albumSwapMarks';
import {
    addPhotoPin,
    getPhotoPins,
    getPinsForSlot,
    PHOTO_PINS_CHANGED_EVENT,
    removePhotoPin,
} from './albumPhotoPins';
import './AlbumBook.css';
import './AlbumSwapMarks.css';
import './AlbumPhotoPins.css';
import { parseGridSizeAspect } from './albumGridSize';

export { getSpreadPages, getTotalSpreads, pageToSpreadIndex, spreadIndexToPage } from './albumSpreadUtils';

const FLIP_TIME_MS = 800;
const FLIP_PAGE_SYNC_MS = 320;
const BOOK_PAGE_HEIGHT_MIN = 300;
const BOOK_PAGE_HEIGHT_MAX = 520;
const BOOK_PAGE_HEIGHT_SCALE = 0.93;

function getBookDimensions(stageEl, gridSize = 'square') {
    if (!stageEl) return { width: 480, height: 480 };
    const w = stageEl.clientWidth;
    const h = stageEl.clientHeight;
    const aspect = parseGridSizeAspect(gridSize);
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

function OverviewFramedPhoto({ src, placeholderClass = '' }) {
    if (!src) {
        return (
            <span
                className={`ab-overview-placeholder ab-overview-placeholder--cover${placeholderClass ? ` ${placeholderClass}` : ''}`}
            />
        );
    }
    return (
        <span className="ab-overview-cover-stage">
            <span className="ab-overview-cover-bg" aria-hidden>
                <img src={src} alt="" loading="lazy" />
            </span>
            <img className="ab-overview-cover-frame" src={src} alt="" loading="lazy" />
        </span>
    );
}

function getOverviewPageImage(album, pageNum, totalPages, showSamples) {
    const albumId = album?.id;
    if (pageNum === 0) {
        return resolveCoverImageSrc(album, { showSamples });
    }
    const directSrc = getPagePhotoOverride(albumId, pageNum);
    if (directSrc) return directSrc;
    const spreadLeft = getSpreadLeftPageIndex(pageNum, { showCover: true, totalPages });
    const cellId = pageNum === spreadLeft ? 1 : 2;
    const slot = getGridSlotPhoto(albumId, pageNum, cellId, spreadLeft, totalPages, {
        wholeSpread: album?.grid_layout === 'whole-spread',
    });
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
    canRemovePages = false,
    onRemovePages,
    pageCountBusy = false,
    showGridComments = false,
    spreadCommentsBySpread = null,
    swapMarkMode = false,
    pinMarkMode = false,
    proofToolsHover = true,
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
    const userNavigatedRef = useRef(false);
    const dimsRafRef = useRef(null);
    const [dims, setDims] = useState({ width: 480, height: 480 });
    const [pageIndex, setPageIndex] = useState(initialPage);
    const [swapMarks, setSwapMarks] = useState(() => getSwapMarks(album?.id));
    const [swapPickerOrigin, setSwapPickerOrigin] = useState(null);
    const [photoPins, setPhotoPins] = useState(() => getPhotoPins(album?.id));
    const [pinModeActive, setPinModeActive] = useState(false);
    const [pinComposer, setPinComposer] = useState(null);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        setInitialized(false);
    }, [album?.id, totalPages]);

    const applyInitialPage = useCallback(() => {
        const api = bookRef.current?.pageFlip?.();
        if (!api?.getFlipController?.()) return false;
        const target = initialPage;
        const current = api.getCurrentPageIndex();
        if (current !== target) {
            api.turnToPage(target);
        }
        const resolved = api.getCurrentPageIndex();
        setPageIndex(resolved);
        return true;
    }, [initialPage]);
    const [overviewOpen, setOverviewOpen] = useState(false);
    const [focusOpen, setFocusOpen] = useState(false);
    const [flipBookPageCount, setFlipBookPageCount] = useState(totalPages);

    const totalSpreads = getTotalSpreads(totalPages, { showCover: true });
    const spreadIndex = pageToSpreadIndex(pageIndex, { showCover: true, totalPages });
    const currentSpreadComments =
        showGridComments && spreadCommentsBySpread
            ? spreadCommentsBySpread[spreadIndex] || null
            : null;
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
        userNavigatedRef.current = false;
    }, [initialPage, album?.id]);

    useLayoutEffect(() => {
        if (!initialized || isFlippingRef.current) return undefined;
        if (applyInitialPage()) return undefined;

        let attempts = 0;
        const timer = window.setInterval(() => {
            attempts += 1;
            if (applyInitialPage() || attempts >= 24) {
                window.clearInterval(timer);
            }
        }, 50);

        return () => window.clearInterval(timer);
    }, [applyInitialPage, album?.id, totalPages, initialized]);

    useEffect(() => {
        if (!initialized || isFlippingRef.current) return;
        applyInitialPage();
    }, [applyInitialPage, transformRevision, initialized]);

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
            userNavigatedRef.current = true;
            requestAnimationFrame(() => {
                setPageIndex(idx);
                onPageChange?.(idx);
            });
        },
        [onPageChange]
    );

    const handleBookUpdate = useCallback(() => {
        if (userNavigatedRef.current || isFlippingRef.current) return;
        requestAnimationFrame(() => {
            applyInitialPage();
        });
    }, [applyInitialPage]);

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
        if (!overviewOpen) {
            setFlipBookPageCount(totalPages);
            return undefined;
        }
        const timer = window.setTimeout(() => {
            setFlipBookPageCount(totalPages);
        }, FLIP_PAGE_SYNC_MS);
        return () => window.clearTimeout(timer);
    }, [totalPages, overviewOpen]);

    useEffect(() => {
        const maxPage = Math.max(0, totalPages - 1);
        if (pageIndex <= maxPage) return;
        setPageIndex(maxPage);
        onPageChange?.(maxPage);
        const api = bookRef.current?.pageFlip?.();
        if (api?.getFlipController?.()) {
            api.turnToPage(maxPage);
        }
    }, [totalPages, pageIndex, onPageChange]);

    useEffect(() => {
        setSwapMarks(getSwapMarks(album?.id));
    }, [album?.id]);

    useEffect(() => {
        const onSwapMarksChanged = (e) => {
            if (!album?.id) return;
            if (e.detail?.albumId && e.detail.albumId !== album.id) return;
            setSwapMarks(getSwapMarks(album.id));
        };
        window.addEventListener(SWAP_MARKS_CHANGED_EVENT, onSwapMarksChanged);
        return () => window.removeEventListener(SWAP_MARKS_CHANGED_EVENT, onSwapMarksChanged);
    }, [album?.id]);

    useEffect(() => {
        setPhotoPins(getPhotoPins(album?.id));
    }, [album?.id]);

    useEffect(() => {
        const onPinsChanged = (e) => {
            if (!album?.id) return;
            if (e.detail?.albumId && e.detail.albumId !== album.id) return;
            setPhotoPins(getPhotoPins(album.id));
        };
        window.addEventListener(PHOTO_PINS_CHANGED_EVENT, onPinsChanged);
        return () => window.removeEventListener(PHOTO_PINS_CHANGED_EVENT, onPinsChanged);
    }, [album?.id]);

    const handleActivatePinMode = useCallback(() => {
        setPinModeActive(true);
        setPinComposer(null);
    }, []);

    const exitPinMode = useCallback(() => {
        setPinModeActive(false);
        setPinComposer(null);
    }, []);

    useEffect(() => {
        if (!pinModeActive || !pinMarkMode) return undefined;

        const onDocClick = (e) => {
            const target = e.target;
            if (!(target instanceof Element)) return;
            if (target.closest('.ab-photo-pin-layer--placing')) return;
            if (target.closest('.ab-pin-composer')) return;
            if (target.closest('.ab-proof-tool-btn')) return;
            if (target.closest('.ab-proof-tools-hover')) return;
            exitPinMode();
        };

        const timer = window.setTimeout(() => {
            document.addEventListener('click', onDocClick);
        }, 0);

        return () => {
            window.clearTimeout(timer);
            document.removeEventListener('click', onDocClick);
        };
    }, [pinModeActive, pinMarkMode, exitPinMode]);

    useEffect(() => {
        if (!pinModeActive) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') exitPinMode();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [pinModeActive, exitPinMode]);

    const handleSwapRequest = useCallback(
        (slot) => {
            if (!album?.id || !slot) return;
            const locked = isSlotSwapLocked(swapMarks, slot.pageNum, slot.cellId ?? 0, {
                placementMode,
                spreadLeft: slot.spreadLeft ?? slot.pageNum,
            });
            if (locked) return;
            setSwapPickerOrigin(slot);
        },
        [album?.id, swapMarks, placementMode]
    );

    const handleSwapPick = useCallback(
        (secondSlot) => {
            if (!album?.id || !swapPickerOrigin) return;
            addSwapMark(album.id, swapPickerOrigin, secondSlot);
            setSwapPickerOrigin(null);
        },
        [album?.id, swapPickerOrigin]
    );

    const getSwapMarkInfo = useCallback(
        (pageNum, cellId, spreadLeft) =>
            getSwapMarkForSlot(swapMarks, pageNum, cellId, {
                placementMode,
                spreadLeft,
                gridLayout: album?.grid_layout || 'two-page',
            }),
        [swapMarks, placementMode, album?.grid_layout]
    );

    const getSlotPins = useCallback(
        (pageNum, cellId, spreadLeft) =>
            getPinsForSlot(photoPins, pageNum, cellId, {
                placementMode,
                spreadLeft,
            }),
        [photoPins, placementMode]
    );

    const handlePinPlace = useCallback((placement) => {
        setPinComposer(placement);
    }, []);

    const handlePinSave = useCallback(
        (message) => {
            if (!album?.id || !pinComposer) return;
            addPhotoPin(album.id, { ...pinComposer, message });
            setPinComposer(null);
        },
        [album?.id, pinComposer]
    );

    const handlePinRemove = useCallback(
        (pinId) => {
            if (!album?.id) return;
            removePhotoPin(album.id, pinId);
        },
        [album?.id]
    );

    const closeFocusView = useCallback(() => {
        setFocusOpen(false);
    }, []);

    const openFocusView = useCallback(() => {
        setOverviewOpen(false);
        setFocusOpen(true);
    }, []);

    const handleFocusPageChange = useCallback(
        (idx) => {
            setPageIndex(idx);
            onPageChange?.(idx);
            const api = bookRef.current?.pageFlip?.();
            if (api?.getFlipController?.() && api.getCurrentPageIndex() !== idx) {
                api.turnToPage(idx);
            }
        },
        [onPageChange]
    );

    const pages = useMemo(
        () =>
            Array.from({ length: flipBookPageCount }, (_, pageNum) => (
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
                    showGridComments={showGridComments}
                    selectionLeftPage={gridSelection?.leftPage ?? null}
                    selectionMode={gridSelection?.mode ?? null}
                    selectedCellId={gridSelection?.cellId ?? null}
                    onSelectCell={onSelectGridCell}
                    onSelectSpread={onSelectGridSpread}
                    onSelectCover={onSelectCover}
                    onTransformChange={onTransformChange}
                    transformRevision={transformRevision}
                    swapMarkMode={swapMarkMode}
                    getSwapMarkInfo={getSwapMarkInfo}
                    onSwapRequest={handleSwapRequest}
                    pinMarkMode={pinMarkMode}
                    pinModeActive={pinModeActive}
                    getPinsForSlot={getSlotPins}
                    onPinPlace={handlePinPlace}
                    onPinRemove={handlePinRemove}
                    onActivatePinMode={handleActivatePinMode}
                    proofToolsHover={proofToolsHover}
                />
            )),
        [
            album,
            flipBookPageCount,
            totalPages,
            editable,
            spreadEdit,
            placementMode,
            showSamples,
            previewMode,
            showGridComments,
            gridSelection?.leftPage,
            gridSelection?.mode,
            gridSelection?.cellId,
            onSelectGridCell,
            onSelectGridSpread,
            onSelectCover,
            onTransformChange,
            transformRevision,
            swapMarkMode,
            getSwapMarkInfo,
            handleSwapRequest,
            pinMarkMode,
            pinModeActive,
            getSlotPins,
            handlePinPlace,
            handlePinRemove,
            handleActivatePinMode,
            proofToolsHover,
        ]
    );

    return (
        <div
            className={`ab-root${previewMode ? ' ab-root--preview' : ''}${
                pinModeActive && pinMarkMode ? ' ab-root--pin-mode' : ''
            }`}
            ref={rootRef}
        >
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
                    className="ab-spread-display"
                    style={{ width: dims.width * 2 }}
                >
                <div
                    className="ab-flipbook-wrap"
                    ref={wrapRef}
                    style={{ width: dims.width * 2, height: dims.height }}
                >
                    <HTMLFlipBook
                        key={`${album?.id}-${flipBookPageCount}`}
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
                        onInit={() => {
                            setInitialized(true);
                            requestAnimationFrame(() => {
                                requestAnimationFrame(() => {
                                    applyInitialPage();
                                });
                            });
                        }}
                        onUpdate={handleBookUpdate}
                    >
                        {pages}
                    </HTMLFlipBook>
                </div>
                {currentSpreadComments?.length > 0 && (
                    <div className="ab-spread-comments-bar">
                        <SpreadGridComments
                            comments={currentSpreadComments}
                            variant="spreadBar"
                        />
                    </div>
                )}
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
                    className={`ab-overview${pageCountBusy ? ' ab-overview--page-busy' : ''}`}
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
                    <div className="ab-overview-body" onClick={(e) => e.stopPropagation()}>
                    <div
                        className={`ab-overview-grid${
                            pageCountBusy ? ' ab-overview-grid--transitioning' : ''
                        }`}
                    >
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
                            const isCover = overviewSpreadIndex === 0;
                            const isEndSpread = isEndHalfSpreadIndex(
                                overviewSpreadIndex,
                                totalPages
                            );
                            const coverPhotoSrc = isCover
                                ? resolveCoverImageSrc(album, { showSamples })
                                : null;
                            const endCoverSrc = leftSrc || spreadSrc;
                            const isEndHalf = isEndSpread;
                            const showSpreadFull = Boolean(spreadSrc && !isCover && !isEndSpread);
                            const isCurrent = overviewSpreadIndex === spreadIndex;
                            const spreadComments =
                                showGridComments && spreadCommentsBySpread
                                    ? spreadCommentsBySpread[overviewSpreadIndex] || null
                                    : null;
                            return (
                                <button
                                    key={`spread-${overviewSpreadIndex}`}
                                    type="button"
                                    className={`ab-overview-item${
                                        isCover ? ' ab-overview-item--cover' : ''
                                    }${isCurrent ? ' ab-overview-item--active' : ''}`}
                                    onClick={() => {
                                        bookRef.current?.pageFlip?.()?.turnToPage(targetPage);
                                        setPageIndex(targetPage);
                                        onPageChange?.(targetPage);
                                        setOverviewOpen(false);
                                    }}
                                >
                                    <span className="ab-overview-thumb ab-overview-thumb--spread">
                                        {showSpreadFull ? (
                                            <span className="ab-overview-page ab-overview-page--spread-full">
                                                <img src={spreadSrc} alt="" loading="lazy" />
                                                {spreadComments?.length > 0 && (
                                                    <SpreadGridComments
                                                        comments={spreadComments}
                                                        className="ab-grid-comments--overview"
                                                    />
                                                )}
                                            </span>
                                        ) : isCover ? (
                                            <>
                                                <span
                                                    className="ab-overview-page ab-overview-page--cover-blank"
                                                    aria-hidden
                                                />
                                                <span className="ab-overview-page ab-overview-page--cover-right">
                                                    <OverviewFramedPhoto src={coverPhotoSrc} />
                                                    {spreadComments?.length > 0 && coverPhotoSrc && (
                                                        <SpreadGridComments
                                                            comments={spreadComments}
                                                            className="ab-grid-comments--overview"
                                                        />
                                                    )}
                                                </span>
                                            </>
                                        ) : isEndHalf ? (
                                            <>
                                                <span className="ab-overview-page ab-overview-page--end-left">
                                                    <OverviewFramedPhoto src={endCoverSrc} />
                                                    {spreadComments?.length > 0 && endCoverSrc && (
                                                        <SpreadGridComments
                                                            comments={spreadComments}
                                                            className="ab-grid-comments--overview"
                                                        />
                                                    )}
                                                </span>
                                                <span
                                                    className="ab-overview-page ab-overview-page--cover-blank"
                                                    aria-hidden
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <span className="ab-overview-page">
                                                    {leftSrc ? (
                                                        <img src={leftSrc} alt="" loading="lazy" />
                                                    ) : (
                                                        <span className="ab-overview-placeholder" />
                                                    )}
                                                    {spreadComments?.length > 0 && leftSrc && (
                                                        <SpreadGridComments
                                                            comments={spreadComments}
                                                            className="ab-grid-comments--overview"
                                                        />
                                                    )}
                                                </span>
                                                {!spreadSrc && (
                                                    <span className="ab-overview-page">
                                                        {rightSrc ? (
                                                            <img
                                                                src={rightSrc}
                                                                alt=""
                                                                loading="lazy"
                                                            />
                                                        ) : (
                                                            <span className="ab-overview-placeholder" />
                                                        )}
                                                        {spreadComments?.length > 0 && rightSrc && (
                                                            <SpreadGridComments
                                                                comments={spreadComments}
                                                                className="ab-grid-comments--overview"
                                                            />
                                                        )}
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </span>
                                    <span className="ab-overview-label">
                                        {isCover ? 'Cover' : isEndSpread ? 'End' : overviewSpreadIndex}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    {(canAddPages || canRemovePages) && (
                        <div className="ab-overview-actions">
                            {canAddPages && onAddPages && (
                                <button
                                    type="button"
                                    className="ab-overview-item ab-overview-item--add"
                                    disabled={pageCountBusy}
                                    onClick={async (e) => {
                                        e.stopPropagation();
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
                            {canRemovePages && onRemovePages && (
                                <button
                                    type="button"
                                    className="ab-overview-item ab-overview-item--remove"
                                    disabled={pageCountBusy}
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        await onRemovePages();
                                    }}
                                >
                                    <span className="ab-overview-thumb ab-overview-thumb--remove">
                                        <span className="ab-overview-add-plus ab-overview-remove-minus">
                                            −
                                        </span>
                                    </span>
                                    <span className="ab-overview-label">
                                        {pageCountBusy ? 'Removing...' : 'Remove page'}
                                    </span>
                                </button>
                            )}
                        </div>
                    )}
                    </div>
                </div>
            )}

            {focusOpen && (
                <AlbumFocusView
                    album={album}
                    totalPages={totalPages}
                    startPage={pageIndex}
                    showSamples={showSamples}
                    transformRevision={transformRevision}
                    onPageChange={handleFocusPageChange}
                    onClose={closeFocusView}
                />
            )}

            <AlbumSwapPickerModal
                open={Boolean(swapPickerOrigin)}
                album={album}
                albumId={album?.id}
                totalPages={totalPages}
                originSlot={swapPickerOrigin}
                swapMarks={swapMarks}
                showSamples={showSamples}
                onSelect={handleSwapPick}
                onClose={() => setSwapPickerOrigin(null)}
            />

            <AlbumPinComposer
                open={Boolean(pinComposer)}
                slotLabel={pinComposer?.label}
                onSave={handlePinSave}
                onClose={() => setPinComposer(null)}
            />
        </div>
    );
};

export default AlbumBook;
