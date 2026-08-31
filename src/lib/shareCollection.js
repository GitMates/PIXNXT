import { buildGmailComposeUrl } from './gmailComposeUrl';
import { generateCollectionSlug } from './collectionSlug';
import {
    getClientFacingOrigin,
    getPublicGalleryUrl,
    getPublicSiteOrigin,
    getShareUrlWarning,
} from './publicSiteUrl';

function trimTrailingSlash(url) {
    return String(url || '').replace(/\/+$/, '');
}

export { getShareUrlWarning, getClientFacingOrigin };

export function getCollectionShareUrl(slug, photographerProfile) {
    return getPublicGalleryUrl(slug, { photographerProfile });
}

/**
 * Dashboard “Preview” — always opens on the current studio origin (localhost / pixnxt.in),
 * not the client custom domain, and passes collection id so owners can preview draft/hidden
 * deliveries and recover from slug drift before autosave.
 */
export function getStudioPreviewGalleryUrl(slug, collectionId, query = {}) {
    const origin =
        typeof window !== 'undefined' && window.location?.origin
            ? window.location.origin
            : getPublicSiteOrigin();
    const safeSlug = String(slug || '').trim();
    const base = safeSlug
        ? `${trimTrailingSlash(origin)}/gallery/${encodeURIComponent(safeSlug)}`
        : `${trimTrailingSlash(origin)}/gallery`;
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([key, value]) => {
        if (value != null && value !== '') params.set(key, String(value));
    });
    if (collectionId) params.set('cid', String(collectionId));
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
}

/** @deprecated Use getPublicSiteOrigin — re-export for callers that need the origin only. */
export { getPublicSiteOrigin };

/** Resolve a shareable gallery URL from a collection row (slug or generated from name). */
export function getShareUrlForCollection(collection, photographerProfile = null) {
    if (!collection) return getCollectionShareUrl('', photographerProfile);
    if (collection.slug) return getCollectionShareUrl(collection.slug, photographerProfile);
    if (collection.name) {
        return getCollectionShareUrl(generateCollectionSlug(collection.name), photographerProfile);
    }
    return getCollectionShareUrl('', photographerProfile);
}

/** Client-facing selection link (/gallery/:slug/choose path). */
export function getSelectionChooseUrl(slug, photographerProfile) {
    const safeSlug = String(slug || '').trim().replace(/^\/+|\/+$/g, '');
    const origin = getClientFacingOrigin(photographerProfile);
    const href = safeSlug
        ? `${origin}/gallery/${encodeURIComponent(safeSlug)}/choose`
        : `${origin}/gallery/choose`;
    return {
        href,
        displayPath: href.replace(/^https?:\/\//, ''),
    };
}

export function openShareByEmail(url, title = 'Photo Gallery') {
    const body = `Hi,\n\nI'd like to share my photo gallery with you:\n${url}\n\nEnjoy!`;
    window.open(buildGmailComposeUrl(body, { subject: title }), '_blank', 'noopener,noreferrer');
}

export function openWhatsAppShare(url, title = 'Gallery') {
    const text = `Hi,\n\nThanks again for sharing your special day with me! I had an incredible time photographing the two of you, and I am very excited to share the photos with you!\n\nClick on the link below to view your personalized gallery. Feel free to then share this gallery with your family and friends.\n\nI hope you enjoy the photos and please let me know if you have any questions. Have a great day!\n\nCheers,\nYour Name\n\nView Gallery: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
}

export function getQrCodeImageUrl(url, size = 220, format = 'png') {
    const fmt = format && format !== 'png' ? `&format=${encodeURIComponent(format)}` : '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}${fmt}`;
}
