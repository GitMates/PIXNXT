/**
 * Canonical public site origin for client-facing gallery links and QR codes.
 * Set VITE_PUBLIC_SITE_URL in production (e.g. https://gallery.yourdomain.com).
 * Without it, links use window.location.origin (localhost or Vercel preview URLs).
 */

const GALLERY_PATH = '/gallery';

function trimTrailingSlash(url) {
    return String(url || '').replace(/\/+$/, '');
}

/** Origin from env, or current page when in the browser. */
export function getPublicSiteOrigin() {
    const fromEnv = trimTrailingSlash(import.meta.env.VITE_PUBLIC_SITE_URL);
    if (fromEnv) return fromEnv;
    if (typeof window !== 'undefined' && window.location?.origin) {
        return window.location.origin;
    }
    return '';
}

/** Public gallery URL for a collection slug. */
export function getPublicGalleryUrl(slug) {
    const origin = getPublicSiteOrigin();
    if (!slug) return `${origin}${GALLERY_PATH}`;
    const safeSlug = encodeURIComponent(String(slug).trim());
    return `${origin}${GALLERY_PATH}/${safeSlug}`;
}

function hostFromUrl(url) {
    try {
        return new URL(url).hostname.toLowerCase();
    } catch {
        return '';
    }
}

/** True when the link should not be shared via QR (dev / preview hosts). */
export function isUnsafeShareOrigin(originOrUrl) {
    const host = hostFromUrl(originOrUrl || getPublicSiteOrigin());
    if (!host) return true;
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return true;
    if (host.includes('vercel.app') && !import.meta.env.VITE_PUBLIC_SITE_URL) return true;
    return false;
}

/** User-facing warning when the encoded QR URL may fail for clients. */
export function getShareUrlWarning(url) {
    const target = url || getPublicGalleryUrl('');
    if (!target) {
        return 'Set VITE_PUBLIC_SITE_URL to your public gallery domain before sharing QR codes.';
    }
    if (!import.meta.env.VITE_PUBLIC_SITE_URL) {
        const host = hostFromUrl(target);
        if (host === 'localhost' || host === '127.0.0.1') {
            return 'This link uses localhost. Other people cannot open it. Set VITE_PUBLIC_SITE_URL to your live domain.';
        }
        if (host.includes('vercel.app')) {
            return 'This link uses a Vercel preview URL, not your public gallery domain. Set VITE_PUBLIC_SITE_URL (e.g. https://yourdomain.com) and redeploy.';
        }
        return 'Set VITE_PUBLIC_SITE_URL to your public gallery domain so QR codes always point to the same live site.';
    }
    return null;
}
