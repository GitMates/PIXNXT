import { useCallback, useEffect, useRef, useState } from 'react';
import { getSpreadPages } from './albumSpreadUtils';

export const FLIP_DURATION_MS = 720;

/**
 * Spread flip state and timing. Animation markup lives in AlbumPageFlipAnimation.
 */
export function useAlbumPageFlip({ currentSpread, totalSpreads, setCurrentSpread, onPageChange }) {
    const [flip, setFlip] = useState(null);
    const timerRef = useRef(null);

    useEffect(() => () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    }, []);

    const isAnimating = Boolean(flip);

    const finishFlip = useCallback(
        (toSpread) => {
            setCurrentSpread(toSpread);
            onPageChange?.(toSpread * 2);
            setFlip(null);
        },
        [onPageChange, setCurrentSpread]
    );

    const startFlip = useCallback(
        (direction) => {
            if (isAnimating) return;

            const toSpread = direction === 'next' ? currentSpread + 1 : currentSpread - 1;
            if (toSpread < 0 || toSpread >= totalSpreads) return;

            const fromSpread = currentSpread;
            const fromPages = getSpreadPages(fromSpread);
            const toPages = getSpreadPages(toSpread);

            setFlip({ direction, fromSpread, toSpread, fromPages, toPages });

            timerRef.current = setTimeout(() => finishFlip(toSpread), FLIP_DURATION_MS);
        },
        [currentSpread, finishFlip, isAnimating, totalSpreads]
    );

    return { flip, isAnimating, startFlip };
}
