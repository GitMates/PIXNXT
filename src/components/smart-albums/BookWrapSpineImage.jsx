import React, { useEffect, useRef, useState } from 'react';
import {
    bookWrapCoverBackgroundStyle,
    bookWrapCoverImageStyle,
    isSpineStretchWrapSide,
} from './bookWrapSpine';
import { renderWrapSegmentDataUrl } from './bookWrapSegment';

/**
 * One segment of a book-wrap image: back cover, spine, or front cover.
 */
export default function BookWrapSpineImage({
    src,
    side,
    layout,
    transform,
    className = '',
    panoramic = null,
    onError,
}) {
    const hostRef = useRef(null);
    const [segmentUrl, setSegmentUrl] = useState(null);
    const [canvasFailed, setCanvasFailed] = useState(false);
    const useCanvasSlice = Boolean(
        layout?.hasSpine &&
            side &&
            src &&
            !canvasFailed &&
            !String(src).startsWith('blob:') &&
            !String(src).startsWith('data:')
    );

    useEffect(() => {
        // Drop stale canvas slices so the background/CSS crop shows while decoding.
        setSegmentUrl(null);
        setCanvasFailed(false);

        if (
            !layout?.hasSpine ||
            !side ||
            !src ||
            String(src).startsWith('blob:') ||
            String(src).startsWith('data:')
        ) {
            return undefined;
        }

        const host =
            hostRef.current?.closest('.ab-cover-edit-spine-panel') ||
            hostRef.current?.closest('.ab-cover-edit-spine-gap') ||
            hostRef.current?.parentElement ||
            hostRef.current;
        if (!host) return undefined;

        let cancelled = false;
        let frame = 0;

        const paint = () => {
            const width = host.clientWidth;
            const height = host.clientHeight;
            if (width < 1 || height < 1) return;
            const renderW = Math.max(4, Math.round(width));
            const renderH = Math.max(4, Math.round(height));
            renderWrapSegmentDataUrl(src, layout, side, transform, renderW, renderH)
                .then((url) => {
                    if (cancelled) return;
                    if (url) {
                        setSegmentUrl(url);
                        setCanvasFailed(false);
                    } else {
                        setCanvasFailed(true);
                    }
                })
                .catch(() => {
                    if (!cancelled) setCanvasFailed(true);
                });
        };

        const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(paint);
        };

        schedule();
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
        ro?.observe(host);
        window.addEventListener('resize', schedule);

        return () => {
            cancelled = true;
            cancelAnimationFrame(frame);
            ro?.disconnect();
            window.removeEventListener('resize', schedule);
        };
    }, [
        src,
        side,
        transform,
        layout?.spineStartFraction,
        layout?.spineEndFraction,
        layout?.spineDisplayStartFraction,
        layout?.spineDisplayEndFraction,
        layout?.coverSpineStartFraction,
        layout?.coverSpineEndFraction,
        layout?.defaultSpineStartFraction,
        layout?.defaultSpineEndFraction,
        layout?.wrapAspect,
        layout?.hasSpine,
    ]);

    if (!src) return null;

    const sideClass = isSpineStretchWrapSide(side)
        ? `ab-book-wrap-spine-img${
              side === 'spine-gap-before' || side === 'spine-gap-after'
                  ? ' ab-book-wrap-spine-gap-img'
                  : ''
          }`
        : `ab-book-wrap-cover-img ab-book-wrap-cover-img--${side}`;

    if (useCanvasSlice && segmentUrl) {
        return (
            <img
                ref={hostRef}
                src={segmentUrl}
                alt=""
                className={`${sideClass} ab-book-wrap-segment-img${className ? ` ${className}` : ''}`}
                draggable={false}
                onError={onError}
                style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    objectFit: 'fill',
                }}
            />
        );
    }

    // Pre-canvas / canvas-failed: prefer CSS strip crop with the direct asset URL,
    // then plain <img> crop — never depend on /api/r2-media for display.
    if (layout?.hasSpine && side) {
        const bg = bookWrapCoverBackgroundStyle(src, layout, side, transform);
        if (bg) {
            return (
                <div
                    ref={hostRef}
                    className={`ab-book-wrap-segment-fill${className ? ` ${className}` : ''}`}
                    style={{
                        ...bg,
                        display: 'block',
                        width: '100%',
                        height: '100%',
                    }}
                    aria-hidden
                />
            );
        }
    }

    const style = bookWrapCoverImageStyle(layout, side, transform, { panoramic });
    return (
        <img
            ref={hostRef}
            src={src}
            alt=""
            className={`${sideClass}${className ? ` ${className}` : ''}`}
            draggable={false}
            onError={onError}
            style={style}
        />
    );
}
