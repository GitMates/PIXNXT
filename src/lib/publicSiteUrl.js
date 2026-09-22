/**
 * Canonical public site origin for client-facing gallery links and QR codes.
 * Set VITE_PUBLIC_SITE_URL in production (e.g. https://www.pixnxt.in).
 * On localhost / 127.0.0.1, always use the current origin so Share / Copy
 * match the local studio (VITE_PUBLIC_SITE_URL must not force pixnxt.in).
 */

import { getPhotographerPublicOrigin, isCustomDomainVerified } from './customDomain';

const GALLERY_PATH = '/gallery';

function trimTrailingSlash(url) {
    return String(url || '').replace(/\/+$/, '');
}

function isLocalDevHost(hostname) {
    const host = String(hostname || '').toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
}

/**
 * Platform / local origin (never a photographer custom domain).
 * - Localhost / 127.0.0.1 → current window origin
 * - Else configured VITE_PUBLIC_SITE_URL
 * - Else current origin
 */
export function getPublicSiteOrigin() {
    if (typeof window !== 'undefined' && window.location?.origin) {
        if (isLocalDevHost(window.location.hostname)) {
            return trimTrailingSlash(window.location.origin);
        }
    }
    const fromEnv = trimTrailingSlash(import.meta.env.VITE_PUBLIC_SITE_URL);
    if (fromEnv) return fromEnv;
    if (typeof window !== 'undefined' && window.location?.origin) {
        return trimTrailingSlash(window.location.origin);
    }
    return '';
}

/**
 * Origin for all client-facing links (share, email, QR, preview, smart album).
 * 1. Localhost → current origin (so Share shows localhost while developing)
 * 2. Verified custom domain → https://that-domain
 * 3. Else → platform domain in prod
 */
export function getClientFacingOrigin(photographerProfile = null) {
    if (typeof window !== 'undefined' && window.location?.origin) {
        if (isLocalDevHost(window.location.hostname)) {
            return trimTrailingSlash(window.location.origin);
        }
    }
    if (isCustomDomainVerified(photographerProfile)) {
        return trimTrailingSlash(getPhotographerPublicOrigin(photographerProfile));
    }
    return getPublicSiteOrigin();
}

/** Public gallery URL for a collection slug. */
export function getPublicGalleryUrl(slug, options = {}) {
    const { photographerProfile } = options;
    const origin = getClientFacingOrigin(photographerProfile);
    if (!slug) return `${origin}${GALLERY_PATH}`;
    const safeSlug = String(slug).trim().replace(/^\/+|\/+$/g, '');
    return `${origin}${GALLERY_PATH}/${encodeURIComponent(safeSlug)}`;
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
    if (isLocalDevHost(host)) return true;
    if (host.includes('vercel.app') && !import.meta.env.VITE_PUBLIC_SITE_URL) return true;
    return false;
}

/** User-facing warning when the encoded QR URL may fail for clients. */
export function getShareUrlWarning(url) {
    const target = url || getPublicGalleryUrl('');
    if (!target) {
        return 'Set VITE_PUBLIC_SITE_URL to your public gallery domain before sharing QR codes.';
    }
    const host = hostFromUrl(target);
    // Verified custom domains and production platform hosts are fine.
    if (host && !isLocalDevHost(host) && !host.includes('vercel.app')) {
        return null;
    }
    if (isLocalDevHost(host)) {
        return 'This link uses localhost. Other people cannot open it. Open the production site or connect a custom domain to share with clients.';
    }
    if (!import.meta.env.VITE_PUBLIC_SITE_URL) {
        if (host.includes('vercel.app')) {
            return 'This link uses a Vercel preview URL, not your public gallery domain. Set VITE_PUBLIC_SITE_URL (e.g. https://www.pixnxt.in) and redeploy.';
        }
        return 'Set VITE_PUBLIC_SITE_URL to your public gallery domain so QR codes always point to the same live site.';
    }
    return null;
}
