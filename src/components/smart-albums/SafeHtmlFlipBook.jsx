import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { releasePageFlipDom } from './pageFlipSafe';

/**
 * HTMLFlipBook wrapper that returns page-flip's reparented nodes to React's
 * tree before unmount. Prevents "Node cannot be found in the current page"
 * without a blank tear-down frame (no flipAlive delay).
 */
const SafeHtmlFlipBook = forwardRef(function SafeHtmlFlipBook(props, ref) {
    const innerRef = useRef(null);

    useImperativeHandle(ref, () => innerRef.current, []);

    useEffect(() => {
        return () => {
            releasePageFlipDom(innerRef.current?.pageFlip?.());
        };
    }, []);

    return <HTMLFlipBook ref={innerRef} {...props} />;
});

export default SafeHtmlFlipBook;
