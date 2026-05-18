export function generateCollectionSlug(text) {
    return String(text || 'collection')
        .toLowerCase()
        .trim()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');
}

export function getGalleryPublicUrl(slug) {
    if (!slug) return `${window.location.origin}/gallery`;
    return `${window.location.origin}/gallery/${slug}`;
}
