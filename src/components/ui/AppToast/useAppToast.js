import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * @param {number} defaultDuration ms before auto-dismiss (0 = no auto-dismiss)
 */
export function useAppToast(defaultDuration = 4000) {
    const [toast, setToast] = useState(null);
    const timerRef = useRef(null);

    const clearToast = useCallback(() => {
        if (timerRef.current) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setToast(null);
    }, []);

    const showToast = useCallback(
        (message, options = {}) => {
            const variant = options.variant ?? 'success';
            const duration = options.duration ?? defaultDuration;

            if (timerRef.current) {
                window.clearTimeout(timerRef.current);
                timerRef.current = null;
            }

            setToast({ message, variant, id: Date.now() });

            if (duration > 0) {
                timerRef.current = window.setTimeout(() => {
                    setToast(null);
                    timerRef.current = null;
                }, duration);
            }
        },
        [defaultDuration]
    );

    useEffect(
        () => () => {
            if (timerRef.current) window.clearTimeout(timerRef.current);
        },
        []
    );

    return { toast, showToast, clearToast };
}
