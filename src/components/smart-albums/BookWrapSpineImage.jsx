import React from 'react';
import { bookWrapCoverImageStyle } from './bookWrapSpine';

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
    if (!src) return null;
    const style = bookWrapCoverImageStyle(layout, side, transform, { panoramic });
    const sideClass =
        side === 'spine'
            ? 'ab-book-wrap-spine-img'
            : `ab-book-wrap-cover-img ab-book-wrap-cover-img--${side}`;
    return (
        <img
            src={src}
            alt=""
            className={`${sideClass}${className ? ` ${className}` : ''}`}
            draggable={false}
            style={style}
        />
    );
}
