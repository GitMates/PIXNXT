import { getPublicSiteOrigin, getShareUrlWarning } from './publicSiteUrl';
import { openSpaPath } from './spaNavigation';
import {
    openShareByEmail,
    openWhatsAppShare,
    getQrCodeImageUrl,
} from './shareCollection';

export { getShareUrlWarning, openShareByEmail, openWhatsAppShare, getQrCodeImageUrl };

/** Shareable URL for read-only album preview (flipbook view only). */
export function getSmartAlbumPreviewShareUrl(album) {
    const origin = getPublicSiteOrigin();
    const id = album?.id ?? album;
    if (!id) return `${origin}/smart-albums`;
    return `${origin}/album-preview/${encodeURIComponent(id)}`;
}

/** In-app preview path (opens in a new tab via openSmartAlbumPreview). */
export function getSmartAlbumPreviewPath(albumId, page = 0) {
    const id = albumId?.id ?? albumId;
    if (!id) return '/smart-albums';
    const pageNum = Math.max(0, Number(page) || 0);
    return `/smart-albums/preview/${encodeURIComponent(id)}?page=${pageNum}`;
}

/** Open album preview in a new browser tab (same pattern as gallery preview). */
export function openSmartAlbumPreview(albumId, page = 0) {
    openSpaPath(getSmartAlbumPreviewPath(albumId, page));
}
