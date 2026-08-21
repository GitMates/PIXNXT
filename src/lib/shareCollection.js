import { buildGmailComposeUrl } from './gmailComposeUrl';
import { generateCollectionSlug } from './collectionSlug';
import { getPhotographerPublicOrigin, isCustomDomainVerified } from './customDomain';
import { getPublicGalleryUrl, getPublicSiteOrigin, getShareUrlWarning } from './publicSiteUrl';

export { getShareUrlWarning };

export function getCollectionShareUrl(slug, photographerProfile) {
    return getPublicGalleryUrl(slug, { photographerProfile });
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

/** Client-facing selection link (branded /g/:slug/choose path). */
export function getSelectionChooseUrl(slug, photographerProfile) {
    const safeSlug = String(slug || '').trim().replace(/^\/+|\/+$/g, '');
    const origin = (
        isCustomDomainVerified(photographerProfile)
            ? getPhotographerPublicOrigin(photographerProfile)
            : getPublicSiteOrigin()
    ).replace(/\/+$/, '');
    const href = safeSlug ? `${origin}/g/${encodeURIComponent(safeSlug)}/choose` : `${origin}/g/choose`;
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
