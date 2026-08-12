/** Name → URL segment, e.g. "Karthiksanthosh Meetup" → "karthiksanthosh-meetup". */
export function slugifyAlbumName(name) {
    const base = String(name || 'album')
        .toLowerCase()
        .trim()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');
    return base || 'album';
}

/**
 * Legacy create path appended Date.now().toString(36), e.g.
 * karthiksanthosh-meetup-msoohhle
 */
export function isLegacyTimestampAlbumSlug(slug, expectedBase = null) {
    const value = String(slug || '').trim();
    if (!value) return false;
    const match = value.match(/^(.+)-([a-z0-9]{5,12})$/i);
    if (!match) return false;
    if (expectedBase && match[1] !== expectedBase) return false;
    return true;
}

/** Prefer clean name slug for share links when the stored slug is legacy. */
export function getAlbumShareSlug(album) {
    if (!album || typeof album === 'string') {
        const raw = String(album || '').trim();
        return raw;
    }
    const stored = String(album.slug || '').trim();
    const nameBase = slugifyAlbumName(album.name);
    if (stored && isLegacyTimestampAlbumSlug(stored, nameBase)) {
        return nameBase;
    }
    if (stored) return stored;
    if (nameBase && nameBase !== 'album') return nameBase;
    return String(album.id || '').trim();
}

/**
 * Pick a public album row for a path segment.
 * Exact slug/id first; then a unique legacy `base-timestamp` match.
 */
export function pickPublicAlbumForSlug(key, rows = []) {
    const needle = String(key || '').trim();
    if (!needle || !Array.isArray(rows) || rows.length === 0) return null;

    const exact = rows.find((row) => String(row?.slug || '') === needle);
    if (exact) return exact;

    const legacy = rows.filter((row) => {
        const slug = String(row?.slug || '');
        return slug.startsWith(`${needle}-`) && isLegacyTimestampAlbumSlug(slug, needle);
    });
    if (legacy.length === 1) return legacy[0];
    if (legacy.length > 1) {
        const published = legacy.filter((row) => row?.status === 'published');
        if (published.length === 1) return published[0];
        return [...legacy].sort((a, b) => {
            const aAt = Date.parse(a?.updated_at || a?.created_at || 0) || 0;
            const bAt = Date.parse(b?.updated_at || b?.created_at || 0) || 0;
            return bAt - aAt;
        })[0];
    }
    return null;
}
