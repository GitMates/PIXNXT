import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    formatOverviewSpreadLabel,
    getSpreadContext,
    getSpreadPages,
    getTotalSpreads,
    isDraggableOverviewSpread,
    isEndHalfSpreadIndex,
    isWholeSpreadLayout,
    pageToSpreadIndex,
    spreadIndexToPage,
    albumHasBlankCovers,
} from './albumSpreadUtils';
import { getSpreadLeftPageIndex } from './albumSpreadGrid';
import {
    getGridSlotPhoto,
    getPagePhotoOverride,
    getSpreadPhotoOverride,
    resolveCoverImageSrc,
} from './albumPagePhotos';
import { buildOverviewSpreadReorderPlan } from './albumSpreadReorder';
import OverviewLeatherCover from './OverviewLeatherCover';
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
    const directSrc = getPagePhotoOverride(albumId, pageNum);
    if (directSrc) return directSrc;
    const spreadLeft = getSpreadLeftPageIndex(pageNum, { ...spreadOpts, totalPages });
    const cellId = pageNum === spreadLeft ? 1 : 2;
    const slot = getGridSlotPhoto(albumId, pageNum, cellId, spreadLeft, totalPages, {
        wholeSpread: isWholeSpreadLayout(album?.grid_layout),
        spreadOpts,
    });
    return slot.src || null;
}

function resolveFilmstripVisual(album, spreadIndex, totalPages, spreadOpts) {
    const { left, right } = getSpreadPages(spreadIndex, totalPages, spreadOpts);
    const isCover = spreadOpts.hasCovers && spreadIndex === 0;
    const isEndSpread = isEndHalfSpreadIndex(spreadIndex, totalPages, spreadOpts);
    const spreadSrc = !isCover && !isEndSpread ? getSpreadPhotoOverride(album?.id, left) : null;
    const coverSrc =
        isCover || isEndSpread
            ? getSpreadPhotoOverride(album?.id, 0) ||
              resolveCoverImageSrc(album, { showSamples: false })
            : null;
    const leftSrc = getFilmstripPageImage(album, left, totalPages);
    const rightSrc =
        right !== left ? getFilmstripPageImage(album, right, totalPages) : null;

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

function FilmstripThumb({ visual, album }) {
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
        if (src) {
            return <img src={src} alt="" draggable={false} />;
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
    spreadCommentsBySpread = null,
    disabled = false,
}) {
    const stripRef = useRef(null);
    const wrapRefs = useRef([]);
    const scrollRafRef = useRef(null);
    const scrollVelocityRef = useRef(0);
    const [drag, setDrag] = useState(null);
    const [optimisticVisuals, setOptimisticVisuals] = useState(null);

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
            const commentCount = spreadCommentsBySpread?.[spreadIndex]?.length || 0;
            return { spreadIndex, visual, label, commentCount };
        });
    }, [album, totalPages, spreadCtx, totalSpreads, photoRevision, spreadCommentsBySpread]);

    const tiles = useMemo(() => {
        if (!optimisticVisuals) return liveTiles;
        return liveTiles.map((tile, index) => ({
            ...tile,
            visual: optimisticVisuals[index] || tile.visual,
        }));
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

            const snapshots = liveTiles.map((tile) => tile.visual);
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
                {tiles.map(({ spreadIndex, visual, label, commentCount }) => {
                    const active = spreadIndex === activeSpreadIndex;
                    const isLocked = lockedIndices.has(spreadIndex);
                    const isDragging = drag?.fromIndex === spreadIndex;
                    const transform = getWrapTransform(spreadIndex, drag, lockedIndices);
                    const draggable = canDrag && !isLocked;

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
                                aria-label={
                                    label
                                        ? `${label}${draggable ? '. Drag to reorder' : ''}`
                                        : `Spread ${spreadIndex + 1}`
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
                                <span className="ae-spread-filmstrip__thumb">
                                    <FilmstripThumb visual={visual} album={album} />
                                </span>
                                <span className="ae-spread-filmstrip__num">{label}</span>
                                {commentCount > 0 ? (
                                    <span className="ae-spread-filmstrip__badge">
                                        {commentCount}
                                    </span>
                                ) : null}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
