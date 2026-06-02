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
    spreadIndexToPage,
} from './albumSpreadUtils';
import { getSampleImageForPage } from './sampleAlbumImages';
import SpreadGridComments from './SpreadGridComments';
import {
    COMMENTS_SEEN_CHANGED_EVENT,
} from '../../services/smartAlbumComments.service';
import AlbumFocusView from './AlbumFocusView';
import AlbumSwapPickerModal from './AlbumSwapPickerModal';
import AlbumPinComposer from './AlbumPinComposer';
import {
    addSwapMark,
    getSwapMarkForSlot,
    getSwapMarks,
    makeSlotKey,
    slotsMatch,
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
import { AlbumBookPageContext } from './AlbumBookPageContext';

export { getSpreadPages, getTotalSpreads, pageToSpreadIndex, spreadIndexToPage } from './albumSpreadUtils';

const FLIP_TIME_MS = 800;
const BOOK_PAGE_HEIGHT_MIN = 300;
const BOOK_PAGE_HEIGHT_MAX = 520;
const BOOK_PAGE_HEIGHT_SCALE = 0.93;
const BOOK_STAGE_MIN_PX = 80;
/** Stage must be tall enough for real page height — avoids mounting while flex layout is still 0px. */
const BOOK_STAGE_READY_MIN_PX = 300;

function computeBookDimensions(w, h, gridSize = 'square') {
    if (w < BOOK_STAGE_MIN_PX || h < BOOK_STAGE_MIN_PX) return null;
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

function getBookDimensions(stageEl, gridSize = 'square') {
    if (!stageEl) return null;
    const h = stageEl.clientHeight;
    if (h < BOOK_STAGE_READY_MIN_PX) return null;
    return computeBookDimensions(stageEl.clientWidth, h, gridSize);
}

function getFallbackBookDimensions(rootEl, gridSize = 'square') {
    const rootW = rootEl?.clientWidth ?? 0;
    const rootH = rootEl?.clientHeight ?? 0;
    const w =
        rootW > BOOK_STAGE_MIN_PX ? rootW - 48 : Math.min(960, window.innerWidth - 280);
    const h =
        rootH > BOOK_STAGE_MIN_PX ? rootH - 48 : Math.max(360, window.innerHeight - 280);
    return computeBookDimensions(w, h, gridSize);
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
    onSlotActivate,
    onSelectCover,
    onTransformChange,
    transformRevision = 0,
    photoRevision = 0,
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
    const syncingPageRef = useRef(false);
    const dimsRafRef = useRef(null);
    const prevDimsRef = useRef(null);
    const pendingDimsCommitRef = useRef(null);
    const [dims, setDims] = useState(null);
    const [stableDims, setStableDims] = useState(null);
    const [pageIndex, setPageIndex] = useState(initialPage);
    const [swapMarks, setSwapMarks] = useState(() => getSwapMarks(album?.id));
    const [swapPickerOrigin, setSwapPickerOrigin] = useState(null);
    const [swapPinFlow, setSwapPinFlow] = useState(null);
    const [photoPins, setPhotoPins] = useState(() => getPhotoPins(album?.id));
    const [pinModeActive, setPinModeActive] = useState(false);
    const [pinComposer, setPinComposer] = useState(null);
    const [initialized, setInitialized] = useState(false);
    const [commentsSeenTick, setCommentsSeenTick] = useState(0);

    const applyInitialPage = useCallback(() => {
        const api = bookRef.current?.pageFlip?.();
        if (!api?.getFlipController?.()) return false;
        const target = Math.max(0, Math.min(totalPages - 1, initialPage));
        syncingPageRef.current = true;
        const current = api.getCurrentPageIndex();
        if (current !== target) {
            api.turnToPage(target);
            api.update();
        }
        const resolved = api.getCurrentPageIndex();
        setPageIndex(resolved);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                syncingPageRef.current = false;
            });
        });
        return resolved === target;
    }, [initialPage, totalPages]);
    const [overviewOpen, setOverviewOpen] = useState(false);
    const [focusOpen, setFocusOpen] = useState(false);

    const flipBookStructuralKey = useMemo(
        () =>
            `${album?.id ?? 'album'}-${totalPages}-${album?.grid_size || 'square'}-${
                album?.grid_layout || 'two-page'
            }`,
        [album?.id, album?.grid_layout, album?.grid_size, totalPages]
    );

    useEffect(() => {
        setInitialized(false);
        setStableDims(null);
        setDims(null);
        userNavigatedRef.current = false;
        syncingPageRef.current = true;
    }, [flipBookStructuralKey]);

    const flipBookMountKey = useMemo(
        () =>
            stableDims
                ? `${flipBookStructuralKey}-${stableDims.width}x${stableDims.height}`
                : flipBookStructuralKey,
        [flipBookStructuralKey, stableDims]
    );

    useEffect(() => {
        setInitialized(false);
        syncingPageRef.current = true;
    }, [flipBookMountKey]);

    const totalSpreads = getTotalSpreads(totalPages, { showCover: true });
    const spreadIndex = pageToSpreadIndex(pageIndex, { showCover: true, totalPages });
    const currentSpreadComments =
        showGridComments && spreadCommentsBySpread
            ? spreadCommentsBySpread[spreadIndex] || null
            : null;

    useEffect(() => {
        if (!album?.id) return undefined;
        const onSeen = (e) => {
            if (e.detail?.albumId !== album.id) return;
            setCommentsSeenTick((tick) => tick + 1);
        };
        window.addEventListener(COMMENTS_SEEN_CHANGED_EVENT, onSeen);
        return () => window.removeEventListener(COMMENTS_SEEN_CHANGED_EVENT, onSeen);
    }, [album?.id]);
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
        syncingPageRef.current = true;
    }, [initialPage, album?.id]);

    const syncFlipbookToUrlPage = useCallback(() => {
        if (userNavigatedRef.current || isFlippingRef.current) return false;
        const api = bookRef.current?.pageFlip?.();
        if (!api?.getFlipController?.()) return false;
        const target = Math.max(0, Math.min(totalPages - 1, initialPage));
        const current = api.getCurrentPageIndex();
        if (current === target) {
            setPageIndex((prev) => (prev === target ? prev : target));
            return true;
        }
        return applyInitialPage();
    }, [applyInitialPage, initialPage, totalPages]);

    useLayoutEffect(() => {
        if (!initialized || !stableDims) return undefined;
        if (syncFlipbookToUrlPage()) return undefined;

        let attempts = 0;
        const timer = window.setInterval(() => {
            attempts += 1;
            if (syncFlipbookToUrlPage() || attempts >= 60) {
                window.clearInterval(timer);
            }
        }, 50);

        return () => window.clearInterval(timer);
    }, [
        syncFlipbookToUrlPage,
        initialized,
        stableDims,
        initialPage,
        totalPages,
        transformRevision,
        photoRevision,
        placementMode,
        spreadEdit,
        editable,
        flipBookMountKey,
    ]);

    useLayoutEffect(() => {
        const stage = stageOuterRef.current ?? stageRef.current;
        if (!stage) return undefined;

        let measureAttempts = 0;
        const maxMeasureAttempts = 64;

        const commitDims = (next) => {
            if (pendingDimsCommitRef.current != null) {
                cancelAnimationFrame(pendingDimsCommitRef.current);
            }
            pendingDimsCommitRef.current = requestAnimationFrame(() => {
                pendingDimsCommitRef.current = requestAnimationFrame(() => {
                    pendingDimsCommitRef.current = null;
                    const measureTarget = stageOuterRef.current ?? stageRef.current;
                    const verified = getBookDimensions(measureTarget, album?.grid_size) ?? next;
                    if (!verified) return;
                    setDims((prev) =>
                        prev &&
                        prev.width === verified.width &&
                        prev.height === verified.height
                            ? prev
                            : verified
                    );
                    setStableDims((prev) =>
                        prev &&
                        prev.width === verified.width &&
                        prev.height === verified.height
                            ? prev
                            : verified
                    );
                });
            });
        };

        const update = () => {
            if (isFlippingRef.current) return;
            if (dimsRafRef.current != null) cancelAnimationFrame(dimsRafRef.current);
            dimsRafRef.current = requestAnimationFrame(() => {
                dimsRafRef.current = null;
                const next = getBookDimensions(stage, album?.grid_size);
                if (!next) {
                    measureAttempts += 1;
                    if (measureAttempts >= maxMeasureAttempts) {
                        const fallback = getFallbackBookDimensions(
                            rootRef.current,
                            album?.grid_size
                        );
                        if (fallback) commitDims(fallback);
                    } else {
                        dimsRafRef.current = requestAnimationFrame(update);
                    }
                    return;
                }
                measureAttempts = 0;
                commitDims(next);
            });
        };
        update();
        const ro = new ResizeObserver(() => {
            measureAttempts = 0;
            update();
        });
        ro.observe(stage);
        window.addEventListener('resize', update);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', update);
            if (dimsRafRef.current != null) cancelAnimationFrame(dimsRafRef.current);
            if (pendingDimsCommitRef.current != null) {
                cancelAnimationFrame(pendingDimsCommitRef.current);
            }
        };
    }, [album?.grid_size, flipBookStructuralKey]);

    useLayoutEffect(() => {
        if (!stableDims || !initialized) return;
        const prev = prevDimsRef.current;
        prevDimsRef.current = stableDims;
        if (prev && prev.width === stableDims.width && prev.height === stableDims.height) return;

        const api = bookRef.current?.pageFlip?.();
        if (!api?.getFlipController?.()) return;
        api.update();
        if (!userNavigatedRef.current) {
            syncFlipbookToUrlPage();
        }
    }, [stableDims, initialized, syncFlipbookToUrlPage]);

    const bookDims = stableDims ?? dims;

    const goToPage = useCallback(
        (pageNum) => {
            const clamped = Math.max(0, Math.min(totalPages - 1, pageNum));
            syncingPageRef.current = true;
            const api = bookRef.current?.pageFlip?.();
            if (api?.getFlipController?.()) {
                api.turnToPage(clamped);
            }
            setPageIndex(clamped);
            onPageChange?.(clamped);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    syncingPageRef.current = false;
                });
            });
        },
        [totalPages, onPageChange]
    );

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
            // Ignore programmatic sync flips, but accept user-driven page turns.
            if (syncingPageRef.current && !isFlippingRef.current) return;
            const idx = e.data;
            syncingPageRef.current = false;
            userNavigatedRef.current = true;
            requestAnimationFrame(() => {
                setPageIndex(idx);
                onPageChange?.(idx);
            });
        },
        [onPageChange]
    );

    const handleBookUpdate = useCallback(() => {
        if (isFlippingRef.current || userNavigatedRef.current) return;
        requestAnimationFrame(() => {
            syncFlipbookToUrlPage();
        });
    }, [syncFlipbookToUrlPage]);

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
        const api = bookRef.current?.pageFlip?.();
        if (!api?.getFlipController?.()) return;
        // Some builds of pageflip are picky about flipPrev(direction).
        if (typeof api.flipPrev === 'function') api.flipPrev();
        else if (typeof api.turnToPrevPage === 'function') api.turnToPrevPage();
    }, []);

    const flipNext = useCallback(() => {
        const api = bookRef.current?.pageFlip?.();
        if (!api?.getFlipController?.()) return;
        if (typeof api.flipNext === 'function') api.flipNext();
        else if (typeof api.turnToNextPage === 'function') api.turnToNextPage();
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
        const maxPage = Math.max(0, totalPages - 1);
        if (pageIndex <= maxPage) return;
        goToPage(maxPage);
    }, [totalPages, pageIndex, goToPage]);

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
        if (previewMode) return undefined;

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
    }, [pinModeActive, pinMarkMode, exitPinMode, previewMode]);

    useEffect(() => {
        if (!pinModeActive) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') exitPinMode();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [pinModeActive, exitPinMode]);

    useEffect(() => {
        if (!swapPinFlow) return undefined;

        const onDocClick = (e) => {
            const target = e.target;
            if (!(target instanceof Element)) return;
            if (target.closest('.ab-photo-pin-layer--placing-swap')) return;
            if (target.closest('.ab-proof-tool-btn')) return;
            if (target.closest('.ab-proof-tools-hover')) return;
            setSwapPinFlow(null);
        };

        const timer = window.setTimeout(() => {
            document.addEventListener('click', onDocClick);
        }, 0);

        return () => {
            window.clearTimeout(timer);
            document.removeEventListener('click', onDocClick);
        };
    }, [swapPinFlow]);

    useEffect(() => {
        if (!previewMode) return;
        if (pinMarkMode) {
            setPinModeActive(true);
            setSwapPinFlow(null);
            return;
        }
        setPinModeActive(false);
        setPinComposer(null);
    }, [previewMode, pinMarkMode]);

    useEffect(() => {
        if (!previewMode) return;
        if (!swapMarkMode) {
            setSwapPinFlow(null);
        }
    }, [previewMode, swapMarkMode]);

    useEffect(() => {
        if (!swapPinFlow) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') setSwapPinFlow(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [swapPinFlow]);

    const handleSwapRequest = useCallback(
        (slot) => {
            if (!album?.id || !slot) return;
            setSwapPinFlow({
                originSlot: slot,
                originPoint: null,
            });
        },
        [album?.id]
    );

    const handleSwapPick = useCallback(
        (secondSlot) => {
            if (!album?.id || !swapPickerOrigin) return;
            addSwapMark(album.id, swapPickerOrigin, secondSlot);
            setSwapPickerOrigin(null);
        },
        [album?.id, swapPickerOrigin]
    );

    const handleSwapPinPlace = useCallback(
        (placement) => {
            if (!album?.id || !placement) return;
            const placementPoint = {
                xPct: placement.xPct,
                yPct: placement.yPct,
                pageNum: placement.pageNum,
                cellId: placement.cellId ?? 0,
            };
            if (!swapPinFlow) {
                if (!swapMarkMode) return;
                setSwapPinFlow({
                    originSlot: placement,
                    originPoint: placementPoint,
                });
                return;
            }
            const originSlot = swapPinFlow.originSlot;

            if (!swapPinFlow.originPoint) {
                if (slotsMatch(originSlot, placement)) {
                    setSwapPinFlow((prev) =>
                        prev
                            ? {
                                  ...prev,
                                  originPoint: placementPoint,
                              }
                            : prev
                    );
                    return;
                }
                addSwapMark(album.id, originSlot, placement, {
                    pointA: {
                        xPct: 50,
                        yPct: 50,
                        pageNum: originSlot.pageNum,
                        cellId: originSlot.cellId ?? 0,
                    },
                    pointB: placementPoint,
                });
                setSwapPinFlow(null);
                return;
            }

            if (slotsMatch(originSlot, placement)) return;

            addSwapMark(album.id, originSlot, placement, {
                pointA: swapPinFlow.originPoint,
                pointB: placementPoint,
            });
            setSwapPinFlow(null);
        },
        [album?.id, swapPinFlow, swapMarkMode]
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

    const pageContextValue = useMemo(
        () => ({
            selectionLeftPage: gridSelection?.leftPage ?? null,
            selectionMode: gridSelection?.mode ?? null,
            selectedCellId: gridSelection?.cellId ?? null,
            photoRevision,
            transformRevision,
            showGridComments,
            onSelectCell: onSelectGridCell,
            onSelectSpread: onSelectGridSpread,
            onSlotActivate,
            onSelectCover,
            onTransformChange,
            swapMarkMode,
            getSwapMarkInfo,
            onSwapRequest: handleSwapRequest,
            swapPinModeActive: previewMode ? swapMarkMode : Boolean(swapPinFlow),
            swapPinOriginKey: swapPinFlow
                ? makeSlotKey(
                      swapPinFlow.originSlot.pageNum,
                      swapPinFlow.originSlot.cellId ?? 0
                  )
                : null,
            swapPinTargetStep: Boolean(swapPinFlow?.originPoint),
            swapPinOriginPoint: swapPinFlow?.originPoint || null,
            onPlaceSwapPin: handleSwapPinPlace,
            pinMarkMode,
            pinModeActive,
            getPinsForSlot: getSlotPins,
            onPinPlace: handlePinPlace,
            onPinRemove: handlePinRemove,
            onActivatePinMode: handleActivatePinMode,
            proofToolsHover,
        }),
        [
            gridSelection?.leftPage,
            gridSelection?.mode,
            gridSelection?.cellId,
            photoRevision,
            transformRevision,
            showGridComments,
            onSelectGridCell,
            onSelectGridSpread,
            onSlotActivate,
            onSelectCover,
            onTransformChange,
            swapMarkMode,
            pinMarkMode,
            pinModeActive,
            proofToolsHover,
            handleSwapRequest,
            swapPinFlow,
            handleSwapPinPlace,
            previewMode,
            getSwapMarkInfo,
            getSlotPins,
            handlePinPlace,
            handlePinRemove,
            handleActivatePinMode,
        ]
    );

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
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
            </button>

            <div className="ab-book-stage" ref={stageOuterRef}>
                <div className="ab-book-stage-inner" ref={stageRef} aria-hidden="true" />
                <div className="ab-flip-escape" ref={escapeRef}>
                <div
                    className="ab-spread-display"
                    style={bookDims ? { width: bookDims.width * 2 } : undefined}
                >
                <div
                    className="ab-spread-book-block"
                    style={
                        bookDims
                            ? { width: bookDims.width * 2 }
                            : undefined
                    }
                >
                <div
                    className="ab-flipbook-wrap"
                    ref={wrapRef}
                    style={
                        bookDims
                            ? { width: bookDims.width * 2, height: bookDims.height }
                            : undefined
                    }
                >
                    {bookDims ? (
                    <AlbumBookPageContext.Provider value={pageContextValue}>
                    <HTMLFlipBook
                        key={flipBookMountKey}
                        ref={bookRef}
                        className="ab-html-flipbook ab-html-flipbook--fixed"
                        style={{
                            width: bookDims.width * 2,
                            height: bookDims.height,
                        }}
                        renderOnlyPageLengthChange
                        width={bookDims.width}
                        height={bookDims.height}
                        size="fixed"
                        autoSize={false}
                        minWidth={bookDims.width}
                        maxWidth={bookDims.width}
                        minHeight={bookDims.height}
                        maxHeight={bookDims.height}
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
                            syncingPageRef.current = true;
                            setInitialized(true);
                            requestAnimationFrame(() => {
                                requestAnimationFrame(() => {
                                    syncFlipbookToUrlPage();
                                });
                            });
                        }}
                        onUpdate={handleBookUpdate}
                    >
                        {pages}
                    </HTMLFlipBook>
                    </AlbumBookPageContext.Provider>
                    ) : null}
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
                {currentSpreadComments?.length > 0 && (
                    <div className="ab-spread-comments-bar">
                        <SpreadGridComments
                            comments={currentSpreadComments}
                            variant="spreadBar"
                            albumId={album?.id}
                            seenTick={commentsSeenTick}
                        />
                    </div>
                )}
                </div>
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
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
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
                            const spreadComments = spreadCommentsBySpread?.[overviewSpreadIndex] ?? null;
                            return (
                                <button
                                    key={`spread-${overviewSpreadIndex}`}
                                    type="button"
                                    className={`ab-overview-item${
                                        isCover ? ' ab-overview-item--cover' : ''
                                    }${isCurrent ? ' ab-overview-item--active' : ''}${
                                        spreadComments?.length ? ' ab-overview-item--has-comments' : ''
                                    }`}
                                    onClick={() => {
                                        goToPage(targetPage);
                                        setOverviewOpen(false);
                                    }}
                                >
                                    <span className="ab-overview-thumb ab-overview-thumb--spread">
                                        {showSpreadFull ? (
                                            <span className="ab-overview-page ab-overview-page--spread-full">
                                                <img src={spreadSrc} alt="" loading="lazy" />
                                            </span>
                                        ) : isCover ? (
                                            <>
                                                <span
                                                    className="ab-overview-page ab-overview-page--cover-blank"
                                                    aria-hidden
                                                />
                                                <span className="ab-overview-page ab-overview-page--cover-right">
                                                    <OverviewFramedPhoto src={coverPhotoSrc} />
                                                </span>
                                            </>
                                        ) : isEndHalf ? (
                                            <>
                                                <span className="ab-overview-page ab-overview-page--end-left">
                                                    <OverviewFramedPhoto src={endCoverSrc} />
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
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </span>
                                    {spreadComments?.length > 0 && (
                                        <SpreadGridComments
                                            comments={spreadComments}
                                            variant="overview"
                                        />
                                    )}
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
