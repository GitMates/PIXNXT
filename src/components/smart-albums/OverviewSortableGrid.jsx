import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

/**
 * Resolve drop target from pointer delta vs cell size — NOT getBoundingClientRect
 * on transformed wraps. Hit-testing the dragged (translated) node always contains
 * the cursor, so forward drags stuck on fromIndex (reload/reorder "broken drag").
 */
function resolveOverIndex(deltaX, deltaY, fromIndex, cols, cellW, cellH, gapX, gapY, lockedIndices, length) {
    const stepX = Math.max(1, cellW + gapX);
    const stepY = Math.max(1, cellH + gapY);
    const fromRow = Math.floor(fromIndex / cols);
    const fromCol = fromIndex % cols;
    const colDisp = Math.round(deltaX / stepX);
    const rowDisp = Math.round(deltaY / stepY);
    const rows = Math.max(1, Math.ceil(length / cols));

    let overCol = Math.max(0, Math.min(cols - 1, fromCol + colDisp));
    let overRow = Math.max(0, Math.min(rows - 1, fromRow + rowDisp));
    let overIndex = overRow * cols + overCol;
    if (overIndex >= length) overIndex = length - 1;

    let min = 0;
    let max = length - 1;
    while (min < length && lockedIndices.has(min)) min += 1;
    while (max >= 0 && lockedIndices.has(max)) max -= 1;
    if (min > max) return fromIndex;

    overIndex = Math.max(min, Math.min(max, overIndex));
    return nearestDraggableIndex(overIndex, lockedIndices, length);
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

    // Use offsetWidth/Height so metrics are not skewed by an active drag transform.
    return {
        cols,
        cellW: first.offsetWidth || 268,
        cellH: first.offsetHeight || 128,
        gapX,
        gapY,
    };
}

export default function OverviewSortableGrid({
    itemCount,
    isDraggable,
    onReorder,
    onItemActivate,
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
            if (e.button !== 0) return;

            // Locked thumbs: click-to-select only (no drag session).
            if (!isDraggable?.(index)) {
                onItemActivate?.(index);
                return;
            }

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
                moved: false,
                pointerId: e.pointerId,
                ...gridMetrics,
            });
        },
        [disabled, isDraggable, onItemActivate]
    );

    useEffect(() => {
        if (!drag) return undefined;

        const onMove = (e) => {
            if (e.pointerId !== drag.pointerId) return;

            const deltaX = e.clientX - drag.startX;
            const deltaY = e.clientY - drag.startY;
            const moved =
                drag.moved || Math.abs(deltaX) > CLICK_MOVE_PX || Math.abs(deltaY) > CLICK_MOVE_PX;
            const overIndex = resolveOverIndex(
                deltaX,
                deltaY,
                drag.fromIndex,
                drag.cols,
                drag.cellW,
                drag.cellH,
                drag.gapX,
                drag.gapY,
                lockedIndices,
                itemCount
            );

            setDrag((prev) => {
                if (!prev) return null;
                if (
                    prev.deltaX === deltaX &&
                    prev.deltaY === deltaY &&
                    prev.overIndex === overIndex &&
                    prev.moved === moved
                ) {
                    return prev;
                }
                return {
                    ...prev,
                    deltaX,
                    deltaY,
                    overIndex,
                    moved,
                };
            });
        };

        const finish = (e) => {
            if (e.pointerId !== drag.pointerId) return;

            document.body.style.userSelect = '';

            const deltaX = e.clientX - drag.startX;
            const deltaY = e.clientY - drag.startY;
            const moved =
                drag.moved || Math.abs(deltaX) > CLICK_MOVE_PX || Math.abs(deltaY) > CLICK_MOVE_PX;
            const overIndex = resolveOverIndex(
                deltaX,
                deltaY,
                drag.fromIndex,
                drag.cols,
                drag.cellW,
                drag.cellH,
                drag.gapX,
                drag.gapY,
                lockedIndices,
                itemCount
            );

            if (moved && drag.fromIndex !== overIndex) {
                onReorder?.(drag.fromIndex, overIndex);
            } else if (!moved) {
                // preventDefault on pointerdown blocks the nested button click —
                // activate selection explicitly (same pattern as filmstrip).
                onItemActivate?.(drag.fromIndex);
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
    }, [drag, itemCount, lockedIndices, onReorder, onItemActivate]);

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
