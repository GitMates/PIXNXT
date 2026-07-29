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
}) {
    const hostRef = useRef(null);
    const [segmentUrl, setSegmentUrl] = useState(null);
    const useCanvasSlice = Boolean(
        layout?.hasSpine &&
            side &&
            src &&
            !String(src).startsWith('blob:') &&
            !String(src).startsWith('data:')
    );

    useEffect(() => {
        // Drop stale canvas slices so the background/CSS crop shows while decoding.
        setSegmentUrl(null);

        if (!useCanvasSlice) {
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
            renderWrapSegmentDataUrl(src, layout, side, transform, renderW, renderH).then((url) => {
                if (!cancelled && url) setSegmentUrl(url);
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
        useCanvasSlice,
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

    if (useCanvasSlice) {
        // Canvas slice ready — use it for all sides (including spine).
        if (segmentUrl) {
            return (
                <img
                    ref={hostRef}
                    src={segmentUrl}
                    alt=""
                    className={`${sideClass} ab-book-wrap-segment-img${className ? ` ${className}` : ''}`}
                    draggable={false}
                    style={{
                        display: 'block',
                        width: '100%',
                        height: '100%',
                        objectFit: 'fill',
                    }}
                />
            );
        }

        // Pre-canvas fallback: background-image strip crop (works for all sides).
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

        // Last resort: img with CSS crop.
        const style = bookWrapCoverImageStyle(layout, side, transform, { panoramic });
        return (
            <img
                ref={hostRef}
                src={src}
                alt=""
                className={`${sideClass} ab-book-wrap-segment-img${
                    className ? ` ${className}` : ''
                }`}
                draggable={false}
                style={style}
            />
        );
    }

    const style = bookWrapCoverImageStyle(layout, side, transform, { panoramic });
    return (
        <img
            ref={hostRef}
            src={src}
            alt=""
            className={`${sideClass}${className ? ` ${className}` : ''}`}
            draggable={false}
            style={style}
        />
    );
}
