import { useLayoutEffect, useRef, useState } from 'react';
import {
    BOOK_PAGE_HEIGHT_MIN,
    BOOK_STAGE_READY_MIN_PX,
    getBookDimensions,
    getFallbackBookDimensions,
} from './albumBookDimensions';

function isValidLayoutDims(next) {
    return Boolean(next?.width > 0 && next?.height >= BOOK_PAGE_HEIGHT_MIN);
}

/**
 * Same page sizing as AlbumBook — keeps 3D cover and 2D spread aligned.
 * Pins the last good measurement so cover remounts after page turns do not shrink.
 */
export default function useAlbumBookLayoutDims(stageRef, rootRef, gridSize, structuralKey = '') {
    const [dims, setDims] = useState(null);
    const [stableDims, setStableDims] = useState(null);
    const pinnedDimsRef = useRef(null);
    const dimsRafRef = useRef(null);
    const pendingCommitRef = useRef(null);

    const commitVerified = (verified) => {
        if (!isValidLayoutDims(verified)) return;
        const pinned = pinnedDimsRef.current;
        if (
            pinned &&
            pinned.width === verified.width &&
            pinned.height === verified.height
        ) {
            return;
        }
        pinnedDimsRef.current = verified;
        setDims(verified);
        setStableDims(verified);
    };

    useLayoutEffect(() => {
        const stage = stageRef.current;
        if (!stage) return undefined;

        let measureAttempts = 0;
        const maxAttempts = 64;

        const commitDims = (next) => {
            if (pendingCommitRef.current != null) {
                cancelAnimationFrame(pendingCommitRef.current);
            }
            pendingCommitRef.current = requestAnimationFrame(() => {
                pendingCommitRef.current = requestAnimationFrame(() => {
                    pendingCommitRef.current = null;
                    const stageEl = stageRef.current;
                    if (!stageEl || stageEl.clientHeight < BOOK_STAGE_READY_MIN_PX) return;
                    const verified = getBookDimensions(stageEl, gridSize) ?? next;
                    commitVerified(verified);
                });
            });
        };

        const update = () => {
            if (dimsRafRef.current != null) cancelAnimationFrame(dimsRafRef.current);
            dimsRafRef.current = requestAnimationFrame(() => {
                dimsRafRef.current = null;
                const stageEl = stageRef.current;
                if (!stageEl) return;
                const next = getBookDimensions(stageEl, gridSize);
                if (!next) {
                    measureAttempts += 1;
                    if (measureAttempts >= maxAttempts) {
                        const fallback = getFallbackBookDimensions(rootRef.current, gridSize);
                        if (fallback) commitDims(fallback);
                    } else {
                        dimsRafRef.current = requestAnimationFrame(update);
                    }
                    return;
                }
                measureAttempts = 0;
                commitDims(next);
            });
        };

        update();
        const ro = new ResizeObserver(() => {
            measureAttempts = 0;
            update();
        });
        ro.observe(stage);
        if (rootRef.current) ro.observe(rootRef.current);
        window.addEventListener('resize', update);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', update);
            if (dimsRafRef.current != null) cancelAnimationFrame(dimsRafRef.current);
            if (pendingCommitRef.current != null) {
                cancelAnimationFrame(pendingCommitRef.current);
            }
        };
    }, [gridSize, structuralKey, rootRef, stageRef]);

    return pinnedDimsRef.current ?? stableDims ?? dims;
}
