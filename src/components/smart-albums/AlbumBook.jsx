import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import HTMLFlipBook from 'react-pageflip';
import AlbumFlipPage from './AlbumFlipPage';
import {
    getGridSlotPhoto,
    getPagePhotoOverride,
    getSpreadPhotoOverride,
    resolveCoverImageSrc,
} from './albumPagePhotos';
import { getSpreadLeftPageIndex } from './albumSpreadGrid';
import { canDeleteSpreadAtLeftPage } from './albumDeleteSpread';
import {
    flipbookIndexToStoragePage,
    getAlbumSpreadOptions,
    getEndSpreadPageIndices,
    getFlipbookStoragePages,
    getSpreadContext,
    getSpreadPages,
    getTotalSpreads,
    isDraggableOverviewSpread,
    isEndHalfSpreadIndex,
    isWholeSpreadLayout,
    formatOverviewSpreadLabel,
    normalizeStoragePageIndex,
    pageToSpreadIndex,
    spreadIndexToPage,
    storagePageToFlipbookIndex,
} from './albumSpreadUtils';
import { getSampleImageForPage } from './sampleAlbumImages';
import SpreadGridComments from './SpreadGridComments';
import {
    COMMENTS_SEEN_CHANGED_EVENT,
} from '../../services/smartAlbumComments.service';
import AlbumFocusView from './AlbumFocusView';
import AlbumSwapPickerModal from './AlbumSwapPickerModal';
import AlbumPinComposer from './AlbumPinComposer';
import { closeAlbumPinPopovers } from './albumPinPopoverEvents';
import useSpreadMagnify from './useSpreadMagnify';
import {
    addSwapMark,
    getSwapMarksForSlot,
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
import {
    albumHadClientFeedbackBefore,
    notifyAfterClientFeedbackAdded,
} from './albumClientFeedbackNotify';
import './AlbumBook.css';
import './AlbumSwapMarks.css';
import './AlbumPhotoPins.css';
import { parseGridSizeAspect } from './albumGridSize';
import { AlbumBookPageContext } from './AlbumBookPageContext';
import { installSafePageFlip } from './pageFlipSafe';
import { albumHasBlankCovers, albumUsesBookWrap } from './albumSpreadUtils';
import { getBookWrapSpineLayout } from './bookWrapSpine';
import { SPINE_BOUNDS_CHANGED_EVENT } from './albumSpineSettings';
import { getSpreadPhotoTransform } from './albumPageTransforms';
import BookWrapSpineImage from './BookWrapSpineImage';
import OverviewLeatherCover from './OverviewLeatherCover';

export { getSpreadPages, getTotalSpreads, pageToSpreadIndex, spreadIndexToPage } from './albumSpreadUtils';

const FLIP_TIME_MS = 900;
const FLIP_CORNER = 'bottom';
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

function OverviewCoverPhoto({ src, placeholderClass = '' }) {
    if (!src) {
        return (
            <span
                className={`ab-overview-placeholder ab-overview-placeholder--cover${placeholderClass ? ` ${placeholderClass}` : ''}`}
            />
        );
    }
    return <img src={src} alt="" loading="lazy" draggable={false} />;
}

function OverviewBookWrapSegment({ src, side, layout, transform }) {
    if (!src) {
        return <span className="ab-overview-placeholder ab-overview-placeholder--cover" />;
    }
    return (
        <span className="ab-overview-wrap-crop">
            <BookWrapSpineImage
                src={src}
                side={side}
                layout={layout}
                transform={transform}
                className="ab-book-wrap-cover-img ab-overview-wrap-img"
            />
        </span>
    );
}

function getOverviewPageImage(album, pageNum, totalPages, showSamples) {
    const albumId = album?.id;
    const spreadOpts = getSpreadContext(album, totalPages);
    if (pageNum === 0 && spreadOpts.hasCovers) {
        return resolveCoverImageSrc(album, { showSamples });
    }
    const directSrc = getPagePhotoOverride(albumId, pageNum);
    if (directSrc) return directSrc;
    const spreadLeft = getSpreadLeftPageIndex(pageNum, { ...spreadOpts, totalPages });
    const cellId = pageNum === spreadLeft ? 1 : 2;
    const spreadCtx = getSpreadContext(album, totalPages);
    const slot = getGridSlotPhoto(albumId, pageNum, cellId, spreadLeft, totalPages, {
        wholeSpread: isWholeSpreadLayout(album?.grid_layout),
        spreadOpts: spreadCtx,
    });
    return slot.src || (showSamples ? getSampleImageForPage(pageNum) : null);
}

/** Crisp drag preview from the spread thumbnail (avoids native browser ghost trails). */
function createOverviewSpreadDragGhost(thumbEl, clientX, clientY) {
    const rect = thumbEl.getBoundingClientRect();
    const ghost = thumbEl.cloneNode(true);
    ghost.classList.add('ab-overview-drag-ghost');
    ghost.setAttribute('aria-hidden', 'true');
    Object.assign(ghost.style, {
        position: 'fixed',
        top: '-9999px',
        left: '-9999px',
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        margin: '0',
        pointerEvents: 'none',
        zIndex: '10000',
    });
    document.body.appendChild(ghost);
    const offsetX = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const offsetY = Math.min(Math.max(clientY - rect.top, 0), rect.height);
    return { ghost, offsetX, offsetY };
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
    onDeleteSpread,
    onReorderOverviewSpread,
    pageCountBusy = false,
    showGridComments = false,
    spreadCommentsBySpread = null,
    swapMarkMode = false,
    pinMarkMode = false,
    proofToolsHover = true,
    proofSpotPicker = false,
    spotCanComment = false,
    spotCanSwap = false,
    external3DCover = false,
    coverRevealFrom3D = false,
    coverRevealDelayMs = 0,
    coverHideTo3D = false,
    onCoverRevealFrom3DComplete,
    onCoverHideTo3DStart,
    onExternalCoverRequest,
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
    const isPinModeOn = previewMode ? pinMarkMode : pinModeActive;
    const spreadOpts = useMemo(
        () => getSpreadContext(album, totalPages),
        [album?.has_covers, album?.id, album?.page_count, totalPages]
    );
    const spreadCtx = useMemo(
        () => ({ ...spreadOpts, totalPages }),
        [spreadOpts, totalPages]
    );
    const [spineBoundsTick, setSpineBoundsTick] = useState(0);
    useEffect(() => {
        if (!album?.id) return undefined;
        const onChanged = (e) => {
            if (e.detail?.albumId === album.id) setSpineBoundsTick((t) => t + 1);
        };
        window.addEventListener(SPINE_BOUNDS_CHANGED_EVENT, onChanged);
        return () => window.removeEventListener(SPINE_BOUNDS_CHANGED_EVENT, onChanged);
    }, [album?.id]);
    const bookWrapSpineLayout = useMemo(() => {
        if (album?.has_covers !== true) return null;
        if (albumHasBlankCovers(album) && !getSpreadPhotoOverride(album?.id, 0)) {
            return null;
        }
        if (!albumUsesBookWrap(album) && !albumHasBlankCovers(album)) return null;
        return getBookWrapSpineLayout(album);
    }, [album, spineBoundsTick]);
    const coverTransform = useMemo(() => {
        if (!album?.id || album?.has_covers !== true) {
            return { x: 0, y: 0, scaleX: 1, scaleY: 1 };
        }
        void transformRevision;
        return getSpreadPhotoTransform(album.id, 0);
    }, [album?.id, album?.has_covers, transformRevision]);
    const overviewThumbStyle = useMemo(() => {
        const thumbW = 268;
        const pageAspect = parseGridSizeAspect(album?.grid_size || 'square');
        const spreadAspect = 2 * pageAspect;
        const thumbH = Math.round(thumbW / spreadAspect);
        return {
            '--ab-overview-thumb-h': `${Math.max(96, Math.min(200, thumbH))}px`,
        };
    }, [album?.grid_size]);

    const applyInitialPage = useCallback(() => {
        const api = bookRef.current?.pageFlip?.();
        if (!api?.getFlipController?.()) return false;
        const targetStorage = normalizeStoragePageIndex(initialPage, totalPages, spreadOpts);
        const targetFlip = storagePageToFlipbookIndex(targetStorage, totalPages, spreadOpts);
        syncingPageRef.current = true;
        const currentFlip = api.getCurrentPageIndex();
        if (currentFlip !== targetFlip) {
            api.turnToPage(targetFlip);
            api.update();
        }
        const resolvedStorage = flipbookIndexToStoragePage(
            api.getCurrentPageIndex(),
            totalPages,
            spreadOpts
        );
        setPageIndex(resolvedStorage);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                syncingPageRef.current = false;
            });
        });
        return resolvedStorage === targetStorage;
    }, [initialPage, totalPages, spreadOpts]);

    const [overviewOpen, setOverviewOpen] = useState(false);
    const [overviewTargetSpreadIndex, setOverviewTargetSpreadIndex] = useState(0);
    const overviewDragFromRef = useRef(null);
    const overviewDidDragRef = useRef(false);
    const overviewDragGhostRef = useRef(null);
    const [overviewDragOverIndex, setOverviewDragOverIndex] = useState(null);
    const [overviewDraggingIndex, setOverviewDraggingIndex] = useState(null);
    const [focusOpen, setFocusOpen] = useState(false);
    const [focusStartPage, setFocusStartPage] = useState(0);
    const focusPageRef = useRef(0);

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

    const totalSpreads = getTotalSpreads(totalPages, spreadOpts);
    const spreadLeftPage = getSpreadLeftPageIndex(pageIndex, spreadCtx);
    const spreadIndex = pageToSpreadIndex(spreadLeftPage, spreadCtx);
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
    const { left: leftNum, right: rightNum } = getSpreadPages(spreadIndex, totalPages, spreadOpts);

    const counterLabel = useMemo(() => {
        const label = formatOverviewSpreadLabel(spreadIndex, totalPages, spreadOpts);
        if (!label) return `${spreadIndex + 1}/${totalSpreads}`;
        return `${label}/${totalSpreads}`;
    }, [spreadIndex, totalPages, totalSpreads, spreadOpts]);

    const pageRangeLabel = useMemo(() => {
        if (rightNum < totalPages) return `${leftNum}–${rightNum}`;
        return String(leftNum);
    }, [leftNum, rightNum, totalPages]);

    useEffect(() => {
        userNavigatedRef.current = false;
        syncingPageRef.current = true;
        closeAlbumPinPopovers();
    }, [initialPage, album?.id]);

    const syncFlipbookToUrlPage = useCallback(() => {
        if (userNavigatedRef.current || isFlippingRef.current) return false;
        const api = bookRef.current?.pageFlip?.();
        if (!api?.getFlipController?.()) return false;
        const target = normalizeStoragePageIndex(initialPage, totalPages, spreadOpts);
        const current = flipbookIndexToStoragePage(
            api.getCurrentPageIndex(),
            totalPages,
            spreadOpts
        );
        if (current === target) {
            setPageIndex((prev) => (prev === target ? prev : target));
            return true;
        }
        return applyInitialPage();
    }, [applyInitialPage, initialPage, spreadOpts, totalPages]);

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

    const spreadMagnify = useSpreadMagnify({
        spreadKey: spreadIndex,
        viewportWidth: bookDims ? bookDims.width * 2 : 0,
        viewportHeight: bookDims?.height ?? 0,
    });

    const goToPage = useCallback(
        (pageNum) => {
            closeAlbumPinPopovers();
            if (previewMode) spreadMagnify.reset();
            const clamped = normalizeStoragePageIndex(pageNum, totalPages, spreadOpts);
            syncingPageRef.current = true;
            const api = bookRef.current?.pageFlip?.();
            if (api?.getFlipController?.()) {
                api.turnToPage(storagePageToFlipbookIndex(clamped, totalPages, spreadOpts));
            }
            setPageIndex(clamped);
            onPageChange?.(clamped);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    syncingPageRef.current = false;
                });
            });
        },
        [totalPages, spreadOpts, onPageChange, previewMode, spreadMagnify.reset]
    );

    const canDragOverviewSpreads = Boolean(editable && onReorderOverviewSpread && !pageCountBusy);

    const canDeleteOverviewSpread = useMemo(() => {
        if (!onDeleteSpread) return false;
        return canDeleteSpreadAtLeftPage(spreadLeftPage, totalPages, spreadOpts);
    }, [onDeleteSpread, spreadLeftPage, totalPages, spreadOpts]);

    useEffect(() => {
        if (!overviewOpen) return;
        setOverviewTargetSpreadIndex(spreadIndex);
    }, [overviewOpen, spreadIndex]);

    const openOverview = useCallback(() => {
        closeAlbumPinPopovers();
        setOverviewTargetSpreadIndex(spreadIndex);
        setOverviewOpen(true);
    }, [spreadIndex]);

    const handleOverviewSpreadDragStart = useCallback(
        (spreadIndex) => {
            if (!canDragOverviewSpreads) return;
            if (!isDraggableOverviewSpread(spreadIndex, totalPages, spreadOpts)) return;
            overviewDragFromRef.current = spreadIndex;
            overviewDidDragRef.current = false;
        },
        [canDragOverviewSpreads, totalPages, spreadOpts]
    );

    const handleOverviewSpreadDragOver = useCallback(
        (spreadIndex) => {
            if (!canDragOverviewSpreads) return;
            if (!isDraggableOverviewSpread(spreadIndex, totalPages, spreadOpts)) return;
            if (overviewDragFromRef.current === spreadIndex) {
                setOverviewDragOverIndex(null);
                return;
            }
            setOverviewDragOverIndex(spreadIndex);
        },
        [canDragOverviewSpreads, totalPages, spreadOpts]
    );

    const clearOverviewSpreadDragGhost = useCallback(() => {
        if (overviewDragGhostRef.current) {
            overviewDragGhostRef.current.remove();
            overviewDragGhostRef.current = null;
        }
    }, []);

    const handleOverviewSpreadDragEnd = useCallback(() => {
        overviewDragFromRef.current = null;
        setOverviewDragOverIndex(null);
        setOverviewDraggingIndex(null);
        clearOverviewSpreadDragGhost();
    }, [clearOverviewSpreadDragGhost]);

    const handleOverviewSpreadDrop = useCallback(
        (toSpreadIndex) => {
            const fromSpreadIndex = overviewDragFromRef.current;
            overviewDragFromRef.current = null;
            setOverviewDragOverIndex(null);
            if (!canDragOverviewSpreads || fromSpreadIndex == null) return;
            if (fromSpreadIndex === toSpreadIndex) return;
            overviewDidDragRef.current = true;
            onReorderOverviewSpread?.(fromSpreadIndex, toSpreadIndex);
        },
        [canDragOverviewSpreads, onReorderOverviewSpread]
    );

    useEffect(() => () => clearOverviewSpreadDragGhost(), [clearOverviewSpreadDragGhost]);

    const atStart = external3DCover ? false : spreadIndex <= 0;
    const atEnd = spreadIndex >= totalSpreads - 1;
    const endCoverOnly =
        album?.has_covers === true &&
        isEndHalfSpreadIndex(spreadIndex, totalPages, spreadOpts);
    const [coverClipTransition, setCoverClipTransition] = useState(null);
    const [coverRevealOpen, setCoverRevealOpen] = useState(false);
    const [coverHideTo3DActive, setCoverHideTo3DActive] = useState(false);
    const [endClipTransition, setEndClipTransition] = useState(null);
    const [endRevealOpen, setEndRevealOpen] = useState(false);
    const [bookFlipping, setBookFlipping] = useState(false);
    const externalCoverClipActive =
        coverRevealFrom3D || coverHideTo3DActive || coverHideTo3D;
    const frontCoverOnly =
        album?.has_covers === true &&
        spreadIndex === 0 &&
        (!external3DCover || externalCoverClipActive);
    const prevNavDisabled = bookFlipping || (!external3DCover && spreadIndex <= 0);
    const nextNavDisabled = atEnd || bookFlipping;
    const showCoverClip =
        album?.has_covers === true &&
        (!external3DCover || externalCoverClipActive) &&
        (frontCoverOnly ||
            coverClipTransition != null ||
            coverRevealFrom3D ||
            coverHideTo3DActive ||
            coverHideTo3D ||
            (bookFlipping && spreadIndex === 0));
    const lastSpreadIndex = Math.max(0, totalSpreads - 1);
    const preBackSpreadIndex = Math.max(0, totalSpreads - 2);
    const showEndClip =
        album?.has_covers === true &&
        (endCoverOnly ||
            endClipTransition != null ||
            (bookFlipping && spreadIndex === lastSpreadIndex));
    const coverWrapClassName = useMemo(() => {
        if (showCoverClip) {
            let cls = ' ab-flipbook-wrap--front-cover-only';
            if (coverClipTransition) cls += ' ab-flipbook-wrap--front-cover-transition';
            if (coverClipTransition === 'reveal' && coverRevealOpen) {
                cls += ' ab-flipbook-wrap--front-cover-reveal';
            }
            return cls;
        }
        if (showEndClip) {
            let cls = ' ab-flipbook-wrap--end-cover-only';
            if (endClipTransition) cls += ' ab-flipbook-wrap--end-cover-transition';
            if (endClipTransition === 'reveal' && endRevealOpen) {
                cls += ' ab-flipbook-wrap--end-cover-reveal';
            }
            return cls;
        }
        return '';
    }, [
        showCoverClip,
        showEndClip,
        coverClipTransition,
        coverRevealOpen,
        endClipTransition,
        endRevealOpen,
    ]);

    const setFlippingUi = useCallback((flipping) => {
        rootRef.current?.classList.toggle('ab-root--flipping', flipping);
        stageOuterRef.current?.classList.toggle('ab-book-stage--flipping', flipping);
        escapeRef.current?.classList.toggle('ab-flip-escape--flipping', flipping);
        wrapRef.current?.classList.toggle('ab-flipbook-wrap--flipping', flipping);
    }, []);

    const coverRevealFrom3DStartedRef = useRef(false);
    const coverRevealFrom3DDoneRef = useRef(false);
    const coverHideTo3DRef = useRef(false);

    /** Let clip-path transition paint its start frame before the page curl runs. */
    const beginCoverRevealFlip = useCallback((api) => {
        setCoverClipTransition('reveal');
        setCoverRevealOpen(false);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (wrapRef.current) void wrapRef.current.offsetWidth;
                setCoverRevealOpen(true);
                requestAnimationFrame(() => {
                    if (typeof api.flipNext === 'function') api.flipNext(FLIP_CORNER);
                    else if (typeof api.turnToNextPage === 'function') api.turnToNextPage();
                });
            });
        });
    }, []);

    const beginCoverHideTo3DFlip = useCallback(
        (api) => {
            onCoverHideTo3DStart?.();
            coverHideTo3DRef.current = true;
            setCoverHideTo3DActive(true);
            setCoverClipTransition('hide');
            setCoverRevealOpen(false);
            requestAnimationFrame(() => {
                if (typeof api.flipPrev === 'function') api.flipPrev(FLIP_CORNER);
                else if (typeof api.turnToPrevPage === 'function') api.turnToPrevPage();
            });
        },
        [onCoverHideTo3DStart]
    );

    const beginEndRevealFlip = useCallback((api) => {
        setEndClipTransition('reveal');
        setEndRevealOpen(false);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (wrapRef.current) void wrapRef.current.offsetWidth;
                setEndRevealOpen(true);
                requestAnimationFrame(() => {
                    if (typeof api.flipPrev === 'function') api.flipPrev(FLIP_CORNER);
                    else if (typeof api.turnToPrevPage === 'function') api.turnToPrevPage();
                });
            });
        });
    }, []);

    useEffect(() => {
        coverRevealFrom3DStartedRef.current = false;
        coverRevealFrom3DDoneRef.current = false;
    }, [flipBookMountKey, coverRevealFrom3D]);

    useEffect(() => {
        if (!coverRevealFrom3D || !initialized || !stableDims || coverRevealFrom3DStartedRef.current) {
            return undefined;
        }
        const api = bookRef.current?.pageFlip?.();
        if (!api?.getFlipController?.()) return undefined;

        const runReveal = () => {
            if (coverRevealFrom3DStartedRef.current) return;
            coverRevealFrom3DStartedRef.current = true;
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (wrapRef.current) void wrapRef.current.offsetWidth;

                    const resetToCover = () => {
                        syncingPageRef.current = true;
                        api.turnToPage(storagePageToFlipbookIndex(0, totalPages, spreadOpts));
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                syncingPageRef.current = false;
                                syncingPageRef.current = true;
                                api.turnToPage(1);
                                requestAnimationFrame(() => {
                                    requestAnimationFrame(() => {
                                        syncingPageRef.current = false;
                                        beginCoverRevealFlip(api);
                                    });
                                });
                            });
                        });
                    };

                    const currentStorage = flipbookIndexToStoragePage(
                        api.getCurrentPageIndex(),
                        totalPages,
                        spreadOpts
                    );
                    if (currentStorage !== 0) {
                        resetToCover();
                        return;
                    }

                    const current = api.getCurrentPageIndex();
                    if (current < 1) {
                        syncingPageRef.current = true;
                        api.turnToPage(1);
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                syncingPageRef.current = false;
                                beginCoverRevealFlip(api);
                            });
                        });
                        return;
                    }
                    beginCoverRevealFlip(api);
                });
            });
        };

        const delay = Math.max(0, coverRevealDelayMs);
        if (delay === 0) {
            runReveal();
            return undefined;
        }
        const timer = window.setTimeout(runReveal, delay);
        return () => window.clearTimeout(timer);
    }, [beginCoverRevealFlip, coverRevealDelayMs, coverRevealFrom3D, initialized, stableDims, spreadOpts, totalPages]);

    const handleFlip = useCallback(
        (e) => {
            // Ignore programmatic sync flips, but accept user-driven page turns.
            if (syncingPageRef.current && !isFlippingRef.current) return;
            closeAlbumPinPopovers();
            const storageIdx = flipbookIndexToStoragePage(e.data, totalPages, spreadOpts);
            syncingPageRef.current = false;
            userNavigatedRef.current = true;
            requestAnimationFrame(() => {
                setPageIndex(storageIdx);
                onPageChange?.(storageIdx);
            });
        },
        [onPageChange, totalPages, spreadOpts]
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
            setBookFlipping(flipping);
            setFlippingUi(flipping);

            if (!flipping) {
                const api = bookRef.current?.pageFlip?.();
                if (api?.getFlipController?.()) {
                    const storageIdx = flipbookIndexToStoragePage(
                        api.getCurrentPageIndex(),
                        totalPages,
                        spreadOpts
                    );
                    closeAlbumPinPopovers();
                    setPageIndex(storageIdx);
                    onPageChange?.(storageIdx);
                    if (
                        coverRevealFrom3D &&
                        !coverRevealFrom3DDoneRef.current &&
                        pageToSpreadIndex(storageIdx, spreadCtx) >= 1
                    ) {
                        coverRevealFrom3DDoneRef.current = true;
                        onCoverRevealFrom3DComplete?.();
                    }
                    if (
                        coverHideTo3DRef.current &&
                        pageToSpreadIndex(storageIdx, spreadCtx) <= 0
                    ) {
                        coverHideTo3DRef.current = false;
                        setCoverHideTo3DActive(false);
                        onExternalCoverRequest?.();
                    }
                }
                if (coverClipTransition || endClipTransition) {
                    requestAnimationFrame(() => {
                        setCoverClipTransition(null);
                        setCoverRevealOpen(false);
                        setEndClipTransition(null);
                        setEndRevealOpen(false);
                    });
                }
            }
        },
        [coverClipTransition, coverRevealFrom3D, endClipTransition, onCoverRevealFrom3DComplete, onExternalCoverRequest, onPageChange, setFlippingUi, spreadCtx, spreadOpts, totalPages]
    );

    useEffect(() => {
        if (!bookFlipping) return undefined;
        const timer = window.setTimeout(() => {
            if (!isFlippingRef.current) return;
            isFlippingRef.current = false;
            setBookFlipping(false);
            setFlippingUi(false);
        }, FLIP_TIME_MS + 150);
        return () => window.clearTimeout(timer);
    }, [bookFlipping, setFlippingUi]);

    const flipPrev = useCallback(() => {
        closeAlbumPinPopovers();
        if (previewMode) spreadMagnify.reset();
        const api = bookRef.current?.pageFlip?.();
        if (!api?.getFlipController?.()) return;

        if (
            external3DCover &&
            album?.has_covers &&
            spreadIndex === 1
        ) {
            const current = flipbookIndexToStoragePage(
                api.getCurrentPageIndex(),
                totalPages,
                spreadOpts
            );
            if (current >= 2) {
                beginCoverHideTo3DFlip(api);
                return;
            }
            onExternalCoverRequest?.();
            return;
        }

        if (
            album?.has_covers &&
            spreadIndex === 1 &&
            flipbookIndexToStoragePage(api.getCurrentPageIndex(), totalPages, spreadOpts) === 2
        ) {
            setCoverClipTransition('hide');
            setCoverRevealOpen(false);
            requestAnimationFrame(() => {
                if (typeof api.flipPrev === 'function') api.flipPrev(FLIP_CORNER);
                else if (typeof api.turnToPrevPage === 'function') api.turnToPrevPage();
            });
            return;
        }

        if (album?.has_covers && endCoverOnly) {
            const { left: endLeft } = getEndSpreadPageIndices(totalPages);
            const current = flipbookIndexToStoragePage(
                api.getCurrentPageIndex(),
                totalPages,
                spreadOpts
            );
            if (current > endLeft) {
                syncingPageRef.current = true;
                api.turnToPage(storagePageToFlipbookIndex(endLeft, totalPages, spreadOpts));
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        syncingPageRef.current = false;
                        beginEndRevealFlip(api);
                    });
                });
                return;
            }
            beginEndRevealFlip(api);
            return;
        }

        if (typeof api.flipPrev === 'function') api.flipPrev(FLIP_CORNER);
        else if (typeof api.turnToPrevPage === 'function') api.turnToPrevPage();
    }, [album?.has_covers, beginCoverHideTo3DFlip, beginEndRevealFlip, endCoverOnly, external3DCover, onExternalCoverRequest, onPageChange, previewMode, spreadIndex, spreadMagnify.reset, spreadOpts, totalPages]);

    const flipNext = useCallback(() => {
        closeAlbumPinPopovers();
        if (previewMode) spreadMagnify.reset();
        const api = bookRef.current?.pageFlip?.();
        if (!api?.getFlipController?.()) return;

        if (album?.has_covers && spreadIndex === 0 && !external3DCover) {
            const current = api.getCurrentPageIndex();
            if (current < 1) {
                syncingPageRef.current = true;
                api.turnToPage(1);
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        syncingPageRef.current = false;
                        beginCoverRevealFlip(api);
                    });
                });
                return;
            }
            beginCoverRevealFlip(api);
            return;
        }

        if (album?.has_covers && spreadIndex === totalSpreads - 2) {
            const { left: endLeft } = getEndSpreadPageIndices(totalPages);
            const current = flipbookIndexToStoragePage(
                api.getCurrentPageIndex(),
                totalPages,
                spreadOpts
            );
            if (current === endLeft - 1) {
                setEndClipTransition('hide');
                requestAnimationFrame(() => {
                    if (typeof api.flipNext === 'function') api.flipNext(FLIP_CORNER);
                    else if (typeof api.turnToNextPage === 'function') api.turnToNextPage();
                });
                return;
            }
        }

        if (typeof api.flipNext === 'function') api.flipNext(FLIP_CORNER);
        else if (typeof api.turnToNextPage === 'function') api.turnToNextPage();
    }, [album?.has_covers, beginCoverRevealFlip, external3DCover, onPageChange, previewMode, spreadIndex, spreadMagnify.reset, spreadOpts, totalPages, totalSpreads]);

    useEffect(() => {
        if (!initialized || bookFlipping || coverClipTransition) return;
        if (!album?.has_covers || spreadIndex !== 0 || external3DCover) return;
        if (userNavigatedRef.current || isFlippingRef.current) return;
        const api = bookRef.current?.pageFlip?.();
        if (!api?.getFlipController?.()) return;
        const current = api.getCurrentPageIndex();
        if (current === 0) return;
        if (current !== 1) return;
        syncingPageRef.current = true;
        api.turnToPage(0);
        setPageIndex(0);
        onPageChange?.(0);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                syncingPageRef.current = false;
            });
        });
    }, [
        album?.has_covers,
        bookFlipping,
        coverClipTransition,
        external3DCover,
        initialized,
        onPageChange,
        spreadIndex,
    ]);

    useEffect(() => {
        if (bookFlipping || spreadIndex !== preBackSpreadIndex) return;
        if (!endClipTransition) return;
        setEndClipTransition(null);
        setEndRevealOpen(false);
    }, [bookFlipping, spreadIndex, preBackSpreadIndex, endClipTransition]);

    useEffect(() => {
        if (focusOpen) return undefined;
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
    }, [flipPrev, flipNext, focusOpen]);

    useEffect(() => {
        if (!overviewOpen) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') setOverviewOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [overviewOpen]);

    useEffect(() => {
        if (!overviewOpen) return undefined;
        const prevHtmlOverflow = document.documentElement.style.overflow;
        const prevBodyOverflow = document.body.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        return () => {
            document.documentElement.style.overflow = prevHtmlOverflow;
            document.body.style.overflow = prevBodyOverflow;
        };
    }, [overviewOpen]);

    useEffect(() => {
        const maxPage = normalizeStoragePageIndex(totalPages - 1, totalPages, spreadOpts);
        const normalized = normalizeStoragePageIndex(pageIndex, totalPages, spreadOpts);
        if (normalized === pageIndex) return;
        goToPage(normalized);
    }, [totalPages, pageIndex, spreadOpts, goToPage]);

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
        if (proofSpotPicker) {
            setPinModeActive(false);
            setPinComposer(null);
            return;
        }
        if (pinMarkMode) {
            setPinModeActive(true);
            setSwapPinFlow(null);
            return;
        }
        setPinModeActive(false);
        setPinComposer(null);
    }, [previewMode, pinMarkMode, proofSpotPicker]);

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
            if (previewMode) {
                setSwapPickerOrigin(slot);
            }
        },
        [album?.id, previewMode]
    );

    const handleSwapPick = useCallback(
        (secondSlot) => {
            if (!album?.id || !secondSlot) return;
            const originSlot = swapPickerOrigin || swapPinFlow?.originSlot;
            if (!originSlot) return;

            if (previewMode && swapPinFlow?.originPoint) {
                setSwapPinFlow((prev) =>
                    prev
                        ? {
                              ...prev,
                              targetSlot: secondSlot,
                          }
                        : prev
                );
                setSwapPickerOrigin(null);
                return;
            }

            const hasThumbPoint =
                Number.isFinite(secondSlot.xPct) && Number.isFinite(secondSlot.yPct);

            const pointA = swapPinFlow?.originPoint || {
                xPct: 50,
                yPct: 50,
                pageNum: originSlot.pageNum,
                cellId: originSlot.cellId ?? 0,
            };
            const pointB = {
                xPct: hasThumbPoint ? secondSlot.xPct : 50,
                yPct: hasThumbPoint ? secondSlot.yPct : 50,
                pageNum: secondSlot.pageNum,
                cellId: secondSlot.cellId ?? 0,
            };
            const hadFeedback = albumHadClientFeedbackBefore(album.id);
            addSwapMark(album.id, originSlot, secondSlot, { pointA, pointB });
            if (previewMode) {
                notifyAfterClientFeedbackAdded(album.id, { hadFeedbackBefore: hadFeedback });
            }
            setSwapPickerOrigin(null);
            setSwapPinFlow(null);
            if (secondSlot.spreadIndex != null) {
                goToPage(
                    spreadIndexToPage(secondSlot.spreadIndex, { ...spreadOpts, totalPages })
                );
            } else if (hasThumbPoint) {
                goToPage(secondSlot.pageNum ?? originSlot.pageNum);
            }
        },
        [album?.id, swapPickerOrigin, swapPinFlow, previewMode, goToPage, spreadOpts, totalPages]
    );

    const handleSwapSpreadNavigate = useCallback(
        (spreadIndex) => {
            goToPage(spreadIndexToPage(spreadIndex, { ...spreadOpts, totalPages }));
        },
        [goToPage, spreadOpts, totalPages]
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
                if (!swapMarkMode && !proofSpotPicker) return;
                setSwapPinFlow({
                    originSlot: placement,
                    originPoint: placementPoint,
                });
                if (previewMode) {
                    setSwapPickerOrigin(placement);
                }
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
                const hadFeedback = albumHadClientFeedbackBefore(album.id);
                const mark = addSwapMark(album.id, originSlot, placement, {
                    pointA: {
                        xPct: 50,
                        yPct: 50,
                        pageNum: originSlot.pageNum,
                        cellId: originSlot.cellId ?? 0,
                    },
                    pointB: placementPoint,
                });
                if (mark) {
                    if (previewMode) {
                        notifyAfterClientFeedbackAdded(album.id, {
                            hadFeedbackBefore: hadFeedback,
                        });
                    }
                    setSwapPinFlow(null);
                }
                return;
            }

            if (slotsMatch(originSlot, placement)) {
                const hadFeedback = albumHadClientFeedbackBefore(album.id);
                const mark = addSwapMark(album.id, originSlot, placement, {
                    pointA: swapPinFlow.originPoint,
                    pointB: placementPoint,
                });
                if (mark) {
                    if (previewMode) {
                        notifyAfterClientFeedbackAdded(album.id, {
                            hadFeedbackBefore: hadFeedback,
                        });
                    }
                    setSwapPinFlow(null);
                }
                return;
            }

            const hadFeedback = albumHadClientFeedbackBefore(album.id);
            const mark = addSwapMark(album.id, originSlot, placement, {
                pointA: swapPinFlow.originPoint,
                pointB: placementPoint,
            });
            if (mark) {
                if (previewMode) {
                    notifyAfterClientFeedbackAdded(album.id, { hadFeedbackBefore: hadFeedback });
                }
                setSwapPinFlow(null);
            }
        },
        [album?.id, swapPinFlow, swapMarkMode, proofSpotPicker, previewMode]
    );

    const getSwapMarkInfo = useCallback(
        (pageNum, cellId, spreadLeft) =>
            getSwapMarkForSlot(swapMarks, pageNum, cellId, {
                placementMode,
                spreadLeft,
                gridLayout: album?.grid_layout || 'two-page',
                album,
                totalPages,
            }),
        [swapMarks, placementMode, album, totalPages]
    );

    const getSwapMarkInfos = useCallback(
        (pageNum, cellId, spreadLeft) =>
            getSwapMarksForSlot(swapMarks, pageNum, cellId, {
                placementMode,
                spreadLeft,
                gridLayout: album?.grid_layout || 'two-page',
                album,
                totalPages,
            }),
        [swapMarks, placementMode, album, totalPages]
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
            const hadFeedback = albumHadClientFeedbackBefore(album.id);
            addPhotoPin(album.id, { ...pinComposer, message });
            if (previewMode) {
                notifyAfterClientFeedbackAdded(album.id, { hadFeedbackBefore: hadFeedback });
            }
            setPinComposer(null);
        },
        [album?.id, pinComposer, previewMode]
    );

    const handlePinSaveDirect = useCallback(
        (placement) => {
            if (!album?.id || !placement?.message?.trim()) return;
            const hadFeedback = albumHadClientFeedbackBefore(album.id);
            addPhotoPin(album.id, placement);
            if (previewMode) {
                notifyAfterClientFeedbackAdded(album.id, { hadFeedbackBefore: hadFeedback });
            }
        },
        [album?.id, previewMode]
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
        goToPage(focusPageRef.current);
    }, [goToPage]);

    const openFocusView = useCallback(() => {
        closeAlbumPinPopovers();
        setOverviewOpen(false);
        focusPageRef.current = pageIndex;
        setFocusStartPage(pageIndex);
        setFocusOpen(true);
    }, [pageIndex]);

    const handleFocusPageChange = useCallback((idx) => {
        focusPageRef.current = idx;
    }, []);

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
            getSwapMarkInfos,
            onSwapRequest: handleSwapRequest,
            swapPinModeActive: previewMode
                ? swapMarkMode || Boolean(swapPinFlow)
                : Boolean(swapPinFlow),
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
            pinModeActive: isPinModeOn,
            getPinsForSlot: getSlotPins,
            onPinPlace: handlePinPlace,
            onPinSave: handlePinSaveDirect,
            onPinRemove: handlePinRemove,
            onActivatePinMode: handleActivatePinMode,
            proofToolsHover,
            spotActionPicker: proofSpotPicker,
            spotCanComment,
            spotCanSwap,
            activeBookPage: pageIndex,
            spreadMagnifyActive: previewMode && spreadMagnify.active,
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
            isPinModeOn,
            proofToolsHover,
            handleSwapRequest,
            swapPinFlow,
            handleSwapPinPlace,
            previewMode,
            getSwapMarkInfo,
            getSwapMarkInfos,
            getSlotPins,
            handlePinPlace,
            handlePinSaveDirect,
            handlePinRemove,
            handleActivatePinMode,
            proofSpotPicker,
            spotCanComment,
            spotCanSwap,
            pageIndex,
            previewMode,
            spreadMagnify.active,
        ]
    );

    const [placementHintPos, setPlacementHintPos] = useState(null);

    const bookPlacementHint = useMemo(() => {
        if (isPinModeOn && pinMarkMode) {
            return { text: 'Click to place comment', swap: false };
        }
        const swapActive = previewMode
            ? swapMarkMode || Boolean(swapPinFlow)
            : Boolean(swapPinFlow);
        if (!swapActive) return null;
        if (swapPinFlow?.originPoint) {
            return { text: 'Click target spot to complete swap', swap: true };
        }
        return { text: 'Click source spot to start swap', swap: true };
    }, [isPinModeOn, pinMarkMode, previewMode, swapMarkMode, swapPinFlow]);

    useLayoutEffect(() => {
        if (!bookPlacementHint) {
            setPlacementHintPos(null);
            return undefined;
        }

        const updatePosition = () => {
            const el = wrapRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            if (!rect.width) return;
            setPlacementHintPos({
                left: rect.left + rect.width / 2,
                top: rect.bottom + 12,
            });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [bookPlacementHint, pageIndex, bookDims]);

    const pages = useMemo(
        () =>
            getFlipbookStoragePages(totalPages, spreadOpts).map((pageNum) => (
                <AlbumFlipPage
                    key={`page-${pageNum}-r${photoRevision}`}
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
            spreadOpts,
            editable,
            spreadEdit,
            placementMode,
            showSamples,
            previewMode,
            photoRevision,
        ]
    );

    return (
        <div
            className={`ab-root${previewMode ? ' ab-root--preview' : ''}${
                previewMode && spreadMagnify.active ? ' ab-root--spread-magnify' : ''
            }${isPinModeOn && pinMarkMode ? ' ab-root--pin-mode' : ''}${
                previewMode && swapMarkMode ? ' ab-root--swap-mode' : ''
            }`}
            ref={rootRef}
        >
            {bookPlacementHint && placementHintPos &&
                createPortal(
                    <div
                        className={`ab-pin-placement-floating${
                            bookPlacementHint.swap ? ' ab-pin-placement-floating--swap' : ''
                        }`}
                        style={{
                            left: `${placementHintPos.left}px`,
                            top: `${placementHintPos.top}px`,
                        }}
                        aria-live="polite"
                    >
                        <span className="ab-pin-placement-hint">{bookPlacementHint.text}</span>
                    </div>,
                    document.body
                )}
            <button
                type="button"
                ref={prevNavRef}
                className={`ab-nav ab-nav--prev${
                    !prevNavDisabled ? ' ab-nav--enabled' : ''
                }`}
                onClick={flipPrev}
                disabled={prevNavDisabled}
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
                    className={`ab-spread-display${
                        showCoverClip ? ' ab-spread-display--front-cover-clip' : ''
                    }${showEndClip ? ' ab-spread-display--end-cover-clip' : ''}`}
                    style={
                        bookDims
                            ? {
                                  width: bookDims.width * 2,
                              }
                            : undefined
                    }
                >
                <div
                    className={`ab-spread-book-block${
                        showCoverClip ? ' ab-spread-book-block--front-cover-clip' : ''
                    }${showEndClip ? ' ab-spread-book-block--end-cover-clip' : ''}`}
                    style={
                        bookDims
                            ? {
                                  width: bookDims.width * 2,
                              }
                            : undefined
                    }
                >
                <div
                    className={spreadMagnify.viewportClassName}
                    style={
                        bookDims
                            ? {
                                  width: bookDims.width * 2,
                                  height: bookDims.height,
                              }
                            : undefined
                    }
                >
                <div
                    className={spreadMagnify.contentClassName}
                    style={spreadMagnify.contentStyle}
                    onPointerDown={
                        previewMode && spreadMagnify.active
                            ? spreadMagnify.handlePointerDown
                            : undefined
                    }
                >
                <div
                    className={`ab-flipbook-wrap${coverWrapClassName}`}
                    ref={wrapRef}
                    style={
                        bookDims
                            ? {
                                  width: bookDims.width * 2,
                                  height: bookDims.height,
                              }
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
                        maxShadowOpacity={0.42}
                        flippingTime={FLIP_TIME_MS}
                        usePortrait={false}
                        useMouseEvents={clickToFlip}
                        mobileScrollSupport={false}
                        showCover={false}
                        showPageCorners={clickToFlip}
                        disableFlipByClick
                        startPage={storagePageToFlipbookIndex(initialPage, totalPages, spreadOpts)}
                        clickEventForward={false}
                        onFlip={handleFlip}
                        onChangeState={handleChangeState}
                        onInit={() => {
                            syncingPageRef.current = true;
                            setInitialized(true);
                            const api = bookRef.current?.pageFlip?.();
                            installSafePageFlip(api, { totalPages, spreadOpts });
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
                </div>
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
                        onClick={openOverview}
                    >
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                            {Array.from({ length: 9 }, (_, i) => {
                                const x = 5 + (i % 3) * 7;
                                const y = 5 + Math.floor(i / 3) * 7;
                                return <rect key={i} x={x} y={y} width="4" height="4" stroke="currentColor" strokeWidth="1.5" />;
                            })}
                        </svg>
                    </button>
                    {previewMode ? (
                        <>
                            <button
                                type="button"
                                className="ab-control-icon ab-control-icon--button"
                                aria-label="Zoom out"
                                disabled={!spreadMagnify.canZoomOut}
                                onClick={spreadMagnify.zoomOut}
                            >
                                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
                                    <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
                                    <path d="M16 16l5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                    <path d="M8 11h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                className="ab-control-icon ab-control-icon--button"
                                aria-label="Zoom in"
                                disabled={!spreadMagnify.canZoomIn}
                                onClick={spreadMagnify.zoomIn}
                            >
                                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
                                    <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
                                    <path d="M16 16l5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                    <path d="M8 11h6M11 8v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                </svg>
                            </button>
                        </>
                    ) : null}
                    <span className="ab-page-counter" title={`Pages ${pageRangeLabel}`}>
                        {counterLabel}
                    </span>
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
                className={`ab-nav ab-nav--next${
                    !nextNavDisabled ? ' ab-nav--enabled' : ''
                }`}
                onClick={flipNext}
                disabled={nextNavDisabled}
                aria-label="Next page"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            </button>

            {overviewOpen &&
                createPortal(
                <div
                    className={`ab-overview${
                        previewMode ? ' ab-overview--gallery-proof' : ''
                    }${pageCountBusy ? ' ab-overview--page-busy' : ''}`}
                    style={overviewThumbStyle}
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
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                        >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                    <div className="ab-overview-body" onClick={(e) => e.stopPropagation()}>
                    {canDragOverviewSpreads ? (
                        <p className="ab-overview-drag-hint">
                            Drag middle spreads to reorder photos. Cover, first inner spread, spread before back, and back stay fixed.
                        </p>
                    ) : null}
                    <div
                        className={`ab-overview-grid${
                            pageCountBusy ? ' ab-overview-grid--transitioning' : ''
                        }${
                            overviewDraggingIndex != null ? ' ab-overview-grid--dragging' : ''
                        }`}
                    >
                        {Array.from({ length: totalSpreads }, (_, overviewSpreadIndex) => {
                            const { left, right } = getSpreadPages(
                                overviewSpreadIndex,
                                totalPages,
                                spreadOpts
                            );
                            const targetPage = spreadIndexToPage(overviewSpreadIndex, spreadCtx);
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
                            const isCover =
                                spreadOpts.hasCovers && overviewSpreadIndex === 0;
                            const isEndSpread = isEndHalfSpreadIndex(
                                overviewSpreadIndex,
                                totalPages,
                                spreadOpts
                            );
                            const spreadSrc = !isCover && !isEndSpread
                                ? getSpreadPhotoOverride(album?.id, left)
                                : null;
                            const bookWrapSrc =
                                isCover || isEndSpread
                                    ? getSpreadPhotoOverride(album?.id, 0) ||
                                      resolveCoverImageSrc(album, { showSamples })
                                    : null;
                            const isEndHalf = isEndSpread;
                            const showSpreadFull = Boolean(spreadSrc);
                            const isSelected = overviewSpreadIndex === overviewTargetSpreadIndex;
                            const spreadDraggable =
                                canDragOverviewSpreads &&
                                isDraggableOverviewSpread(
                                    overviewSpreadIndex,
                                    totalPages,
                                    spreadOpts
                                );
                            const spreadDragOver =
                                spreadDraggable &&
                                overviewDragOverIndex === overviewSpreadIndex &&
                                overviewDraggingIndex !== overviewSpreadIndex;
                            const spreadDragging =
                                overviewDraggingIndex === overviewSpreadIndex;
                            return (
                                <button
                                    key={`spread-${overviewSpreadIndex}`}
                                    type="button"
                                    className={`ab-overview-item${
                                        isCover ? ' ab-overview-item--cover' : ''
                                    }${isEndSpread ? ' ab-overview-item--back' : ''}${
                                        isSelected ? ' ab-overview-item--active' : ''
                                    }${
                                        spreadDraggable ? ' ab-overview-item--draggable' : ''}${
                                        spreadDragging ? ' ab-overview-item--dragging' : ''
                                    }${
                                        spreadDragOver ? ' ab-overview-item--drag-over' : ''
                                    }`}
                                    draggable={spreadDraggable}
                                    onClick={() => {
                                        if (overviewDidDragRef.current) {
                                            overviewDidDragRef.current = false;
                                            return;
                                        }
                                        setOverviewTargetSpreadIndex(overviewSpreadIndex);
                                        goToPage(targetPage);
                                    }}
                                    onDragStart={(e) => {
                                        if (!spreadDraggable) return;
                                        e.stopPropagation();
                                        e.dataTransfer.effectAllowed = 'move';
                                        e.dataTransfer.setData(
                                            'text/plain',
                                            String(overviewSpreadIndex)
                                        );
                                        const thumb = e.currentTarget.querySelector('.ab-overview-thumb');
                                        if (thumb) {
                                            clearOverviewSpreadDragGhost();
                                            const { ghost, offsetX, offsetY } =
                                                createOverviewSpreadDragGhost(
                                                    thumb,
                                                    e.clientX,
                                                    e.clientY
                                                );
                                            overviewDragGhostRef.current = ghost;
                                            e.dataTransfer.setDragImage(ghost, offsetX, offsetY);
                                        }
                                        setOverviewDraggingIndex(overviewSpreadIndex);
                                        handleOverviewSpreadDragStart(overviewSpreadIndex);
                                    }}
                                    onDragOver={(e) => {
                                        if (!spreadDraggable) return;
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = 'move';
                                        e.stopPropagation();
                                        handleOverviewSpreadDragOver(overviewSpreadIndex);
                                    }}
                                    onDrop={(e) => {
                                        if (!spreadDraggable) return;
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleOverviewSpreadDrop(overviewSpreadIndex);
                                    }}
                                    onDragEnd={handleOverviewSpreadDragEnd}
                                >
                                    <span className="ab-overview-thumb ab-overview-thumb--spread">
                                        {spreadDraggable ? (
                                            <span className="ab-overview-drag-grip" aria-hidden>
                                                <svg
                                                    width="14"
                                                    height="14"
                                                    viewBox="0 0 24 24"
                                                    fill="currentColor"
                                                >
                                                    <circle cx="9" cy="7" r="1.5" />
                                                    <circle cx="15" cy="7" r="1.5" />
                                                    <circle cx="9" cy="12" r="1.5" />
                                                    <circle cx="15" cy="12" r="1.5" />
                                                    <circle cx="9" cy="17" r="1.5" />
                                                    <circle cx="15" cy="17" r="1.5" />
                                                </svg>
                                            </span>
                                        ) : null}
                                        {showSpreadFull ? (
                                            <span className="ab-overview-page ab-overview-page--spread-full">
                                                <img src={spreadSrc} alt="" loading="lazy" draggable={false} />
                                            </span>
                                        ) : isCover && bookWrapSrc ? (
                                            <span className="ab-overview-page ab-overview-page--cover-single">
                                                <OverviewBookWrapSegment
                                                    src={bookWrapSrc}
                                                    side="front"
                                                    layout={bookWrapSpineLayout}
                                                    transform={coverTransform}
                                                />
                                            </span>
                                        ) : isCover ? (
                                            <span className="ab-overview-page ab-overview-page--cover-single">
                                                {albumHasBlankCovers(album) ? (
                                                    <OverviewLeatherCover album={album} showTitle />
                                                ) : (
                                                    <OverviewCoverPhoto src={rightSrc || leftSrc} />
                                                )}
                                            </span>
                                        ) : isEndHalf && bookWrapSrc ? (
                                            <span className="ab-overview-page ab-overview-page--end-single">
                                                <OverviewBookWrapSegment
                                                    src={bookWrapSrc}
                                                    side="back"
                                                    layout={bookWrapSpineLayout}
                                                    transform={coverTransform}
                                                />
                                            </span>
                                        ) : isEndHalf ? (
                                            <span className="ab-overview-page ab-overview-page--end-single">
                                                {albumHasBlankCovers(album) ? (
                                                    <OverviewLeatherCover album={album} />
                                                ) : (
                                                    <OverviewCoverPhoto src={leftSrc} />
                                                )}
                                            </span>
                                        ) : (
                                            <>
                                                <span className="ab-overview-page">
                                                    {leftSrc ? (
                                                        <img src={leftSrc} alt="" loading="lazy" draggable={false} />
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
                                                                draggable={false}
                                                            />
                                                        ) : (
                                                            <span className="ab-overview-placeholder" />
                                                        )}
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </span>
                                    <span className="ab-overview-label">
                                        {formatOverviewSpreadLabel(
                                            overviewSpreadIndex,
                                            totalPages,
                                            spreadOpts
                                        )}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    {(canAddPages || canRemoveOverviewSpread) && (
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
                                        {pageCountBusy ? 'Adding...' : 'Add spread'}
                                    </span>
                                </button>
                            )}
                            {canDeleteOverviewSpread && onDeleteSpread && (
                                <button
                                    type="button"
                                    className="ab-overview-item ab-overview-item--remove"
                                    disabled={pageCountBusy}
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        await onDeleteSpread(spreadLeftPage);
                                        setOverviewOpen(false);
                                    }}
                                >
                                    <span className="ab-overview-thumb ab-overview-thumb--remove">
                                        <span className="ab-overview-add-plus ab-overview-remove-minus">
                                            −
                                        </span>
                                    </span>
                                    <span className="ab-overview-label">
                                        {pageCountBusy ? 'Removing...' : 'Remove spread'}
                                    </span>
                                </button>
                            )}
                        </div>
                    )}
                    </div>
                </div>,
                document.body
            )}

            {focusOpen && (
                <AlbumFocusView
                    album={album}
                    totalPages={totalPages}
                    startPage={focusStartPage}
                    placementMode={placementMode}
                    showSamples={showSamples}
                    transformRevision={transformRevision}
                    photoRevision={photoRevision}
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
                bookAnchorRef={wrapRef}
                currentSpreadIndex={spreadIndex}
                navigateOnlyOnPick={Boolean(swapPinFlow?.originPoint)}
                onNavigateToSpread={handleSwapSpreadNavigate}
                onSelect={handleSwapPick}
                onClose={() => {
                    setSwapPickerOrigin(null);
                    setSwapPinFlow(null);
                }}
            />

            <AlbumPinComposer
                open={Boolean(pinComposer) && !proofSpotPicker}
                slotLabel={pinComposer?.label}
                onSave={handlePinSave}
                onClose={() => setPinComposer(null)}
            />
        </div>
    );
};

export default AlbumBook;
