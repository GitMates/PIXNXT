/** Card/list leave animation duration (matches DeliveryDeleteOverlay.css). */
export const OPTIMISTIC_LEAVE_MS = 400;

/**
 * Run an async delete after a short leave animation.
 * @returns {{ cancelTimer: () => void }}
 */
export function runOptimisticDelete({ onLeave, onRemove, onError, task }) {
  onLeave?.();

  let cancelled = false;
  const timer = window.setTimeout(() => {
    if (!cancelled) onRemove?.();
  }, OPTIMISTIC_LEAVE_MS);

  void Promise.resolve()
    .then(() => task())
    .catch((err) => {
      cancelled = true;
      window.clearTimeout(timer);
      onError?.(err);
    });

  return {
    cancelTimer: () => {
      cancelled = true;
      window.clearTimeout(timer);
    },
  };
}
