export function generateCollectionSlug(text) {
    return String(text || 'delivery')
        .toLowerCase()
        .trim()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');
}

/** Slug variants for DB lookup (encodeURIComponent turns spaces into hyphens in URLs). */
export function deliverySlugLookupVariants(slug) {
    const base = String(slug || '').trim();
    if (!base) return [];
    const withoutSuffix = base.replace(/-[a-z0-9]{4,10}$/i, '');
    const variants = new Set([
        base,
        base.replace(/-/g, ' '),
        base.replace(/\s+/g, '-'),
        base.replace(/-+/g, ' ').replace(/\s+/g, ' ').trim(),
        generateCollectionSlug(base),
        withoutSuffix,
        withoutSuffix.replace(/-/g, ' '),
        withoutSuffix.replace(/\s+/g, '-'),
        generateCollectionSlug(withoutSuffix),
    ]);
    for (const value of [...variants]) {
        if (value) {
            variants.add(value.toLowerCase());
            variants.add(encodeURIComponent(value));
            variants.add(decodeURIComponent(value));
        }
    }
    return [...variants].filter(Boolean);
}

import { getPublicGalleryUrl } from './publicSiteUrl';

/** @deprecated Prefer getPublicGalleryUrl from publicSiteUrl / shareCollection. */
export function getGalleryPublicUrl(slug) {
    return getPublicGalleryUrl(slug);
}
