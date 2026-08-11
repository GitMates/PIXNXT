import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    formatOverviewSpreadLabel,
    formatSpreadCounterNumber,
    getSpreadContext,
    getSpreadPages,
    getTotalSpreads,
    isDraggableOverviewSpread,
    isEndHalfSpreadIndex,
    isInsideCoverLeftPage,
    isInsideCoverSpreadLeft,
    isPreBackHalfSpreadLeftPage,
    isPreBackHalfSpreadRightPage,
    isWholeSpreadLayout,
    pageToSpreadIndex,
    spreadIndexToPage,
    albumHasBlankCovers,
} from './albumSpreadUtils';
import { getSpreadLeftPageIndex } from './albumSpreadGrid';
import {
    getGridSlotPhoto,
    getInsideCoverRightPhotoSrc,
    getPagePhotoOverride,
    getSpreadPhotoOverride,
    resolveCoverImageSrc,
} from './albumPagePhotos';
import { buildOverviewSpreadReorderPlan } from './albumSpreadReorder';
import OverviewLeatherCover from './OverviewLeatherCover';
import { parseGridSizeAspect } from './albumGridSize';
import BookWrapSpineImage from './BookWrapSpineImage';
import { bindHorizontalWheelScroll } from './horizontalWheelScroll';
import { getBookWrapSpineLayout } from './bookWrapSpine';
import { getSpreadPhotoTransform } from './albumPageTransforms';
import { SPINE_BOUNDS_CHANGED_EVENT } from './albumSpineSettings';
import './AlbumSpreadFilmstrip.css';

const STRIP_GAP_PX = 10;
const CLICK_MOVE_PX = 4;

function nearestDraggableIndex(index, lockedIndices, length) {
    if (!lockedIndices.has(index)) return index;
    for (let offset = 1; offset < length; offset += 1) {
        const before = index - offset;
        const after = index + offset;
        if (before >= 0 && !lockedIndices.has(before)) return before;
        if (after < length && !lockedIndices.has(after)) return after;
    }
    return index;
}

function resolveOverIndex(deltaX, itemWidth, fromIndex, lockedIndices, length) {
    const displacement = Math.round(deltaX / itemWidth);
    let overIndex = fromIndex + displacement;

    let min = 0;
    let max = length - 1;
    while (min < length && lockedIndices.has(min)) min += 1;
    while (max >= 0 && lockedIndices.has(max)) max -= 1;

    overIndex = Math.max(min, Math.min(max, overIndex));
    return nearestDraggableIndex(overIndex, lockedIndices, length);
}

function getWrapTransform(index, drag, lockedIndices) {
    if (!drag) return null;
    const { fromIndex, overIndex, deltaX, itemWidth } = drag;

    if (index === fromIndex) {
        return `translate3d(${deltaX}px, 0, 0) scale(1.03)`;
    }

    if (lockedIndices.has(index)) return null;

    if (fromIndex < overIndex && index > fromIndex && index <= overIndex) {
        return `translate3d(${-itemWidth}px, 0, 0)`;
    }

    if (fromIndex > overIndex && index >= overIndex && index < fromIndex) {
        return `translate3d(${itemWidth}px, 0, 0)`;
    }

    return null;
}

function getFilmstripPageImage(album, pageNum, totalPages) {
    const albumId = album?.id;
    const spreadOpts = getSpreadContext(album, totalPages);
    if (pageNum === 0 && spreadOpts.hasCovers) {
        return resolveCoverImageSrc(album, { showSamples: false });
    }
    if (isInsideCoverLeftPage(pageNum, spreadOpts)) {
        return null;
    }
    if (isPreBackHalfSpreadRightPage(pageNum, totalPages, spreadOpts)) {
        return null;
    }
    if (spreadOpts.hasCovers && pageNum === 3) {
        return getInsideCoverRightPhotoSrc(albumId, { showSamples: false });
    }
    const directSrc = getPagePhotoOverride(albumId, pageNum);
    if (directSrc) return directSrc;
    const spreadLeft = getSpreadLeftPageIndex(pageNum, { ...spreadOpts, totalPages });
    const cellId = pageNum === spreadLeft ? 1 : 2;
    const slot = getGridSlotPhoto(albumId, pageNum, cellId, spreadLeft, totalPages, {
        wholeSpread:
            isWholeSpreadLayout(album?.grid_layout) &&
            !isInsideCoverSpreadLeft(spreadLeft, totalPages, spreadOpts) &&
            !isPreBackHalfSpreadLeftPage(spreadLeft, totalPages, spreadOpts),
        spreadOpts,
    });
    return slot.src || null;
}

