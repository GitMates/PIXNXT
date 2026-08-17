import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function reorderIds(ids, fromIndex, toIndex) {
    const next = ids.slice();
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
}

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

function captureLayoutRects(wrapRefs, count) {
    const rects = [];
    for (let i = 0; i < count; i += 1) {
        const el = wrapRefs.current[i];
        if (!el) {
            rects.push(null);
            continue;
        }
        const r = el.getBoundingClientRect();
        rects.push({
            left: r.left,
            top: r.top,
            right: r.right,
            bottom: r.bottom,
            width: r.width,
            height: r.height,
        });
    }
    return rects;
}

function adjustRectsForScroll(layoutRects, scrollDelta) {
    if (!scrollDelta) return layoutRects;
    return layoutRects.map((rect) =>
        rect
            ? {
                  ...rect,
                  top: rect.top - scrollDelta,
                  bottom: rect.bottom - scrollDelta,
              }
            : null
    );
}

function getWrapTransform(index, drag, lockedIndices) {
    if (!drag) return null;
    const { fromIndex, overIndex, deltaX, deltaY, layoutRects, scrollDelta } = drag;
    const rects = adjustRectsForScroll(layoutRects, scrollDelta);

    if (index === fromIndex) {
        return `translate3d(${deltaX}px, ${deltaY}px, 0) scale(1.02)`;
    }

    if (lockedIndices.has(index)) return null;

    let neighborIndex = null;
    if (fromIndex < overIndex && index > fromIndex && index <= overIndex) {
        neighborIndex = index - 1;
    } else if (fromIndex > overIndex && index >= overIndex && index < fromIndex) {
        neighborIndex = index + 1;
    }

    if (neighborIndex == null) return null;

    const rect = rects[index];
    const neighborRect = rects[neighborIndex];
    if (!rect || !neighborRect) return null;

    const dx = neighborRect.left - rect.left;
    const dy = neighborRect.top - rect.top;
    if (!dx && !dy) return null;
    return `translate3d(${dx}px, ${dy}px, 0)`;
}

function resolveOverIndex(clientX, clientY, layoutRects, count, lockedIndices, fallback) {
    for (let i = 0; i < count; i += 1) {
        const rect = layoutRects[i];
        if (!rect) continue;
        if (
            clientX >= rect.left &&
            clientX <= rect.right &&
            clientY >= rect.top &&
            clientY <= rect.bottom
        ) {
            return nearestDraggableIndex(i, lockedIndices, count);
        }
    }

    let best = fallback;
    let bestDist = Infinity;
    for (let i = 0; i < count; i += 1) {
        if (lockedIndices.has(i)) continue;
        const rect = layoutRects[i];
        if (!rect) continue;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = (clientX - cx) ** 2 + (clientY - cy) ** 2;
        if (dist < bestDist) {
            bestDist = dist;
            best = i;
        }
    }
    return best;
}

function buildNextIds(display, lockedIndices, fromIndex, overIndex) {
    const draggableEntries = display
        .map((photo, i) => ({ photo, i }))
        .filter(({ i }) => !lockedIndices.has(i));

    const draggableIds = draggableEntries.map(({ photo }) => photo.id);
    const fromDraggableIndex = draggableEntries.findIndex(({ i }) => i === fromIndex);
    const overDraggableIndex = draggableEntries.findIndex(({ i }) => i === overIndex);

    if (fromDraggableIndex < 0 || overDraggableIndex < 0) return null;

    const nextDraggableIds = reorderIds(draggableIds, fromDraggableIndex, overDraggableIndex);

    let draggableIdx = 0;
    return display.map((photo, i) => {
        if (lockedIndices.has(i)) return photo.id;
        return nextDraggableIds[draggableIdx++];
    });
}

const INTERACTIVE_SELECTOR =
    '.cd-photo-more-btn, .cd-photo-star, .cd-photo-check, .cd-photo-hover-tools, .cd-photo-menu, .cd-ctx-item, button, a, input, label';

function getScrollParent(gridEl) {
    return gridEl?.closest('.cd-main-area') || gridEl?.closest('.cd-main-wrapper') || null;
}

/**
 * Pointer-based photo grid reorder — same UX as smart-album collection sidebar drag.
 */
