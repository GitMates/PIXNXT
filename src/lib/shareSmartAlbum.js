import { getClientFacingOrigin, getShareUrlWarning } from './publicSiteUrl';
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
 * Uses verified custom domain when set; otherwise platform origin (or localhost in dev).
 */
export function getSmartAlbumPreviewShareUrl(album, options = {}) {
    const { photographerProfile } = options;
    const id =
        typeof album === 'string'
            ? album
            : getAlbumShareSlug(album) || album?.id || '';

    const origin = getClientFacingOrigin(photographerProfile);

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

/** In-app photographer preview path (skips client gates). */
export function getSmartAlbumPreviewPath(albumId, page = 0) {
    const id = albumId?.id ?? albumId;
    if (!id) return '/album-proofer';
    const pageNum = Math.max(0, Number(page) || 0);
    return `/album-proofer/preview/${encodeURIComponent(id)}?page=${pageNum}`;
}

/**
 * Open the client-facing album preview URL (custom domain when verified).
 * Falls back to platform / localhost when no custom domain is set.
 */
export function openClientAlbumPreview(album, options = {}) {
    const { photographerProfile = null, page = 0 } = options;
    const url = getSmartAlbumPreviewShareUrl(album, { photographerProfile });
    if (!url) return;
    const pageNum = Math.max(0, Number(page) || 0);
    const withPage =
        pageNum > 0 ? `${url}${url.includes('?') ? '&' : '?'}page=${pageNum}` : url;
    if (typeof window !== 'undefined') {
        window.open(withPage, '_blank', 'noopener,noreferrer');
    }
}

/** Photographer-only in-app preview (skips client name/email/password gates). */
export function openSmartAlbumPreview(albumId, page = 0) {
    openSpaPath(getSmartAlbumPreviewPath(albumId, page));
}
