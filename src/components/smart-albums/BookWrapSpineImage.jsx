import React, { useEffect, useRef, useState } from 'react';
import { bookWrapCoverImageStyle } from './bookWrapSpine';
import { renderWrapSegmentDataUrl } from './bookWrapSegment';

/**
 * One segment of a book-wrap image: back cover, spine, or front cover.
 * Uses canvas slice rendering when layout has spine bounds; falls back to CSS crop.
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
    const useCanvasSlice = Boolean(layout?.hasSpine && side && src);

    useEffect(() => {
        if (!useCanvasSlice) {
            setSegmentUrl(null);
            return undefined;
        }

        const host = hostRef.current?.parentElement || hostRef.current;
        if (!host) return undefined;

        let cancelled = false;
        let frame = 0;

        const paint = () => {
            const width = host.clientWidth;
            const height = host.clientHeight;
            if (width < 2 || height < 2) return;
            renderWrapSegmentDataUrl(src, layout, side, transform, width, height).then((url) => {
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
        layout?.wrapAspect,
        layout?.hasSpine,
    ]);

    if (!src) return null;

    if (useCanvasSlice) {
        const sideClass =
            side === 'spine'
                ? 'ab-book-wrap-spine-img'
                : `ab-book-wrap-cover-img ab-book-wrap-cover-img--${side}`;
        return (
            <img
                ref={hostRef}
                src={segmentUrl || undefined}
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

    const style = bookWrapCoverImageStyle(layout, side, transform, { panoramic });
    const sideClass =
        side === 'spine'
            ? 'ab-book-wrap-spine-img'
            : `ab-book-wrap-cover-img ab-book-wrap-cover-img--${side}`;
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
