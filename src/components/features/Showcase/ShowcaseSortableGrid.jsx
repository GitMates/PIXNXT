import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function reorderIds(ids, fromIndex, toIndex) {
  const next = ids.slice();
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
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

function getWrapTransform(index, drag) {
  if (!drag) return null;
  const { fromIndex, overIndex, deltaX, deltaY, layoutRects, scrollDelta } = drag;
  const rects = adjustRectsForScroll(layoutRects, scrollDelta);

  if (index === fromIndex) {
    return `translate3d(${deltaX}px, ${deltaY}px, 0) scale(1.02)`;
  }

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

function resolveOverIndex(clientX, clientY, layoutRects, count, fallback) {
  for (let i = 0; i < count; i += 1) {
    const rect = layoutRects[i];
    if (!rect) continue;
    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      return i;
    }
  }

  let best = fallback;
  let bestDist = Infinity;
  for (let i = 0; i < count; i += 1) {
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

const INTERACTIVE_SELECTOR =
  '.sc-tile__more, .sc-menu, .sc-tile__link, .sc-btn, button, a, input, label, textarea';

function getScrollParent(gridEl) {
  return gridEl?.closest('.sc-page') || gridEl?.closest('[data-sc-scroll]') || null;
}

/**
 * Pointer-based Showcase card reorder — same motion as delivery photo drag.
 */
export default function ShowcaseSortableGrid({
  items,
  className = '',
  disabled = false,
  onReorder,
  renderItem,
}) {
  const gridRef = useRef(null);
  const wrapRefs = useRef([]);
  const scrollRafRef = useRef(null);
  const scrollVelocityRef = useRef(0);
  const dragRef = useRef(null);
  const displayItemsRef = useRef(items);
  const onReorderRef = useRef(onReorder);
  const dragMovedRef = useRef(false);
  const suppressClickUntilRef = useRef(0);
  const [dragTick, setDragTick] = useState(0);
  const [optimisticIds, setOptimisticIds] = useState(null);

  useEffect(() => {
    onReorderRef.current = onReorder;
  }, [onReorder]);

  useEffect(() => {
    if (!optimisticIds) return;
    const currentIds = items.map((item) => String(item.id)).join('|');
    if (currentIds === optimisticIds.join('|')) {
      setOptimisticIds(null);
    }
  }, [items, optimisticIds]);

  const displayItems = useMemo(() => {
    if (!optimisticIds) return items;
    const byId = new Map(items.map((item) => [String(item.id), item]));
    return optimisticIds.map((id) => byId.get(String(id))).filter(Boolean);
  }, [items, optimisticIds]);

  useEffect(() => {
    displayItemsRef.current = displayItems;
  }, [displayItems]);

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
      const scroller = getScrollParent(gridRef.current);
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
  }, []);

  const updateAutoScroll = useCallback(
    (clientY) => {
      const scroller = getScrollParent(gridRef.current);
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
    [runAutoScroll, stopAutoScroll]
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

      const display = displayItemsRef.current;
      const count = display.length;
      const layoutRects = adjustRectsForScroll(drag.layoutRects, drag.scrollDelta);
      const overIndex = resolveOverIndex(
        e.clientX,
        e.clientY,
        layoutRects,
        count,
        drag.fromIndex
      );

      const moved = dragMovedRef.current;
      if (moved && drag.fromIndex !== overIndex) {
        const ids = display.map((item) => String(item.id));
        const nextIds = reorderIds(ids, drag.fromIndex, overIndex);
        setOptimisticIds(nextIds);
        onReorderRef.current?.(drag.fromIndex, overIndex, nextIds);
      }

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

      const scroller = getScrollParent(gridRef.current);
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
        displayItemsRef.current.length,
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
  }, [bumpDrag, finishDrag, updateAutoScroll]);

  const handlePointerDown = useCallback(
    (e, index) => {
      if (disabled) return;
      if (e.button !== 0) return;
      if (e.target.closest(INTERACTIVE_SELECTOR)) return;

      const wrap = wrapRefs.current[index];
      if (!wrap) return;

      dragMovedRef.current = false;

      const scroller = getScrollParent(gridRef.current);
      const count = displayItems.length;

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
    },
    [disabled, displayItems]
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
      ref={gridRef}
      className={`${className}${dragging ? ' sc-grid--dragging' : ''}`}
    >
      {displayItems.map((item, index) => {
        const isDragging = Boolean(drag?.activated && drag.fromIndex === index);
        const transform = drag?.activated ? getWrapTransform(index, drag) : null;
        return (
          <div
            key={item.id}
            ref={(el) => {
              wrapRefs.current[index] = el;
            }}
            className={`sc-sortable-wrap${isDragging ? ' sc-sortable-wrap--dragging' : ''}${
              disabled ? '' : ' sc-sortable-wrap--draggable'
            }`}
            style={transform ? { transform } : undefined}
            onPointerDown={(e) => handlePointerDown(e, index)}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {renderItem(item, index, {
              isDragging,
              consumeClick,
            })}
          </div>
        );
      })}
    </div>
  );
}
