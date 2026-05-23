import { useCallback, useEffect, useRef, useState } from 'react';
import { getSpreadPages } from './albumSpreadUtils';

export const FLIP_DURATION_MS = 800;

export function useAlbumPageFlip({ currentSpread, totalSpreads, setCurrentSpread, onPageChange }) {
    const [flip, setFlip] = useState(null);
    const timerRef = useRef(null);
    const finishingRef = useRef(false);

    useEffect(() => () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    }, []);

    const isAnimating = Boolean(flip);

    const finishFlip = useCallback(
        (toSpread) => {
            if (finishingRef.current) return;
            finishingRef.current = true;
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            setCurrentSpread(toSpread);
            onPageChange?.(toSpread * 2);
            setFlip(null);
            finishingRef.current = false;
        },
        [onPageChange, setCurrentSpread]
    );

    const startFlip = useCallback(
        (direction) => {
            if (isAnimating) return;

            const toSpread = direction === 'next' ? currentSpread + 1 : currentSpread - 1;
            if (toSpread < 0 || toSpread >= totalSpreads) return;

            const fromPages = getSpreadPages(currentSpread);
            const toPages = getSpreadPages(toSpread);

            finishingRef.current = false;
            setFlip({
                direction,
                fromSpread: currentSpread,
                toSpread,
                fromPages,
                toPages,
            });

            timerRef.current = setTimeout(() => finishFlip(toSpread), FLIP_DURATION_MS + 80);
        },
        [currentSpread, finishFlip, isAnimating, totalSpreads]
    );

    const completeFlipFromAnimation = useCallback(() => {
        if (!flip) return;
        finishFlip(flip.toSpread);
    }, [flip, finishFlip]);

    return { flip, isAnimating, startFlip, completeFlipFromAnimation };
}