export function resolveFilmstripVisual(album, spreadIndex, totalPages, spreadOpts) {
    const { left, right } = getSpreadPages(spreadIndex, totalPages, spreadOpts);
    const isCover = spreadOpts.hasCovers && spreadIndex === 0;
    const isEndSpread = isEndHalfSpreadIndex(spreadIndex, totalPages, spreadOpts);
    const isInsideCover = isInsideCoverSpreadLeft(left, totalPages, spreadOpts);
    const isPreBack = isPreBackHalfSpreadLeftPage(left, totalPages, spreadOpts);
    const spreadSrc =
        !isCover && !isEndSpread && !isInsideCover && !isPreBack
            ? getSpreadPhotoOverride(album?.id, left)
            : null;
    const coverSrc =
        isCover || isEndSpread
            ? getSpreadPhotoOverride(album?.id, 0) ||
              resolveCoverImageSrc(album, { showSamples: false })
            : null;
    const leftSrc = getFilmstripPageImage(album, left, totalPages);
    const rightSrc =
        right !== left && !isPreBack ? getFilmstripPageImage(album, right, totalPages) : null;

    return {
        isCover,
        isEndSpread,
        spreadSrc,
        coverSrc,
        leftSrc,
        rightSrc,
        showSpreadFull: Boolean(spreadSrc),
        useLeather:
            (isCover || isEndSpread) &&
            !coverSrc &&
            !leftSrc &&
            !rightSrc &&
            albumHasBlankCovers(album),
    };
}

export function FilmstripThumb({ visual, album, wrapLayout = null, coverTransform = null }) {
    const {
        isCover,
        isEndSpread,
        spreadSrc,
        coverSrc,
        leftSrc,
        rightSrc,
        showSpreadFull,
        useLeather,
    } = visual;

    if (showSpreadFull) {
        return <img src={spreadSrc} alt="" draggable={false} />;
    }

    if (isCover || isEndSpread) {
        const src = coverSrc || leftSrc || rightSrc;
        if (src && wrapLayout) {
            return (
                <span className="ae-spread-filmstrip__thumb--cover-wrap">
                    <BookWrapSpineImage
                        src={src}
                        side={isCover ? 'front' : 'back'}
                        layout={wrapLayout}
                        transform={coverTransform}
                        className="ae-spread-filmstrip__wrap-img"
                    />
                </span>
            );
        }
        if (src) {
            // Fallback when spine layout is unavailable — still prefer a single-panel fit.
            const sideClass = isCover
                ? 'ae-spread-filmstrip__thumb--cover-half--front'
                : 'ae-spread-filmstrip__thumb--cover-half--back';
            return (
                <span className={`ae-spread-filmstrip__thumb--cover-half ${sideClass}`}>
                    <img src={src} alt="" draggable={false} />
                </span>
            );
        }
        if (useLeather || albumHasBlankCovers(album)) {
            return <OverviewLeatherCover album={album} showTitle={isCover} />;
        }
        return <span className="ae-spread-filmstrip__ph" />;
    }

    return (
        <>
            <span className="ae-spread-filmstrip__page">
                {leftSrc ? (
                    <img src={leftSrc} alt="" draggable={false} />
                ) : (
                    <span className="ae-spread-filmstrip__ph" />
                )}
            </span>
            <span className="ae-spread-filmstrip__page">
                {rightSrc ? (
                    <img src={rightSrc} alt="" draggable={false} />
                ) : (
                    <span className="ae-spread-filmstrip__ph" />
                )}
            </span>
        </>
    );
}

/**
 * Horizontal strip of all album spreads under the editor canvas.
 * Live thumbs + drag-reorder (same rules as page overview / Collections).
 */
