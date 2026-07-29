import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

function shiftTransform(fromIndex, toIndex, cols, cellW, cellH, gapX, gapY) {
    const fromRow = Math.floor(fromIndex / cols);
    const fromCol = fromIndex % cols;
    const toRow = Math.floor(toIndex / cols);
    const toCol = toIndex % cols;
    const dx = (toCol - fromCol) * (cellW + gapX);
    const dy = (toRow - fromRow) * (cellH + gapY);
    if (!dx && !dy) return null;
    return `translate3d(${dx}px, ${dy}px, 0)`;
}

function getWrapTransform(index, drag, lockedIndices) {
    if (!drag) return null;
    const { fromIndex, overIndex, deltaX, deltaY, cellW, cellH, gapX, gapY, cols } = drag;

    if (index === fromIndex) {
        return `translate3d(${deltaX}px, ${deltaY}px, 0) scale(1.03)`;
    }

    if (lockedIndices.has(index)) return null;

    if (fromIndex < overIndex && index > fromIndex && index <= overIndex) {
        return shiftTransform(index, index - 1, cols, cellW, cellH, gapX, gapY);
    }

    if (fromIndex > overIndex && index >= overIndex && index < fromIndex) {
        return shiftTransform(index, index + 1, cols, cellW, cellH, gapX, gapY);
    }

    return null;
}

function resolveOverIndex(clientX, clientY, wrapRefs, count, lockedIndices, fallback) {
    for (let i = 0; i < count; i += 1) {
        const el = wrapRefs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
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
        const el = wrapRefs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
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

const DEFAULT_METRICS = { cols: 4, cellW: 268, cellH: 128, gapX: 24, gapY: 28 };

function readGridMetrics(gridRef, wrapRefs) {
    const grid = gridRef.current;
    if (!grid) return DEFAULT_METRICS;

    const style = window.getComputedStyle(grid);
    const cols = Math.max(
        1,
        style.gridTemplateColumns.split(' ').filter((part) => part.trim()).length
    );
    const gapX = parseFloat(style.columnGap) || 24;
    const gapY = parseFloat(style.rowGap) || 28;
    const first = wrapRefs.current.find(Boolean);
    if (!first) {
        return { cols, cellW: 268, cellH: 128, gapX, gapY };
    }

    const rect = first.getBoundingClientRect();
    return {
        cols,
        cellW: rect.width,
        cellH: rect.height,
        gapX,
        gapY,
    };
}

export default function OverviewSortableGrid({
    itemCount,
    isDraggable,
    onReorder,
    disabled = false,
    className = '',
    renderItem,
}) {
    const gridRef = useRef(null);
    const wrapRefs = useRef([]);
    const [drag, setDrag] = useState(null);

    const lockedIndices = useMemo(() => {
        const locked = new Set();
        for (let i = 0; i < itemCount; i += 1) {
            if (!isDraggable?.(i)) locked.add(i);
        }
        return locked;
    }, [itemCount, isDraggable]);

    const handlePointerDown = useCallback(
        (e, index) => {
            if (disabled) return;
            if (!isDraggable?.(index)) return;
            if (e.button !== 0) return;

            const wrap = wrapRefs.current[index];
            if (!wrap) return;

            e.preventDefault();

            const gridMetrics = readGridMetrics(gridRef, wrapRefs);

            setDrag({
                fromIndex: index,
                overIndex: index,
                startX: e.clientX,
                startY: e.clientY,
                deltaX: 0,
                deltaY: 0,
                pointerId: e.pointerId,
                ...gridMetrics,
            });
        },
        [disabled, isDraggable]
    );

    useEffect(() => {
        if (!drag) return undefined;

        const onMove = (e) => {
            if (e.pointerId !== drag.pointerId) return;

            const deltaX = e.clientX - drag.startX;
            const deltaY = e.clientY - drag.startY;
            const overIndex = resolveOverIndex(
                e.clientX,
                e.clientY,
                wrapRefs,
                itemCount,
                lockedIndices,
                drag.fromIndex
            );

            setDrag((prev) => {
                if (!prev) return null;
                if (
                    prev.deltaX === deltaX &&
                    prev.deltaY === deltaY &&
                    prev.overIndex === overIndex
                ) {
                    return prev;
                }
                return {
                    ...prev,
                    deltaX,
                    deltaY,
                    overIndex,
                };
            });
        };

        const finish = (e) => {
            if (e.pointerId !== drag.pointerId) return;

            document.body.style.userSelect = '';

            const deltaX = e.clientX - drag.startX;
            const deltaY = e.clientY - drag.startY;
            const moved = Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4;
            const overIndex = resolveOverIndex(
                e.clientX,
                e.clientY,
                wrapRefs,
                itemCount,
                lockedIndices,
                drag.fromIndex
            );

            if (moved && drag.fromIndex !== overIndex) {
                onReorder?.(drag.fromIndex, overIndex);
            }

            setDrag(null);
        };

        document.body.style.userSelect = 'none';
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', finish);
        window.addEventListener('pointercancel', finish);

        return () => {
            document.body.style.userSelect = '';
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', finish);
            window.removeEventListener('pointercancel', finish);
        };
    }, [drag, itemCount, lockedIndices, onReorder]);

    const dragging = Boolean(drag);

    return (
        <div
            ref={gridRef}
            className={`${className}${dragging ? ' ab-overview-grid--dragging' : ''}`}
        >
            {Array.from({ length: itemCount }, (_, index) => {
                const isDragging = drag?.fromIndex === index;
                const transform = getWrapTransform(index, drag, lockedIndices);
                return (
                    <div
                        key={`overview-slot-${index}`}
                        ref={(el) => {
                            wrapRefs.current[index] = el;
                        }}
                        className={`ab-overview-sortable-wrap${
                            isDragging ? ' ab-overview-sortable-wrap--dragging' : ''
                        }`}
                        style={transform ? { transform } : undefined}
                        onPointerDown={(e) => handlePointerDown(e, index)}
                    >
                        {renderItem(index, {
                            isDragging,
                            draggable: isDraggable?.(index) && !disabled,
                        })}
                    </div>
                );
            })}
        </div>
    );
}
