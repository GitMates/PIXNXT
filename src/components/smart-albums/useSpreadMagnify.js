import { useCallback, useEffect, useRef, useState } from 'react';
import { closeAlbumPinPopovers } from './albumPinPopoverEvents';

const MAGNIFY_MIN = 1;
const MAGNIFY_MAX = 3;
const MAGNIFY_STEP = 0.25;

function clampPan(pan, scale, width, height) {
    if (scale <= 1 || !width || !height) {
        return { x: 0, y: 0 };
    }
    const maxX = (width * (scale - 1)) / 2;
    const maxY = (height * (scale - 1)) / 2;
    return {
        x: Math.max(-maxX, Math.min(maxX, pan.x)),
        y: Math.max(-maxY, Math.min(maxY, pan.y)),
    };
}

export default function useSpreadMagnify({ spreadKey, viewportWidth = 0, viewportHeight = 0 }) {
    const [active, setActive] = useState(false);
    const [scale, setScale] = useState(MAGNIFY_MIN);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const dragRef = useRef(null);

    const reset = useCallback(() => {
        setActive(false);
        setScale(MAGNIFY_MIN);
        setPan({ x: 0, y: 0 });
        setDragging(false);
        dragRef.current = null;
    }, []);

    useEffect(() => {
        reset();
    }, [spreadKey, reset]);

    const toggleActive = useCallback(() => {
        setActive((prev) => {
            const next = !prev;
            if (next) {
                closeAlbumPinPopovers();
            } else {
                setScale(MAGNIFY_MIN);
                setPan({ x: 0, y: 0 });
            }
            return next;
        });
    }, []);

    const zoomIn = useCallback(() => {
        closeAlbumPinPopovers();
        setActive(true);
        setScale((prev) => Math.min(MAGNIFY_MAX, Number((prev + MAGNIFY_STEP).toFixed(2))));
    }, []);

    const zoomOut = useCallback(() => {
        setScale((prev) => {
            const next = Math.max(MAGNIFY_MIN, Number((prev - MAGNIFY_STEP).toFixed(2)));
            if (next <= MAGNIFY_MIN) {
                setPan({ x: 0, y: 0 });
            }
            return next;
        });
    }, []);

    useEffect(() => {
        if (!active || scale <= MAGNIFY_MIN) return;
        setPan((prev) => clampPan(prev, scale, viewportWidth, viewportHeight));
    }, [active, scale, viewportWidth, viewportHeight]);

    const handlePointerDown = useCallback(
        (e) => {
            if (!active || scale <= MAGNIFY_MIN) return;
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            setDragging(true);
            dragRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                basePan: { ...pan },
            };

            const onMove = (ev) => {
                const drag = dragRef.current;
                if (!drag) return;
                const nextPan = {
                    x: drag.basePan.x + (ev.clientX - drag.startX),
                    y: drag.basePan.y + (ev.clientY - drag.startY),
                };
                setPan(clampPan(nextPan, scale, viewportWidth, viewportHeight));
            };

            const onUp = () => {
                dragRef.current = null;
                setDragging(false);
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                window.removeEventListener('pointercancel', onUp);
            };

            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
            window.addEventListener('pointercancel', onUp);
        },
        [active, pan, scale, viewportHeight, viewportWidth]
    );

    const contentStyle =
        active && scale > MAGNIFY_MIN
            ? {
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              }
            : undefined;

    return {
        active,
        scale,
        dragging,
        canZoomIn: scale < MAGNIFY_MAX,
        canZoomOut: scale > MAGNIFY_MIN,
        toggleActive,
        zoomIn,
        zoomOut,
        reset,
        handlePointerDown,
        contentStyle,
        viewportClassName: `ab-spread-magnify-viewport${
            active ? ' ab-spread-magnify-viewport--active' : ''
        }${dragging ? ' ab-spread-magnify-viewport--dragging' : ''}`,
        contentClassName: 'ab-spread-magnify-content',
    };
}
