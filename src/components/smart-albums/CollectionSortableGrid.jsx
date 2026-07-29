import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CollectionSpreadThumb from './CollectionSpreadThumb';

const GRID_GAP_PX = 12;

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

function resolveOverIndex(deltaY, itemHeight, fromIndex, lockedIndices, length) {
    const displacement = Math.round(deltaY / itemHeight);
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
    const { fromIndex, overIndex, deltaY, itemHeight } = drag;

    if (index === fromIndex) {
        return `translate3d(0, ${deltaY}px, 0) scale(1.02)`;
    }

    if (lockedIndices.has(index)) return null;

    if (fromIndex < overIndex && index > fromIndex && index <= overIndex) {
        return `translate3d(0, ${-itemHeight}px, 0)`;
    }

    if (fromIndex > overIndex && index >= overIndex && index < fromIndex) {
        return `translate3d(0, ${itemHeight}px, 0)`;
    }

    return null;
}

export default function CollectionSortableGrid({
    items,
    lockedIndices,
    collectionThumbLayouts,
    collectionSpreadLabels,
    collectionThumbAspect,
    onReorder,
}) {
    const gridRef = useRef(null);
    const wrapRefs = useRef([]);
    const scrollRafRef = useRef(null);
    const scrollVelocityRef = useRef(0);
    const [drag, setDrag] = useState(null);
    const [optimisticIds, setOptimisticIds] = useState(null);

    const itemIds = useMemo(() => items.map((item) => item.id), [items]);

    useEffect(() => {
        if (!optimisticIds) return;
        const current = itemIds.join('|');
        const optimistic = optimisticIds.join('|');
        if (current === optimistic) {
            setOptimisticIds(null);
        }
    }, [itemIds, optimisticIds]);

    const displayItems = useMemo(() => {
        if (!optimisticIds) return items;
        const byId = new Map(items.map((item) => [item.id, item]));
        return optimisticIds.map((id) => byId.get(id)).filter(Boolean);
    }, [items, optimisticIds]);

    const metaByItemId = useMemo(() => {
        const map = new Map();
        items.forEach((item, index) => {
            map.set(item.id, {
                layout: collectionThumbLayouts[index],
                label: collectionSpreadLabels[index] || '',
            });
        });
        return map;
    }, [items, collectionThumbLayouts, collectionSpreadLabels]);

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
            const scroller = gridRef.current?.closest('.ae-panel');
            const velocity = scrollVelocityRef.current;
            if (!scroller || !velocity) return;

            const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
            const next = Math.min(max, Math.max(0, scroller.scrollTop + velocity));
            scroller.scrollTop = next;

            if ((next <= 0 && velocity < 0) || (next >= max && velocity > 0)) {
                scrollVelocityRef.current = 0;
                return;
            }

            scrollRafRef.current = requestAnimationFrame(tick);
        };

        scrollRafRef.current = requestAnimationFrame(tick);
    }, []);

    const updateAutoScroll = useCallback(
        (clientY) => {
            const scroller = gridRef.current?.closest('.ae-panel');
            if (!scroller) {
                stopAutoScroll();
                return;
            }

            const rect = scroller.getBoundingClientRect();
            const edgeZone = 56;
            const maxSpeed = 14;
            let velocity = 0;

            if (clientY < rect.top + edgeZone) {
                const t = Math.min(1, (rect.top + edgeZone - clientY) / edgeZone);
                velocity = -(3 + t * (maxSpeed - 3));
            } else if (clientY > rect.bottom - edgeZone) {
                const t = Math.min(1, (clientY - (rect.bottom - edgeZone)) / edgeZone);
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

    const handlePointerDown = useCallback(
        (e, index) => {
            if (lockedIndices.has(index)) return;
            if (e.button !== 0) return;

            const wrap = wrapRefs.current[index];
            if (!wrap) return;

            e.preventDefault();

            const rect = wrap.getBoundingClientRect();

            setDrag({
                fromIndex: index,
                overIndex: index,
                startY: e.clientY,
                deltaY: 0,
                itemHeight: rect.height + GRID_GAP_PX,
                pointerId: e.pointerId,
            });
        },
        [lockedIndices]
    );

    useEffect(() => {
        if (!drag) return undefined;

        const onMove = (e) => {
            if (e.pointerId !== drag.pointerId) return;

            const deltaY = e.clientY - drag.startY;
            const overIndex = resolveOverIndex(
                deltaY,
                drag.itemHeight,
                drag.fromIndex,
                lockedIndices,
                displayItems.length
            );

            setDrag((prev) =>
                prev
                    ? {
                          ...prev,
                          deltaY,
                          overIndex,
                      }
                    : null
            );

            updateAutoScroll(e.clientY);
        };

        const finish = (e) => {
            if (e.pointerId !== drag.pointerId) return;

            stopAutoScroll();
            document.body.style.userSelect = '';

            const deltaY = e.clientY - drag.startY;
            const overIndex = resolveOverIndex(
                deltaY,
                drag.itemHeight,
                drag.fromIndex,
                lockedIndices,
                displayItems.length
            );

            if (drag.fromIndex !== overIndex) {
                const ids = displayItems.map((item) => item.id);
                setOptimisticIds(reorderIds(ids, drag.fromIndex, overIndex));
                onReorder?.(drag.fromIndex, overIndex);
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
        displayItems,
        lockedIndices,
        onReorder,
        stopAutoScroll,
        updateAutoScroll,
    ]);

    useEffect(() => () => stopAutoScroll(), [stopAutoScroll]);

    return (
        <div
            ref={gridRef}
            className={`ae-collection-grid${drag ? ' ae-collection-grid--dragging' : ''}`}
            role="list"
        >
            {displayItems.map((item, index) => {
                const meta = metaByItemId.get(item.id) || { layout: null, label: '' };
                const spreadLabel = meta.label;
                const isLocked = lockedIndices.has(index);
                const spreadTitle = spreadLabel
                    ? spreadLabel === 'Cover' || spreadLabel === 'Back'
                        ? spreadLabel
                        : `Spread ${spreadLabel}`
                    : `Photo ${index + 1}`;
                const isDragging = drag?.fromIndex === index;
                const transform = getWrapTransform(index, drag, lockedIndices);

                return (
                    <div
                        key={item.id}
                        ref={(el) => {
                            wrapRefs.current[index] = el;
                        }}
                        className={`ae-collection-thumb-wrap${
                            isDragging ? ' ae-collection-thumb-wrap--dragging' : ''
                        }`}
                        role="listitem"
                        style={transform ? { transform } : undefined}
                        onPointerDown={(e) => handlePointerDown(e, index)}
                    >
                        <div
                            className={`ae-collection-thumb${isLocked ? ' ae-collection-thumb--locked' : ''}`}
                            style={{ aspectRatio: collectionThumbAspect }}
                            title={`${spreadTitle}. ${item.name || 'Photo'}${isLocked ? ' — fixed position' : ''}`}
                        >
                            <span
                                className={`ae-collection-order${
                                    spreadLabel.length > 2 ? ' ae-collection-order--wide' : ''
                                }`}
                                aria-hidden
                            >
                                {spreadLabel || index + 1}
                            </span>
                            <CollectionSpreadThumb layout={meta.layout} alt="" />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
