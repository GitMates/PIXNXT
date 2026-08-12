/**
 * Convert vertical mouse-wheel / trackpad scroll into sideways filmstrip movement.
 * Leave native horizontal gestures alone (two-finger swipe, shift+wheel, scrollbar)
 * so laptop trackpad inertia keeps working.
 */
export function bindHorizontalWheelScroll(element, { isPaused } = {}) {
    if (!element) return () => {};

    const onWheel = (event) => {
        if (isPaused?.()) return;
        if (event.ctrlKey || event.metaKey) return;

        const maxScroll = element.scrollWidth - element.clientWidth;
        if (maxScroll <= 1) return;

        let dx = event.deltaX;
        let dy = event.deltaY;
        if (event.deltaMode === 1) {
            dx *= 16;
            dy *= 16;
        } else if (event.deltaMode === 2) {
            dx *= element.clientWidth;
            dy *= element.clientHeight;
        }

        // Trackpad swipe / shift+wheel already scroll overflow-x natively.
        if (event.shiftKey || Math.abs(dx) > Math.abs(dy)) return;
        if (!dy) return;

        const next = element.scrollLeft + dy;
        const clamped = Math.max(0, Math.min(maxScroll, next));
        if (clamped === element.scrollLeft) return;

        event.preventDefault();
        element.scrollLeft = clamped;
    };

    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
}