export default function AlbumSpreadFilmstrip({
    album,
    totalPages,
    bookPage = 0,
    onSelectSpread,
    onReorderSpread,
    photoRevision = 0,
    disabled = false,
    commentSpreads = null,
    swapSpreads = null,
    versionBySpread = null,
    tipBySpread = null,
}) {
    const stripRef = useRef(null);
    const wrapRefs = useRef([]);
    const scrollRafRef = useRef(null);
    const scrollVelocityRef = useRef(0);
    const dragRef = useRef(null);
    const [drag, setDrag] = useState(null);
    const [optimisticVisuals, setOptimisticVisuals] = useState(null);
    const [spineBoundsTick, setSpineBoundsTick] = useState(0);

    useEffect(() => {
        if (!album?.id) return undefined;
        const onSpine = (e) => {
            if (e.detail?.albumId === album.id) setSpineBoundsTick((t) => t + 1);
        };
        window.addEventListener(SPINE_BOUNDS_CHANGED_EVENT, onSpine);
        return () => window.removeEventListener(SPINE_BOUNDS_CHANGED_EVENT, onSpine);
    }, [album?.id]);

    const wrapLayout = useMemo(() => {
        void spineBoundsTick;
        if (album?.has_covers !== true) return null;
        if (albumHasBlankCovers(album) && !getSpreadPhotoOverride(album?.id, 0)) {
            return null;
        }
        return getBookWrapSpineLayout(album);
    }, [album, spineBoundsTick]);

    const coverTransform = useMemo(() => {
        void photoRevision;
        if (!album?.id || album?.has_covers !== true) {
            return { x: 0, y: 0, scaleX: 1, scaleY: 1 };
        }
        return getSpreadPhotoTransform(album.id, 0);
    }, [album?.id, album?.has_covers, photoRevision]);

    const spreadCtx = useMemo(
        () => getSpreadContext(album, totalPages),
        [album, totalPages]
    );
    const totalSpreads = useMemo(
        () => getTotalSpreads(totalPages, spreadCtx),
        [totalPages, spreadCtx]
    );
    const activeSpreadIndex = useMemo(
        () => pageToSpreadIndex(bookPage, spreadCtx),
        [bookPage, spreadCtx]
    );
    const pageAspect = useMemo(
        () => parseGridSizeAspect(album?.grid_size || 'square'),
        [album?.grid_size]
    );
    const spreadAspect = pageAspect * 2;

    const lockedIndices = useMemo(() => {
        const locked = new Set();
        for (let i = 0; i < totalSpreads; i += 1) {
            if (!isDraggableOverviewSpread(i, totalPages, spreadCtx)) locked.add(i);
        }
        return locked;
    }, [totalSpreads, totalPages, spreadCtx]);

    const canDrag = Boolean(onReorderSpread) && !disabled;

    const liveTiles = useMemo(() => {
        void photoRevision;
        return Array.from({ length: totalSpreads }, (_, spreadIndex) => {
            const visual = resolveFilmstripVisual(album, spreadIndex, totalPages, spreadCtx);
            const label = formatOverviewSpreadLabel(spreadIndex, totalPages, spreadCtx);
            return { spreadIndex, visual, label };
        });
    }, [album, totalPages, spreadCtx, totalSpreads, photoRevision]);

    const tiles = useMemo(() => {
        if (!optimisticVisuals) return liveTiles;
        return liveTiles.map((tile, index) => {
            const optimistic = optimisticVisuals[index];
            if (!optimistic) return tile;
            return {
                ...tile,
                visual: optimistic.visual || tile.visual,
            };
        });
    }, [liveTiles, optimisticVisuals]);

    useEffect(() => {
        if (!optimisticVisuals) return undefined;
        const id = requestAnimationFrame(() => {
            requestAnimationFrame(() => setOptimisticVisuals(null));
        });
        return () => cancelAnimationFrame(id);
    }, [photoRevision, optimisticVisuals]);

    useEffect(() => {
        if (drag) return;
        const el = wrapRefs.current[activeSpreadIndex];
        if (!el || typeof el.scrollIntoView !== 'function') return;
        el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, [activeSpreadIndex, totalSpreads, drag]);

    const stopAutoScroll = useCallback(() => {
        scrollVelocityRef.current = 0;
        if (scrollRafRef.current != null) {
            cancelAnimationFrame(scrollRafRef.current);
            scrollRafRef.current = null;
        }
    }, []);

    const runAutoScroll = useCallback(() => {
        if (scrollRafRef.current != null) return;

        const tick = () => {
            scrollRafRef.current = null;
            const strip = stripRef.current;
            const velocity = scrollVelocityRef.current;
            if (!strip || !velocity) return;

            const max = Math.max(0, strip.scrollWidth - strip.clientWidth);
            const next = Math.min(max, Math.max(0, strip.scrollLeft + velocity));
            strip.scrollLeft = next;

            if ((next <= 0 && velocity < 0) || (next >= max && velocity > 0)) {
                scrollVelocityRef.current = 0;
                return;
            }

            scrollRafRef.current = requestAnimationFrame(tick);
        };

        scrollRafRef.current = requestAnimationFrame(tick);
    }, []);

    const updateAutoScroll = useCallback(
        (clientX) => {
            const strip = stripRef.current;
            if (!strip) {
                stopAutoScroll();
                return;
            }

            const rect = strip.getBoundingClientRect();
            const edgeZone = 56;
            const maxSpeed = 14;
            let velocity = 0;

            if (clientX < rect.left + edgeZone) {
                const t = Math.min(1, (rect.left + edgeZone - clientX) / edgeZone);
                velocity = -(3 + t * (maxSpeed - 3));
            } else if (clientX > rect.right - edgeZone) {
                const t = Math.min(1, (clientX - (rect.right - edgeZone)) / edgeZone);
                velocity = 3 + t * (maxSpeed - 3);
            }

            scrollVelocityRef.current = velocity;
            if (!velocity) {
                stopAutoScroll();
                return;
            }
            runAutoScroll();
        },
        [runAutoScroll, stopAutoScroll]
    );

    const applyOptimisticReorder = useCallback(
        (fromSpreadIndex, toSpreadIndex) => {
            const plan = buildOverviewSpreadReorderPlan(
                fromSpreadIndex,
                toSpreadIndex,
                totalPages,
                spreadCtx
            );
            if (!plan) return;

            const snapshots = liveTiles.map((tile) => ({
                visual: tile.visual,
            }));
            const optimistic = snapshots.slice();
            plan.draggable.forEach((spreadIndex, position) => {
                optimistic[spreadIndex] = snapshots[plan.newOrder[position]];
            });
            setOptimisticVisuals(optimistic);
        },
        [liveTiles, totalPages, spreadCtx]
    );

    const handlePointerDown = useCallback(
        (e, index) => {
            if (!canDrag) return;
            if (lockedIndices.has(index)) return;
            if (e.button !== 0) return;

            const wrap = wrapRefs.current[index];
            if (!wrap) return;

            e.preventDefault();

            const rect = wrap.getBoundingClientRect();

            setDrag({
                fromIndex: index,
                overIndex: index,
                startX: e.clientX,
                deltaX: 0,
                itemWidth: rect.width + STRIP_GAP_PX,
                pointerId: e.pointerId,
                moved: false,
            });
        },
        [canDrag, lockedIndices]
    );

    useEffect(() => {
        if (!drag) return undefined;

        const onMove = (e) => {
            if (e.pointerId !== drag.pointerId) return;

            const deltaX = e.clientX - drag.startX;
            const moved = Math.abs(deltaX) > CLICK_MOVE_PX;
            const overIndex = resolveOverIndex(
                deltaX,
                drag.itemWidth,
                drag.fromIndex,
                lockedIndices,
                totalSpreads
            );

            setDrag((prev) =>
                prev
                    ? {
                          ...prev,
                          deltaX,
                          overIndex,
                          moved: prev.moved || moved,
                      }
                    : null
            );

            updateAutoScroll(e.clientX);
        };

        const finish = (e) => {
            if (e.pointerId !== drag.pointerId) return;

            stopAutoScroll();
            document.body.style.userSelect = '';

            const deltaX = e.clientX - drag.startX;
            const moved = drag.moved || Math.abs(deltaX) > CLICK_MOVE_PX;
            const overIndex = resolveOverIndex(
                deltaX,
                drag.itemWidth,
                drag.fromIndex,
                lockedIndices,
                totalSpreads
            );

            if (moved && drag.fromIndex !== overIndex) {
                applyOptimisticReorder(drag.fromIndex, overIndex);
                onReorderSpread?.(drag.fromIndex, overIndex);
            } else if (!moved) {
                const page = spreadIndexToPage(drag.fromIndex, spreadCtx);
                onSelectSpread?.(drag.fromIndex, page);
            }

            setDrag(null);
        };

        document.body.style.userSelect = 'none';
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', finish);
        window.addEventListener('pointercancel', finish);

        return () => {
            stopAutoScroll();
            document.body.style.userSelect = '';
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', finish);
            window.removeEventListener('pointercancel', finish);
        };
    }, [
        drag,
        totalSpreads,
        lockedIndices,
        onReorderSpread,
        onSelectSpread,
        spreadCtx,
        applyOptimisticReorder,
        stopAutoScroll,
        updateAutoScroll,
    ]);

    useEffect(() => () => stopAutoScroll(), [stopAutoScroll]);

    dragRef.current = drag;
    useEffect(() => {
        const el = stripRef.current;
        if (!el) return undefined;
        return bindHorizontalWheelScroll(el, {
            isPaused: () => Boolean(dragRef.current),
        });
    }, [totalSpreads]);

    if (totalSpreads <= 0) return null;

    const dragging = Boolean(drag);

    return (
        <div className="ae-spread-filmstrip" aria-label="Album spreads">
            <div
                className={`ae-spread-filmstrip__track${
                    dragging ? ' ae-spread-filmstrip__track--dragging' : ''
                }`}
                ref={stripRef}
                role="list"
            >
                {tiles.map(({ spreadIndex, visual, label }) => {
                    const active = spreadIndex === activeSpreadIndex;
                    const isLocked = lockedIndices.has(spreadIndex);
                    const isDragging = drag?.fromIndex === spreadIndex;
                    const transform = getWrapTransform(spreadIndex, drag, lockedIndices);
                    const draggable = canDrag && !isLocked;
                    const hasComment = Boolean(
                        commentSpreads &&
                            (commentSpreads instanceof Set
                                ? commentSpreads.has(spreadIndex)
                                : commentSpreads.includes?.(spreadIndex))
                    );
                    const hasSwap = Boolean(
                        swapSpreads &&
                            (swapSpreads instanceof Set
                                ? swapSpreads.has(spreadIndex)
                                : swapSpreads.includes?.(spreadIndex))
                    );
                    const version = versionBySpread?.[spreadIndex];
                    const tip = tipBySpread?.[spreadIndex];
                    const isCover = spreadCtx.hasCovers && spreadIndex === 0;
                    const isEndSpread = isEndHalfSpreadIndex(spreadIndex, totalPages, spreadCtx);
                    const tileAspect = (isCover || isEndSpread) ? pageAspect : spreadAspect;

                    return (
                        <div
                            key={spreadIndex}
                            ref={(node) => {
                                wrapRefs.current[spreadIndex] = node;
                            }}
                            className={`ae-spread-filmstrip__wrap${
                                isDragging ? ' ae-spread-filmstrip__wrap--dragging' : ''
                            }`}
                            style={transform ? { transform } : undefined}
                            role="listitem"
                            onPointerDown={(e) => handlePointerDown(e, spreadIndex)}
                        >
                            <button
                                type="button"
                                className={`ae-spread-filmstrip__tile${
                                    active ? ' ae-spread-filmstrip__tile--active' : ''
                                }${visual.isCover ? ' ae-spread-filmstrip__tile--cover' : ''}${
                                    visual.isEndSpread ? ' ae-spread-filmstrip__tile--back' : ''
                                }${isLocked ? ' ae-spread-filmstrip__tile--locked' : ''}${
                                    draggable ? ' ae-spread-filmstrip__tile--draggable' : ''
                                }`}
                                aria-current={active ? 'true' : undefined}
                                title={tip || undefined}
                                aria-label={
                                    tip ||
                                    (label
                                        ? `${label}${draggable ? '. Drag to reorder' : ''}`
                                        : `Spread ${spreadIndex + 1}`)
                                }
                                onClick={(e) => {
                                    // Draggable tiles navigate on pointer-up (click vs drag).
                                    if (dragging || (canDrag && !isLocked)) {
                                        e.preventDefault();
                                        return;
                                    }
                                    const page = spreadIndexToPage(spreadIndex, spreadCtx);
                                    onSelectSpread?.(spreadIndex, page);
                                }}
                            >
                                <span className="ae-spread-filmstrip__thumb" style={{ aspectRatio: String(tileAspect) }}>
                                    <FilmstripThumb
                                        visual={visual}
                                        album={album}
                                        wrapLayout={wrapLayout}
                                        coverTransform={coverTransform}
                                    />
                                    <div className="ae-spread-filmstrip__dots">
                                        {hasComment ? (
                                            <span className="ae-spread-filmstrip__dot ae-spread-filmstrip__dot--comment" aria-hidden />
                                        ) : null}
                                        {hasSwap ? (
                                            <span className="ae-spread-filmstrip__dot ae-spread-filmstrip__dot--swap" aria-hidden />
                                        ) : null}
                                    </div>
                                    {version ? (
                                        <span className="ae-spread-filmstrip__badge">
                                            v{version}
                                        </span>
                                    ) : null}
                                </span>
                                <span className="ae-spread-filmstrip__num">
                                    {spreadIndex === 0 && (spreadCtx.hasCovers || visual.isCover)
                                        ? 'COVER'
                                        : isEndHalfSpreadIndex(spreadIndex, totalPages, spreadCtx)
                                          ? 'BACK'
                                          : formatSpreadCounterNumber(
                                                spreadIndex,
                                                totalPages,
                                                spreadCtx
                                            )}
                                    {isLocked && !visual.isCover ? (
                                        <span className="ae-spread-filmstrip__lock" style={{ marginLeft: '4px', opacity: 0.7, display: 'inline-flex', alignItems: 'center' }}>
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                            </svg>
                                        </span>
                                    ) : null}
                                </span>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
