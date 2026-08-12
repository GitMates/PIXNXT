import { getPublicSiteOrigin, getShareUrlWarning } from './publicSiteUrl';
import { getPhotographerPublicOrigin, isCustomDomainVerified } from './customDomain';
import { openSpaPath } from './spaNavigation';
import { getAlbumShareSlug } from './albumPreviewSlug';
import {
    openShareByEmail,
    openWhatsAppShare,
    getQrCodeImageUrl,
} from './shareCollection';

export { getShareUrlWarning, openShareByEmail, openWhatsAppShare, getQrCodeImageUrl };

/**
 * Shareable URL for read-only album preview (flipbook view only).
 * Uses verified custom domain when set; otherwise the platform public origin.
 * Prefer clean name slugs (…/karthiksanthosh-meetup), not legacy …-msoohhle suffixes.
 */
export function getSmartAlbumPreviewShareUrl(album, options = {}) {
    const { photographerProfile } = options;
    const id =
        typeof album === 'string'
            ? album
            : getAlbumShareSlug(album) || album?.id || '';

    // Only use photographer host when custom domain is verified.
    // Studio subdomains (slug.pixnxt.in) have no wildcard DNS and do not resolve.
    let origin = getPublicSiteOrigin();
    if (photographerProfile && isCustomDomainVerified(photographerProfile)) {
        origin = getPhotographerPublicOrigin(photographerProfile);
    }

    if (!id) return `${origin}/album-proofer`;
    return `${origin}/album-preview/${encodeURIComponent(id)}`;
}

/** True when the client share link toggle is on (default on). */
export function isClientShareLinkEnabled(album) {
    return album?.share_link_enabled !== false;
}

/** True when clients can open the public /album-preview link. */
export function isClientShareLinkLive(album) {
    return isClientShareLinkEnabled(album);
}

/** In-app preview path (opens in a new tab via openSmartAlbumPreview). */
export function getSmartAlbumPreviewPath(albumId, page = 0) {
    const id = albumId?.id ?? albumId;
    if (!id) return '/album-proofer';
    const pageNum = Math.max(0, Number(page) || 0);
    return `/album-proofer/preview/${encodeURIComponent(id)}?page=${pageNum}`;
}

/** Open album preview in a new browser tab (same pattern as gallery preview). */
export function openSmartAlbumPreview(albumId, page = 0) {
    openSpaPath(getSmartAlbumPreviewPath(albumId, page));
}
