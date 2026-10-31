import DOMPurify from 'dompurify';

/**
 * Photographer-authored Terms / Privacy HTML is shown on public gallery pages.
 * Sanitize at every render site so stored markup cannot run in a guest browser.
 */
export function sanitizePhotographerHtml(html) {
  const raw = String(html ?? '');
  if (!raw) return '';
  if (typeof window === 'undefined') return '';
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
}
