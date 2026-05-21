/** Mild, slow scroll for gallery cover ↔ grid navigation (ms). */
export const GALLERY_SCROLL_DURATION_MS = 1400;

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * @param {HTMLElement | null | undefined} container
 * @param {number} targetTop
 * @param {{ duration?: number }} [options]
 */
export function smoothScrollContainerTo(container, targetTop, options = {}) {
  if (!container) return;
  if (prefersReducedMotion()) {
    container.scrollTop = targetTop;
    return;
  }
  const duration = options.duration ?? GALLERY_SCROLL_DURATION_MS;
  const start = container.scrollTop;
  const distance = targetTop - start;
  if (Math.abs(distance) < 2) {
    container.scrollTop = targetTop;
    return;
  }

  const startTime = performance.now();

  const step = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    container.scrollTop = start + distance * easeOutCubic(progress);
    if (progress < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

/**
 * @param {number} targetTop
 * @param {{ duration?: number }} [options]
 */
export function smoothScrollWindowTo(targetTop, options = {}) {
  if (prefersReducedMotion()) {
    window.scrollTo(0, targetTop);
    return;
  }
  const duration = options.duration ?? GALLERY_SCROLL_DURATION_MS;
  const start = window.scrollY || document.documentElement.scrollTop;
  const distance = targetTop - start;
  if (Math.abs(distance) < 2) {
    window.scrollTo(0, targetTop);
    return;
  }

  const startTime = performance.now();

  const step = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const next = start + distance * easeOutCubic(progress);
    window.scrollTo(0, next);
    if (progress < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

/**
 * Scroll so `target` aligns to the top of `scrollContainer` (or the window).
 * @param {HTMLElement | null | undefined} target
 * @param {{ scrollContainer?: HTMLElement | null, duration?: number }} [options]
 */
export function smoothScrollToElement(target, options = {}) {
  if (!target) return;
  const { scrollContainer = null, duration } = options;

  if (scrollContainer) {
    const containerRect = scrollContainer.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const top = scrollContainer.scrollTop + (targetRect.top - containerRect.top);
    smoothScrollContainerTo(scrollContainer, top, { duration });
    return;
  }

  const top = (window.scrollY || 0) + target.getBoundingClientRect().top;
  smoothScrollWindowTo(top, { duration });
}

/**
 * @param {HTMLElement | null | undefined} scrollContainer
 * @param {{ duration?: number }} [options]
 */
export function smoothScrollToTop(scrollContainer, options = {}) {
  if (scrollContainer) {
    smoothScrollContainerTo(scrollContainer, 0, options);
  } else {
    smoothScrollWindowTo(0, options);
  }
}
