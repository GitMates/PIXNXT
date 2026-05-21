export function generateCollectionSlug(text) {
    return String(text || 'collection')
        .toLowerCase()
        .trim()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');
}

import { getPublicGalleryUrl } from './publicSiteUrl';

/** @deprecated Prefer getPublicGalleryUrl from publicSiteUrl / shareCollection. */
export function getGalleryPublicUrl(slug) {
    return getPublicGalleryUrl(slug);
}
