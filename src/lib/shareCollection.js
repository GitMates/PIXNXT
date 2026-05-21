import { buildGmailComposeUrl } from './gmailComposeUrl';
import { generateCollectionSlug } from './collectionSlug';
import { getPublicGalleryUrl, getPublicSiteOrigin, getShareUrlWarning } from './publicSiteUrl';

export { getShareUrlWarning };

export function getCollectionShareUrl(slug) {
    return getPublicGalleryUrl(slug);
}

/** @deprecated Use getPublicSiteOrigin — re-export for callers that need the origin only. */
export { getPublicSiteOrigin };

/** Resolve a shareable gallery URL from a collection row (slug or generated from name). */
export function getShareUrlForCollection(collection) {
    if (!collection) return getCollectionShareUrl('');
    if (collection.slug) return getCollectionShareUrl(collection.slug);
    if (collection.name) return getCollectionShareUrl(generateCollectionSlug(collection.name));
    return getCollectionShareUrl('');
}

export function openShareByEmail(url, title = 'Photo Gallery') {
    const body = `Hi,\n\nI'd like to share my photo gallery with you:\n${url}\n\nEnjoy!`;
    window.open(buildGmailComposeUrl(body, { subject: title }), '_blank', 'noopener,noreferrer');
}

export function openWhatsAppShare(url, title = 'Gallery') {
    const text = `Check out ${title}: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
}

export function getQrCodeImageUrl(url, size = 220) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
}
