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

export function openShareByEmail(url, title = 'Photo Gallery', extras = {}) {
    const body = extras.body
      || `Hi,\n\nI'd like to share my photo gallery with you:\n${url}\n\nEnjoy!`;
    window.open(buildGmailComposeUrl(body, { subject: title }), '_blank', 'noopener,noreferrer');
}

export function openWhatsAppShare(url, title = 'Gallery', extras = {}) {
    const text = extras.body
      || `Hi — your photos from “${title}” are ready.\n\nView your gallery here:\n${url}\n\nFeel free to share this link with family and friends. Reply here if you have any questions.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
}

/**
 * Build the Access → Password share preview / outbound message body.
 * Includes password / PIN as plain text when the photographer opts in.
 */
export function buildDeliveryShareMessage({
  url,
  brandName,
  eventDateLabel,
  password,
  pin,
  includePassword = false,
  includePin = false,
} = {}) {
  const lines = [
    eventDateLabel
      ? `Your photographs from ${eventDateLabel} are ready.`
      : 'Your photographs are ready.',
    '',
    String(url || '').trim(),
  ];
  if (includePassword && password) {
    lines.push('', `Password: ${password}`);
  }
  if (includePin && pin) {
    if (!(includePassword && password)) lines.push('');
    lines.push(`Download PIN: ${pin}`);
  }
  if (brandName) {
    lines.push('', `— ${brandName}`);
  }
  return lines.filter((line, i, arr) => !(line === '' && arr[i - 1] === '')).join('\n');
}

export function getQrCodeImageUrl(url, size = 220, format = 'png') {
    const fmt = format && format !== 'png' ? `&format=${encodeURIComponent(format)}` : '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}${fmt}`;
}
