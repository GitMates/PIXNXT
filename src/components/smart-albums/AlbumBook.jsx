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
    getInnerSpreadCount,
    isDraggableOverviewSpread,
    isEndHalfSpreadIndex,
    isInsideCoverSpreadLeft,
    isPreBackHalfSpreadIndex,
    isWholeSpreadLayout,
    formatOverviewSpreadLabel,
    formatBookSpreadMetaLabel,
    formatSpreadCounterNumber,
    normalizeStoragePageIndex,
    pageToSpreadIndex,
    spreadIndexToPage,
    storagePageToFlipbookIndex,
} from './albumSpreadUtils';
import { getSampleImageForPage } from './sampleAlbumImages';
import SpreadGridComments from './SpreadGridComments';
import {
    COMMENTS_SEEN_CHANGED_EVENT,
    getClientReviewerIdentity,
    isCommentUnseen,
} from '../../services/smartAlbumComments.service';
import { buildOverviewSpreadReorderPlan } from './albumSpreadReorder';
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
    getSlotLabel,
    SWAP_MARKS_CHANGED_EVENT,
    SWAP_MARKS_SEEN_CHANGED_EVENT,
    hydrateSwapMarks,
    isSwapMarkUnseen,
    parseSlotKey,
    removeSwapMark,
} from './albumSwapMarks';
import {
    addPhotoPin,
    getPhotoPins,
    getPinsForSlot,
    PHOTO_PINS_CHANGED_EVENT,
    PHOTO_PINS_SEEN_CHANGED_EVENT,
    removePhotoPin,
    hydratePhotoPins,
    isPhotoPinUnseen,
} from './albumPhotoPins';
import {
    albumHadClientFeedbackBefore,
    notifyClientFeedbackEvent,
} from './albumClientFeedbackNotify';
import { canClientLeaveFeedback } from './albumProoferPreview';
import './AlbumBook.css';
import './AlbumSwapMarks.css';
import './AlbumPhotoPins.css';
import { parseGridSizeAspect } from './albumGridSize';
import { getBookDimensions, getFallbackBookDimensions } from './albumBookDimensions';
import { AlbumBookPageContext } from './AlbumBookPageContext';
import { installSafePageFlip } from './pageFlipSafe';
import { albumHasBlankCovers } from './albumSpreadUtils';
import { getBookWrapSpineLayout } from './bookWrapSpine';
import { SPINE_BOUNDS_CHANGED_EVENT } from './albumSpineSettings';
import { getSpreadPhotoTransform } from './albumPageTransforms';
import BookWrapSpineImage from './BookWrapSpineImage';
import OverviewLeatherCover from './OverviewLeatherCover';
import OverviewSortableGrid from './OverviewSortableGrid';
import AlbumFocusView from './AlbumFocusView';
import {
    getImageReplacements,
    getReplacementCurrentVersion,
    IMAGE_REPLACEMENTS_CHANGED_EVENT,
} from './albumImageReplacements';

const FLIP_TIME_MS = 900;
const FLIP_CORNER = 'bottom';

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