export default function CollectionPhotoSortableGrid({
    photos,
    className = '',
    gridRef,
    disabled = false,
    isDraggable,
    onReorder,
    renderPhoto,
}) {
    const internalGridRef = useRef(null);
    const wrapRefs = useRef([]);
    const scrollRafRef = useRef(null);
    const scrollVelocityRef = useRef(0);
    const dragRef = useRef(null);
    const displayPhotosRef = useRef(photos);
    const lockedIndicesRef = useRef(new Set());
    const onReorderRef = useRef(onReorder);
    const dragMovedRef = useRef(false);
    const suppressClickUntilRef = useRef(0);
    const [dragTick, setDragTick] = useState(0);
    const [optimisticIds, setOptimisticIds] = useState(null);

    const mergedGridRef = gridRef || internalGridRef;

    useEffect(() => {
        onReorderRef.current = onReorder;
    }, [onReorder]);

    useEffect(() => {
        if (!optimisticIds) return;
        const currentIds = photos.map((photo) => photo.id).join('|');
        if (currentIds === optimisticIds.join('|')) {
            setOptimisticIds(null);
        }
    }, [photos, optimisticIds]);

    const displayPhotos = useMemo(() => {
        if (!optimisticIds) return photos;
        const byId = new Map(photos.map((photo) => [photo.id, photo]));
        return optimisticIds.map((id) => byId.get(id)).filter(Boolean);
    }, [photos, optimisticIds]);

    useEffect(() => {
        displayPhotosRef.current = displayPhotos;
    }, [displayPhotos]);

    const lockedIndices = useMemo(() => {
        const locked = new Set();
        for (let i = 0; i < displayPhotos.length; i += 1) {
            if (!isDraggable?.(i, displayPhotos[i])) locked.add(i);
        }
        return locked;
    }, [displayPhotos, isDraggable]);

    useEffect(() => {
        lockedIndicesRef.current = lockedIndices;
    }, [lockedIndices]);

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
            const scroller = getScrollParent(mergedGridRef.current);
            const velocity = scrollVelocityRef.current;
            if (!scroller || !velocity) return;

            const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
            const next = Math.min(max, Math.max(0, scroller.scrollTop + velocity));
            scroller.scrollTop = next;

            const drag = dragRef.current;
            if (drag) {
                drag.scrollDelta = scroller.scrollTop - drag.startScrollTop;
                setDragTick((t) => t + 1);
            }

            if (scrollVelocityRef.current) {
                scrollRafRef.current = requestAnimationFrame(tick);
            }
        };

        scrollRafRef.current = requestAnimationFrame(tick);
    }, [mergedGridRef]);

    const updateAutoScroll = useCallback(
        (clientY) => {
            const scroller = getScrollParent(mergedGridRef.current);
            if (!scroller) {
                stopAutoScroll();
                return;
            }

            const rect = scroller.getBoundingClientRect();
            const edge = 72;
            if (clientY < rect.top + edge) {
                scrollVelocityRef.current = -Math.max(6, (rect.top + edge - clientY) * 0.35);
                runAutoScroll();
            } else if (clientY > rect.bottom - edge) {
                scrollVelocityRef.current = Math.max(6, (clientY - (rect.bottom - edge)) * 0.35);
                runAutoScroll();
            } else {
                stopAutoScroll();
            }
        },
        [mergedGridRef, runAutoScroll, stopAutoScroll]
    );

    const bumpDrag = useCallback(() => {
        setDragTick((tick) => tick + 1);
    }, []);

    const finishDrag = useCallback(
        (e) => {
            const drag = dragRef.current;
            if (!drag || e.pointerId !== drag.pointerId) return;

            stopAutoScroll();
            document.body.style.userSelect = '';

            if (drag.activated) {
                try {
                    wrapRefs.current[drag.fromIndex]?.releasePointerCapture(e.pointerId);
                } catch {
                    /* ignore */
                }
            }

            const display = displayPhotosRef.current;
            const count = display.length;
            const layoutRects = adjustRectsForScroll(drag.layoutRects, drag.scrollDelta);
            const overIndex = resolveOverIndex(
                e.clientX,
                e.clientY,
                layoutRects,
                count,
                lockedIndicesRef.current,
                drag.fromIndex
            );

            const moved = dragMovedRef.current;
            if (moved && drag.fromIndex !== overIndex) {
                const nextIds = buildNextIds(
                    display,
                    lockedIndicesRef.current,
                    drag.fromIndex,
                    overIndex
                );
                if (nextIds) {
                    setOptimisticIds(nextIds);
                    onReorderRef.current?.(drag.fromIndex, overIndex, nextIds);
                }
            }

            // Only swallow the trailing click after a real drag; plain clicks must select.
            if (moved) {
                suppressClickUntilRef.current = performance.now() + 250;
            }

            dragRef.current = null;
            dragMovedRef.current = false;
            bumpDrag();
        },
        [bumpDrag, stopAutoScroll]
    );

    useEffect(() => {
        const onMove = (e) => {
            const drag = dragRef.current;
            if (!drag || e.pointerId !== drag.pointerId) return;

            const deltaX = e.clientX - drag.startX;
            const deltaY = e.clientY - drag.startY;

            // Activate drag only past threshold so preventDefault/capture don't cancel click-to-select.
            if (!drag.activated && (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4)) {
                drag.activated = true;
                dragMovedRef.current = true;
                document.body.style.userSelect = 'none';
                try {
                    wrapRefs.current[drag.fromIndex]?.setPointerCapture(e.pointerId);
                } catch {
                    /* ignore */
                }
            }

            if (!drag.activated) return;

            const scroller = getScrollParent(mergedGridRef.current);
            if (scroller) {
                drag.scrollDelta = scroller.scrollTop - drag.startScrollTop;
            }

            drag.deltaX = deltaX;
            drag.deltaY = deltaY;

            const layoutRects = adjustRectsForScroll(drag.layoutRects, drag.scrollDelta);
            drag.overIndex = resolveOverIndex(
                e.clientX,
                e.clientY,
                layoutRects,
                displayPhotosRef.current.length,
                lockedIndicesRef.current,
                drag.fromIndex
            );

            updateAutoScroll(e.clientY);
            bumpDrag();
        };

        const onFinish = (e) => {
            finishDrag(e);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onFinish);
        window.addEventListener('pointercancel', onFinish);

        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onFinish);
            window.removeEventListener('pointercancel', onFinish);
        };
    }, [bumpDrag, finishDrag, mergedGridRef, updateAutoScroll]);

    const handlePointerDown = useCallback(
        (e, index) => {
            if (disabled) return;
            if (!isDraggable?.(index, displayPhotos[index])) return;
            if (e.button !== 0) return;
            if (e.target.closest(INTERACTIVE_SELECTOR)) return;

            const wrap = wrapRefs.current[index];
            if (!wrap) return;

            // Do not preventDefault/stopPropagation here — that suppresses the click
            // used by cd-photo-card to toggle selection. Capture starts after drag threshold.
            dragMovedRef.current = false;

            const scroller = getScrollParent(mergedGridRef.current);
            const count = displayPhotos.length;

            dragRef.current = {
                fromIndex: index,
                overIndex: index,
                startX: e.clientX,
                startY: e.clientY,
                deltaX: 0,
                deltaY: 0,
                pointerId: e.pointerId,
                layoutRects: captureLayoutRects(wrapRefs, count),
                startScrollTop: scroller?.scrollTop ?? 0,
                scrollDelta: 0,
                activated: false,
            };
            // No bumpDrag yet — wait until drag threshold so click-to-select is undisturbed.
        },
        [disabled, displayPhotos, isDraggable, mergedGridRef]
    );

    const handlePointerUp = useCallback(
        (e) => {
            finishDrag(e);
        },
        [finishDrag]
    );

    const consumeClick = useCallback(() => performance.now() < suppressClickUntilRef.current, []);

    const drag = dragRef.current;
    const dragging = Boolean(drag?.activated);
    void dragTick;

    return (
        <div
            ref={mergedGridRef}
            className={`${className}${dragging ? ' cd-photo-grid--dragging' : ''}`}
        >
            {displayPhotos.map((photo, index) => {
                const isDragging = Boolean(drag?.activated && drag.fromIndex === index);
                const transform = drag?.activated
                    ? getWrapTransform(index, drag, lockedIndices)
                    : null;
                const canDrag = isDraggable?.(index, photo) && !disabled;
                return (
                    <div
                        key={photo.id}
                        ref={(el) => {
                            wrapRefs.current[index] = el;
                        }}
                        className={`cd-photo-sortable-wrap${
                            isDragging ? ' cd-photo-sortable-wrap--dragging' : ''
                        }${canDrag ? ' cd-photo-sortable-wrap--draggable' : ''}`}
                        style={transform ? { transform } : undefined}
                        onPointerDown={(e) => handlePointerDown(e, index)}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                    >
                        {renderPhoto(photo, index, {
                            isDragging,
                            draggable: canDrag,
                            consumeClick,
                        })}
                    </div>
                );
            })}
        </div>
    );
}
