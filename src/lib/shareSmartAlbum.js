import { getPublicSiteOrigin, getShareUrlWarning } from './publicSiteUrl';
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