function resolveOverviewSpreadVisual(album, overviewSpreadIndex, totalPages, spreadOpts, showSamples) {
    const { left, right } = getSpreadPages(overviewSpreadIndex, totalPages, spreadOpts);
    const isCover = spreadOpts.hasCovers && overviewSpreadIndex === 0;
    const isEndSpread = isEndHalfSpreadIndex(overviewSpreadIndex, totalPages, spreadOpts);
    const isInsideCover = isInsideCoverSpreadLeft(left, totalPages, spreadOpts);
    const isPreBack = isPreBackHalfSpreadIndex(overviewSpreadIndex, totalPages, spreadOpts);
    const spreadSrc =
        !isCover && !isEndSpread && !isInsideCover && !isPreBack
            ? getSpreadPhotoOverride(album?.id, left)
            : null;
    const bookWrapSrc =
        isCover || isEndSpread
            ? getSpreadPhotoOverride(album?.id, 0) || resolveCoverImageSrc(album, { showSamples })
            : null;
    // Structural first/last blanks stay empty — never samples or stray slot photos.
    const leftSrc = isInsideCover
        ? null
        : getOverviewPageImage(album, left, totalPages, showSamples);
    const rightSrc =
        right === left || isPreBack
            ? null
            : getOverviewPageImage(album, right, totalPages, showSamples);

    return {
        isCover,
        isEndSpread,
        isEndHalf: isEndSpread,
        isInsideCover,
        isPreBack,
        spreadSrc,
        bookWrapSrc,
        leftSrc,
        rightSrc,
        showSpreadFull: Boolean(spreadSrc),
    };
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
    /** Bump only when spread photo bytes change — remounts HTMLFlipBook (stale page-flip DOM). */
    photoContentEpoch = 0,
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
    clientPreview = false,
    prooferAccess = null,
    onProoferBlocked = null,
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
    const [proofSeenTick, setProofSeenTick] = useState(0);

    const ensureClientFeedback = useCallback(
        (action) => {
            if (!previewMode || !clientPreview || !prooferAccess || !album?.id) return true;
            const result = canClientLeaveFeedback(album.id, prooferAccess, action);
            if (!result.ok) {
                onProoferBlocked?.(result.message, result.code);
                return false;
            }
            return true;
        },
        [previewMode, clientPreview, prooferAccess, album?.id, onProoferBlocked]
    );
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
        // Prefer spine-aware wrap whenever covers are on — matches AlbumFlipPage / filmstrip.
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
            '--ab-overview-thumb-aspect': String(spreadAspect),
            '--ab-overview-page-aspect': String(pageAspect),
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
    const [overviewOptimisticContent, setOverviewOptimisticContent] = useState(null);
    const overviewDidDragRef = useRef(false);
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
                ? `${flipBookStructuralKey}-${stableDims.width}x${stableDims.height}-c${photoContentEpoch}`
                : `${flipBookStructuralKey}-c${photoContentEpoch}`,
        [flipBookStructuralKey, stableDims, photoContentEpoch]
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
            if (e.detail?.albumId && e.detail.albumId !== album.id) return;
            setProofSeenTick((tick) => tick + 1);
        };
        window.addEventListener(COMMENTS_SEEN_CHANGED_EVENT, onSeen);
        window.addEventListener(PHOTO_PINS_SEEN_CHANGED_EVENT, onSeen);
        window.addEventListener(SWAP_MARKS_SEEN_CHANGED_EVENT, onSeen);
        return () => {
            window.removeEventListener(COMMENTS_SEEN_CHANGED_EVENT, onSeen);
            window.removeEventListener(PHOTO_PINS_SEEN_CHANGED_EVENT, onSeen);
            window.removeEventListener(SWAP_MARKS_SEEN_CHANGED_EVENT, onSeen);
        };
    }, [album?.id]);
    const { left: leftNum, right: rightNum } = getSpreadPages(spreadIndex, totalPages, spreadOpts);

    const innerSpreadCount = useMemo(
        () => getInnerSpreadCount(totalPages, spreadOpts),
        [totalPages, spreadOpts]
    );
    const counterLabel = useMemo(() => {
        const spreadWord = innerSpreadCount === 1 ? 'spread' : 'spreads';
        if (spreadOpts.hasCovers && spreadIndex <= 0) {
            return `Cover · ${innerSpreadCount} ${spreadWord}`;
        }
        if (isEndHalfSpreadIndex(spreadIndex, totalPages, spreadOpts)) {
            return `Back · ${innerSpreadCount} ${spreadWord}`;
        }
        const n = formatSpreadCounterNumber(spreadIndex, totalPages, spreadOpts);
        const digitCount = Math.max(2, String(innerSpreadCount).length);
        const totalLabel = String(innerSpreadCount).padStart(digitCount, '0');
        return `${n} / ${totalLabel}`;
    }, [spreadIndex, totalPages, spreadOpts, innerSpreadCount]);
    const toolbarCounterWide =
        /\d{3}/.test(counterLabel) || counterLabel.length > 7;

    const spreadMetaLabel = useMemo(
        () => formatBookSpreadMetaLabel(spreadIndex, totalPages, spreadOpts),
        [spreadIndex, totalPages, spreadOpts]
    );

    const [imageReplacements, setImageReplacements] = useState(() =>
        album?.id ? getImageReplacements(album.id) : []
    );

    useEffect(() => {
        if (!album?.id) {
            setImageReplacements([]);
            return undefined;
        }
        const load = () => setImageReplacements(getImageReplacements(album.id));
        load();
        const onChanged = (e) => {
            if (e.detail?.albumId && e.detail.albumId !== album.id) return;
            load();
        };
        window.addEventListener(IMAGE_REPLACEMENTS_CHANGED_EVENT, onChanged);
        return () => window.removeEventListener(IMAGE_REPLACEMENTS_CHANGED_EVENT, onChanged);
    }, [album?.id]);

    const currentSpreadVersion = useMemo(() => {
        let max = 0;
        for (const row of imageReplacements) {
            if (Number(row.spreadIndex) !== Number(spreadIndex)) continue;
            const ver = getReplacementCurrentVersion(row);
            if (ver > max) max = ver;
        }
        return max > 1 ? max : 0;
    }, [imageReplacements, spreadIndex]);

    const needActionCount = useMemo(() => {
        let count = 0;
        if (spreadCommentsBySpread && album?.id) {
            count += Object.values(spreadCommentsBySpread).reduce((sum, rows) => {
                if (!Array.isArray(rows)) return sum;
                return (
                    sum +
                    rows.filter(
                        (c) =>
                            c &&
                            c.author_type === 'client' &&
                            isCommentUnseen(album.id, c)
                    ).length
                );
            }, 0);
        }
        if (photoPins && album?.id) {
            count += photoPins.filter((pin) => isPhotoPinUnseen(album.id, pin)).length;
        }
        if (swapMarks && album?.id) {
            count += swapMarks.filter((mark) => isSwapMarkUnseen(album.id, mark)).length;
        }
        return count;
    }, [spreadCommentsBySpread, photoPins, swapMarks, album?.id, proofSeenTick]);

    const needActionSpreadIndices = useMemo(() => {
        const indices = new Set();
        if (spreadCommentsBySpread && album?.id) {
            Object.keys(spreadCommentsBySpread).forEach((k) => {
                const idx = Number(k);
                if (!Number.isFinite(idx)) return;
                const rows = spreadCommentsBySpread[idx];
                if (
                    Array.isArray(rows) &&
                    rows.some(
                        (c) =>
                            c &&
                            c.author_type === 'client' &&
                            isCommentUnseen(album.id, c)
                    )
                ) {
                    indices.add(idx);
                }
            });
        }
        if (photoPins && album?.id) {
            photoPins.forEach((pin) => {
                if (isPhotoPinUnseen(album.id, pin)) {
                    const idx =
                        pin.spreadIndex != null
                            ? pin.spreadIndex
                            : pageToSpreadIndex(pin.pageNum, { ...spreadOpts, totalPages });
                    if (Number.isFinite(idx)) {
                        indices.add(idx);
                    }
                }
            });
        }
        if (swapMarks && album?.id) {
            swapMarks.forEach((mark) => {
                if (isSwapMarkUnseen(album.id, mark)) {
                    const idx = Number.isFinite(mark.spreadA)
                        ? mark.spreadA
                        : Number.isFinite(mark.spreadB)
                          ? mark.spreadB
                          : mark.a
                            ? pageToSpreadIndex(parseSlotKey(mark.a).pageNum, {
                                  ...spreadOpts,
                                  totalPages,
                              })
                            : 0;
                    if (Number.isFinite(idx)) {
                        indices.add(idx);
                    }
                }
            });
        }
        return Array.from(indices).sort((a, b) => a - b);
    }, [
        spreadCommentsBySpread,
        photoPins,
        swapMarks,
        album?.id,
        totalPages,
        spreadOpts,
        proofSeenTick,
    ]);

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
        const fallbackAfterAttempts = 2;

        const commitDims = (next) => {
            if (pendingDimsCommitRef.current != null) {
                cancelAnimationFrame(pendingDimsCommitRef.current);
            }
            pendingDimsCommitRef.current = requestAnimationFrame(() => {
                pendingDimsCommitRef.current = requestAnimationFrame(() => {
                    pendingDimsCommitRef.current = null;
                    const measureTarget = stageOuterRef.current ?? stageRef.current;
                    const verified =
                        getBookDimensions(
                            measureTarget,
                            album?.grid_size,
                            album?.grid_layout
                        ) ?? next;
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
                const next = getBookDimensions(stage, album?.grid_size, album?.grid_layout);
                if (!next) {
                    measureAttempts += 1;
                    // Mount cover ASAP on open/reload — don't wait ~1s for stage to hit 300px.
                    if (
                        measureAttempts === fallbackAfterAttempts ||
                        measureAttempts >= maxMeasureAttempts
                    ) {
                        const fallback = getFallbackBookDimensions(
                            rootRef.current,
                            album?.grid_size,
                            album?.grid_layout
                        );
                        if (fallback) commitDims(fallback);
                    }
                    if (measureAttempts < maxMeasureAttempts) {
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
    }, [album?.grid_size, album?.grid_layout, flipBookStructuralKey]);

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

    // Keep nav arrows vertically centered on the spread, and horizontally
    // centered in the gutters (prev: stage↔spread, next: spread↔sidebar).
    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root) return undefined;

        const NAV = previewMode ? 46 : 48;
        const MIN = previewMode ? 8 : 4;

        const syncNavGutters = () => {
            const bookEl =
                root.querySelector('.ab-spread-book-block') ||
                root.querySelector('.ab-flipbook-wrap') ||
                stageOuterRef.current;
            if (!bookEl) return;

            const rootRect = root.getBoundingClientRect();
            const raw = bookEl.getBoundingClientRect();
            if (rootRect.width < 8 || raw.width < 8 || raw.height < 8) return;

            // Always anchor arrows to the full spread box — cover/back half-clips are visual only.
            const left = raw.left;
            const right = raw.right;

            const leftGap = left - rootRect.left;
            const rightGap = rootRect.right - right;

            // Center the arrow circle in each gutter.
            let prevLeft = leftGap / 2 - NAV / 2;
            let nextRight = rightGap / 2 - NAV / 2;

            prevLeft = Math.max(MIN, prevLeft);
            nextRight = Math.max(MIN, nextRight);

            const top = raw.top - rootRect.top + raw.height / 2;
            root.style.setProperty('--ab-nav-prev-inset', `${prevLeft}px`);
            root.style.setProperty('--ab-nav-next-inset', `${nextRight}px`);
            root.style.setProperty('--ab-nav-top', `${top}px`);
        };

        syncNavGutters();
        const ro = new ResizeObserver(() => {
            syncNavGutters();
        });
        ro.observe(root);
        if (stageOuterRef.current) ro.observe(stageOuterRef.current);
        const bookBlock = root.querySelector('.ab-spread-book-block');
        if (bookBlock) ro.observe(bookBlock);
        window.addEventListener('resize', syncNavGutters);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', syncNavGutters);
            root.style.removeProperty('--ab-nav-prev-inset');
            root.style.removeProperty('--ab-nav-next-inset');
            root.style.removeProperty('--ab-nav-top');
        };
    }, [
        previewMode,
        bookDims,
        pageIndex,
        spreadIndex,
        spreadMagnify.scale,
        spreadMagnify.active,
        album?.has_covers,
    ]);

    const zoomPercentLabel = useMemo(
        () => `${Math.round(spreadMagnify.scale * 100)}%`,
        [spreadMagnify.scale]
    );

    const goToPage = useCallback(
        (pageNum) => {
            closeAlbumPinPopovers();
            spreadMagnify.reset();
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
        [totalPages, spreadOpts, onPageChange, spreadMagnify.reset]
    );

    const goToNeedAction = useCallback(
        (dir) => {
            if (!needActionSpreadIndices.length) return;
            const cur = needActionSpreadIndices.indexOf(spreadIndex);
            let next;
            if (dir > 0) {
                next =
                    cur < 0
                        ? needActionSpreadIndices[0]
                        : needActionSpreadIndices[(cur + 1) % needActionSpreadIndices.length];
            } else {
                next =
                    cur < 0
                        ? needActionSpreadIndices[needActionSpreadIndices.length - 1]
                        : needActionSpreadIndices[
                              (cur - 1 + needActionSpreadIndices.length) %
                                  needActionSpreadIndices.length
                          ];
            }
            goToPage(spreadIndexToPage(next, { ...spreadOpts, totalPages }));
        },
        [needActionSpreadIndices, spreadIndex, spreadOpts, totalPages, goToPage]
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

    useEffect(() => {
        if (!overviewOptimisticContent) return undefined;
        const id = requestAnimationFrame(() => {
            requestAnimationFrame(() => setOverviewOptimisticContent(null));
        });
        return () => cancelAnimationFrame(id);
    }, [photoRevision, overviewOptimisticContent]);

    const handleOverviewReorder = useCallback(
        (fromSpreadIndex, toSpreadIndex) => {
            if (!canDragOverviewSpreads) return;
            if (fromSpreadIndex === toSpreadIndex) return;
            overviewDidDragRef.current = true;

            const plan = buildOverviewSpreadReorderPlan(
                fromSpreadIndex,
                toSpreadIndex,
                totalPages,
                spreadOpts
            );
            if (plan) {
                const snapshots = Array.from({ length: totalSpreads }, (_, index) =>
                    resolveOverviewSpreadVisual(album, index, totalPages, spreadOpts, showSamples)
                );
                const optimistic = snapshots.slice();
                plan.draggable.forEach((spreadIndex, position) => {
                    optimistic[spreadIndex] = snapshots[plan.newOrder[position]];
                });
                setOverviewOptimisticContent(optimistic);
            }

            onReorderOverviewSpread?.(fromSpreadIndex, toSpreadIndex);
        },
        [
            canDragOverviewSpreads,
            onReorderOverviewSpread,
            album,
            totalPages,
            spreadOpts,
            showSamples,
            totalSpreads,
        ]
    );

    const isOverviewSpreadDraggable = useCallback(
        (overviewSpreadIndex) =>
            isDraggableOverviewSpread(overviewSpreadIndex, totalPages, spreadOpts),
        [totalPages, spreadOpts]
    );

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
        spreadMagnify.reset();
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
    }, [album?.has_covers, beginCoverHideTo3DFlip, beginEndRevealFlip, endCoverOnly, external3DCover, onExternalCoverRequest, onPageChange, spreadIndex, spreadMagnify.reset, spreadOpts, totalPages]);

    const flipNext = useCallback(() => {
        closeAlbumPinPopovers();
        spreadMagnify.reset();
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
    }, [album?.has_covers, beginCoverRevealFlip, external3DCover, onPageChange, spreadIndex, spreadMagnify.reset, spreadOpts, totalPages, totalSpreads]);

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
        if (!album?.id) return undefined;
        let cancelled = false;
        void Promise.all([
            hydrateSwapMarks(album.id),
            hydratePhotoPins(album.id),
        ]).then(() => {
            if (cancelled) return;
            setSwapMarks(getSwapMarks(album.id));
            setPhotoPins(getPhotoPins(album.id));
        });
        return () => {
            cancelled = true;
        };
    }, [album?.id]);

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
        window.addEventListener(SWAP_MARKS_SEEN_CHANGED_EVENT, onSwapMarksChanged);
        return () => {
            window.removeEventListener(SWAP_MARKS_CHANGED_EVENT, onSwapMarksChanged);
            window.removeEventListener(SWAP_MARKS_SEEN_CHANGED_EVENT, onSwapMarksChanged);
        };
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
        window.addEventListener(PHOTO_PINS_SEEN_CHANGED_EVENT, onPinsChanged);
        return () => {
            window.removeEventListener(PHOTO_PINS_CHANGED_EVENT, onPinsChanged);
            window.removeEventListener(PHOTO_PINS_SEEN_CHANGED_EVENT, onPinsChanged);
        };
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
            if (!ensureClientFeedback('swap')) return;
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
            const identity = getClientReviewerIdentity(album.id);
            addSwapMark(album.id, originSlot, secondSlot, {
                pointA,
                pointB,
                authorName: identity?.name || null,
            });
            if (previewMode) {
                notifyClientFeedbackEvent(album.id, {
                    photographerId: album.photographer_id,
                    hadFeedbackBefore: hadFeedback,
                    eventType: 'swap',
                    eventLabel: 'Swap request',
                    eventDetail: `${originSlot.label || getSlotLabel(originSlot.pageNum, originSlot.cellId, originSlot.whole)} ↔ ${secondSlot.label || getSlotLabel(secondSlot.pageNum, secondSlot.cellId, secondSlot.whole)}`,
                });
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
        [album?.id, swapPickerOrigin, swapPinFlow, previewMode, goToPage, spreadOpts, totalPages, ensureClientFeedback]
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
                if (!ensureClientFeedback('swap')) return;
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
                if (!ensureClientFeedback('swap')) return;
                const mark = addSwapMark(album.id, originSlot, placement, {
                    pointA: {
                        xPct: 50,
                        yPct: 50,
                        pageNum: originSlot.pageNum,
                        cellId: originSlot.cellId ?? 0,
                    },
                    pointB: placementPoint,
                    authorName: getClientReviewerIdentity(album.id)?.name || null,
                });
                if (mark) {
                    if (previewMode) {
                        notifyClientFeedbackEvent(album.id, {
                            photographerId: album.photographer_id,
                            hadFeedbackBefore: hadFeedback,
                            eventType: 'swap',
                            eventLabel: 'Swap request',
                            eventDetail: `${originSlot.label || getSlotLabel(originSlot.pageNum, originSlot.cellId, originSlot.whole)} ↔ ${placement.label || getSlotLabel(placement.pageNum, placement.cellId, placement.whole)}`,
                        });
                    }
                    setSwapPinFlow(null);
                }
                return;
            }

            if (slotsMatch(originSlot, placement)) {
                const hadFeedback = albumHadClientFeedbackBefore(album.id);
                if (!ensureClientFeedback('swap')) return;
                const mark = addSwapMark(album.id, originSlot, placement, {
                    pointA: swapPinFlow.originPoint,
                    pointB: placementPoint,
                    authorName: getClientReviewerIdentity(album.id)?.name || null,
                });
                if (mark) {
                    if (previewMode) {
                        notifyClientFeedbackEvent(album.id, {
                            photographerId: album.photographer_id,
                            hadFeedbackBefore: hadFeedback,
                            eventType: 'swap',
                            eventLabel: 'Swap request',
                            eventDetail: `${originSlot.label || getSlotLabel(originSlot.pageNum, originSlot.cellId, originSlot.whole)} ↔ ${placement.label || getSlotLabel(placement.pageNum, placement.cellId, placement.whole)}`,
                        });
                    }
                    setSwapPinFlow(null);
                }
                return;
            }

            const hadFeedback = albumHadClientFeedbackBefore(album.id);
            if (!ensureClientFeedback('swap')) return;
            const mark = addSwapMark(album.id, originSlot, placement, {
                pointA: swapPinFlow.originPoint,
                pointB: placementPoint,
                authorName: getClientReviewerIdentity(album.id)?.name || null,
            });
            if (mark) {
                if (previewMode) {
                    notifyClientFeedbackEvent(album.id, {
                        photographerId: album.photographer_id,
                        hadFeedbackBefore: hadFeedback,
                        eventType: 'swap',
                        eventLabel: 'Swap request',
                        eventDetail: `${originSlot.label || getSlotLabel(originSlot.pageNum, originSlot.cellId, originSlot.whole)} ↔ ${placement.label || getSlotLabel(placement.pageNum, placement.cellId, placement.whole)}`,
                    });
                }
                setSwapPinFlow(null);
            }
        },
        [album?.id, swapPinFlow, swapMarkMode, proofSpotPicker, previewMode, ensureClientFeedback]
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
            if (!ensureClientFeedback('comment')) return;
            const hadFeedback = albumHadClientFeedbackBefore(album.id);
            const identity = getClientReviewerIdentity(album.id);
            addPhotoPin(album.id, {
                ...pinComposer,
                message,
                authorName: identity?.name || null,
            });
            if (previewMode) {
                notifyClientFeedbackEvent(album.id, {
                    photographerId: album.photographer_id,
                    hadFeedbackBefore: hadFeedback,
                    eventType: 'photo_comment',
                    eventLabel: 'Photo comment',
                    eventDetail: message,
                });
            }
            setPinComposer(null);
        },
        [album?.id, pinComposer, previewMode, ensureClientFeedback]
    );

    const handlePinSaveDirect = useCallback(
        (placement) => {
            let msgText = '';
            let attachment = null;
            if (typeof placement?.message === 'object' && placement.message !== null) {
                msgText = placement.message.message || '';
                attachment = placement.message.attachment || null;
            } else {
                msgText = placement?.message || '';
            }
            if (!album?.id || (!msgText.trim() && !attachment)) return;
            if (!ensureClientFeedback('comment')) return;
            const hadFeedback = albumHadClientFeedbackBefore(album.id);
            const identity = getClientReviewerIdentity(album.id);
            addPhotoPin(album.id, {
                ...placement,
                message: msgText,
                attachment,
                authorName: placement.authorName || identity?.name || null,
            });
            if (previewMode) {
                notifyClientFeedbackEvent(album.id, {
                    photographerId: album.photographer_id,
                    hadFeedbackBefore: hadFeedback,
                    eventType: 'photo_comment',
                    eventLabel: 'Photo comment',
                    eventDetail: msgText || (attachment?.type === 'audio' ? 'Voice message' : 'Photo attachment'),
                });
            }
        },
        [album?.id, previewMode, ensureClientFeedback]
    );

    const handlePinRemove = useCallback(
        (pinId) => {
            if (!album?.id) return;
            removePhotoPin(album.id, pinId);
        },
        [album?.id]
    );

    const handleSwapPinRemove = useCallback(
        (markId) => {
            if (!album?.id || !markId) return;
            removeSwapMark(album.id, markId);
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
            onSwapPinRemove: handleSwapPinRemove,
            /**
             * Hide Remove on comment/swap pin popovers in the photographer editor.
             * Client share/preview can still remove their own pins.
             */
            allowPinRemove: Boolean(clientPreview),
            onActivatePinMode: handleActivatePinMode,
            proofToolsHover,
            spotActionPicker: proofSpotPicker,
            spotCanComment,
            spotCanSwap,
            ensureClientFeedback,
            activeBookPage: pageIndex,
            spreadMagnifyActive: spreadMagnify.active,
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
            handleSwapPinRemove,
            clientPreview,
            handleActivatePinMode,
            proofSpotPicker,
            spotCanComment,
            spotCanSwap,
            ensureClientFeedback,
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
                spreadMagnify.active ? ' ab-root--spread-magnify' : ''
            }${isPinModeOn && pinMarkMode ? ' ab-root--pin-mode' : ''}${
                previewMode && swapMarkMode ? ' ab-root--swap-mode' : ''
            }${isWholeSpreadLayout(album?.grid_layout) ? ' ab-root--whole-spread' : ''}`}
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
                        spreadMagnify.active
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
                        startPage={storagePageToFlipbookIndex(pageIndex, totalPages, spreadOpts)}
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
                <div className="ab-spread-meta">
                    <span className="ab-spread-meta-label">{spreadMetaLabel}</span>
                    {currentSpreadVersion > 0 ? (
                        <span className="ab-spread-meta-version" aria-label={`Version ${currentSpreadVersion}`}>
                            v{currentSpreadVersion}
                        </span>
                    ) : null}
                </div>
                <div
                    className={`ab-spread-controls ab-spread-controls--toolbar${
                        toolbarCounterWide ? ' ab-spread-controls--wide-counter' : ''
                    }`}
                    style={{
                        '--ab-counter-ch': `${Math.max(7, counterLabel.length + 1)}ch`,
                    }}
                >
                    <div className="ab-toolbar-group">
                        <button
                            type="button"
                            className="ab-control-icon ab-control-icon--button"
                            aria-label="Zoom out"
                            disabled={!spreadMagnify.canZoomOut}
                            onClick={spreadMagnify.zoomOut}
                        >
                            <svg width="20" height="20" viewBox="0 0 28 28" fill="none" aria-hidden>
                                <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
                                <path d="M16 16l5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                <path d="M8 11h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                        </button>
                        <span className="ab-zoom-level" aria-live="polite">
                            {zoomPercentLabel}
                        </span>
                        <button
                            type="button"
                            className="ab-control-icon ab-control-icon--button"
                            aria-label="Zoom in"
                            disabled={!spreadMagnify.canZoomIn}
                            onClick={spreadMagnify.zoomIn}
                        >
                            <svg width="20" height="20" viewBox="0 0 28 28" fill="none" aria-hidden>
                                <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
                                <path d="M16 16l5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                <path d="M8 11h6M11 8v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>
                    <span className="ab-spread-controls-divider" aria-hidden />
                    <div className="ab-toolbar-group">
                        <button
                            type="button"
                            className="ab-control-icon ab-control-icon--button"
                            aria-label="Show spread full screen"
                            onClick={openFocusView}
                        >
                            <svg width="18" height="18" viewBox="0 0 28 28" fill="none" aria-hidden>
                                <path
                                    d="M11 5H5v6M17 5h6v6M23 17v6h-6M11 23H5v-6"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </button>
                        <button
                            type="button"
                            className="ab-control-icon ab-control-icon--button"
                            aria-label="Show page overview"
                            onClick={openOverview}
                        >
                            <svg width="18" height="18" viewBox="0 0 28 28" fill="none" aria-hidden>
                                <rect x="4" y="4" width="8" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
                                <rect x="16" y="4" width="8" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
                                <rect x="4" y="16" width="8" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
                                <rect x="16" y="16" width="8" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
                            </svg>
                        </button>
                    </div>
                    <span className="ab-spread-controls-divider" aria-hidden />
                    {!previewMode ? (
                        <>
                            <div
                                className={`ab-need-action${needActionCount === 0 ? ' ab-need-action--clear' : ''}`}
                                role="group"
                                aria-label="Items needing action"
                            >
                                <span className="ab-need-action-label">
                                    {needActionCount > 0 ? `${needActionCount} need action` : 'All clear'}
                                </span>
                                <button
                                    type="button"
                                    className="ab-need-action-nav"
                                    aria-label="Previous item needing action"
                                    disabled={needActionCount === 0}
                                    onClick={() => goToNeedAction(-1)}
                                >
                                    ‹
                                </button>
                                <button
                                    type="button"
                                    className="ab-need-action-nav"
                                    aria-label="Next item needing action"
                                    disabled={needActionCount === 0}
                                    onClick={() => goToNeedAction(1)}
                                >
                                    ›
                                </button>
                            </div>
                            <span className="ab-spread-controls-divider" aria-hidden />
                        </>
                    ) : null}
                    <span
                        className={`ab-page-counter${
                            (spreadOpts.hasCovers && spreadIndex <= 0) ||
                            isEndHalfSpreadIndex(spreadIndex, totalPages, spreadOpts)
                                ? ' ab-page-counter--named'
                                : ''
                        }${toolbarCounterWide ? ' ab-page-counter--wide' : ''}`}
                        title={
                            (spreadOpts.hasCovers && spreadIndex <= 0) ||
                            isEndHalfSpreadIndex(spreadIndex, totalPages, spreadOpts)
                                ? counterLabel
                                : `Pages ${pageRangeLabel}`
                        }
                    >
                        {counterLabel}
                    </span>
                </div>
                {currentSpreadComments?.length > 0 && (
                    <div className="ab-spread-comments-bar">
                        <SpreadGridComments
                            comments={currentSpreadComments}
                            variant="spreadBar"
                            albumId={album?.id}
                            seenTick={proofSeenTick}
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
                            The first and last spreads stay fixed. Drag any spread in between to reorder.
                        </p>
                    ) : null}
                    <OverviewSortableGrid
                        itemCount={totalSpreads}
                        isDraggable={isOverviewSpreadDraggable}
                        onReorder={handleOverviewReorder}
                        disabled={!canDragOverviewSpreads || pageCountBusy}
                        className={`ab-overview-grid${
                            pageCountBusy ? ' ab-overview-grid--transitioning' : ''
                        }`}
                        renderItem={(overviewSpreadIndex, { draggable: spreadDraggable }) => {
                            const visual =
                                overviewOptimisticContent?.[overviewSpreadIndex] ??
                                resolveOverviewSpreadVisual(
                                    album,
                                    overviewSpreadIndex,
                                    totalPages,
                                    spreadOpts,
                                    showSamples
                                );
                            const {
                                isCover,
                                isEndSpread,
                                isEndHalf,
                                isInsideCover,
                                isPreBack,
                                spreadSrc,
                                bookWrapSrc,
                                leftSrc,
                                rightSrc,
                                showSpreadFull,
                            } = visual;
                            const designedBlankLeft = Boolean(isInsideCover);
                            const designedBlankRight = Boolean(isPreBack);
                            const targetPage = spreadIndexToPage(overviewSpreadIndex, spreadCtx);
                            const isSelected = overviewSpreadIndex === overviewTargetSpreadIndex;
                            return (
                                <button
                                    type="button"
                                    className={`ab-overview-item${
                                        isCover ? ' ab-overview-item--cover' : ''
                                    }${isEndSpread ? ' ab-overview-item--back' : ''}${
                                        isInsideCover ? ' ab-overview-item--inside-cover' : ''
                                    }${isPreBack ? ' ab-overview-item--pre-back' : ''}${
                                        isSelected ? ' ab-overview-item--active' : ''
                                    }${
                                        spreadDraggable ? ' ab-overview-item--draggable' : ''
                                    }`}
                                    onClick={() => {
                                        if (overviewDidDragRef.current) {
                                            overviewDidDragRef.current = false;
                                            return;
                                        }
                                        setOverviewTargetSpreadIndex(overviewSpreadIndex);
                                        goToPage(targetPage);
                                        // Preview / client link: close overview and land on the spread.
                                        if (previewMode) {
                                            setOverviewOpen(false);
                                        }
                                    }}
                                >
                                    <span className="ab-overview-thumb ab-overview-thumb--spread">
                                        {showSpreadFull ? (
                                            <span className="ab-overview-page ab-overview-page--spread-full">
                                                <img src={spreadSrc} alt="" draggable={false} />
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
                                                        <img src={leftSrc} alt="" draggable={false} />
                                                    ) : (
                                                        <span
                                                            className={`ab-overview-placeholder${
                                                                designedBlankLeft
                                                                    ? ' ab-overview-placeholder--designed-blank'
                                                                    : ''
                                                            }`}
                                                        />
                                                    )}
                                                </span>
                                                {!spreadSrc && (
                                                    <span className="ab-overview-page">
                                                        {rightSrc ? (
                                                            <img
                                                                src={rightSrc}
                                                                alt=""
                                                                draggable={false}
                                                            />
                                                        ) : (
                                                            <span
                                                                className={`ab-overview-placeholder${
                                                                    designedBlankRight
                                                                        ? ' ab-overview-placeholder--designed-blank'
                                                                        : ''
                                                                }`}
                                                            />
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
                        }}
                    />
                    {(canAddPages || canDeleteOverviewSpread) && (
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
