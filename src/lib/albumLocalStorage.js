/**
 * Safe localStorage helpers for Album Proofer.
 * Browser localStorage is ~5MB — inlined data: URLs blow the quota and break
 * auto-place / collection merges (QuotaExceededError → empty spreads).
 */

export const ALBUM_PHOTOS_KEY = 'pixnxt_album_page_photos';
export const ALBUM_COLLECTIONS_KEY = 'pixnxt_album_collections';
export const ALBUM_TRANSFORMS_KEY = 'pixnxt_album_page_transforms';
export const ALBUM_REPLACEMENTS_KEY = 'pixnxt_album_image_replacements';

const ALBUM_STORAGE_KEYS = [
    ALBUM_PHOTOS_KEY,
    ALBUM_COLLECTIONS_KEY,
    ALBUM_TRANSFORMS_KEY,
    ALBUM_REPLACEMENTS_KEY,
    'pixnxt_album_cover_text',
    'pixnxt_album_cover_color',
    'pixnxt_album_spine_bounds',
];

export function isQuotaExceededError(error) {
    if (!error) return false;
    if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        return true;
    }
    const code = error.code;
    // Legacy WebKit / IE codes
    return code === 22 || code === 1014;
}

export function isInlineDataUrl(value) {
    return typeof value === 'string' && value.startsWith('data:');
}

/** Drop base64 data: blobs; keep http(s) / relative URLs and non-string values. */
export function stripInlineDataUrls(value) {
    if (isInlineDataUrl(value)) return undefined;
    if (Array.isArray(value)) {
        return value.map(stripInlineDataUrls).filter((entry) => entry !== undefined);
    }
    if (value && typeof value === 'object') {
        const next = {};
        for (const [key, child] of Object.entries(value)) {
            const cleaned = stripInlineDataUrls(child);
            if (cleaned !== undefined) next[key] = cleaned;
        }
        // Collection / placement rows: storagePath is enough — drop duplicated URL strings.
        if (next.storagePath && typeof next.dataUrl === 'string') {
            delete next.dataUrl;
        }
        return next;
    }
    return value;
}

function albumRevision(bucket) {
    if (!bucket || typeof bucket !== 'object') return 0;
    return Number(bucket.__revision) || 0;
}

/**
 * Compact album map stores (photos / collections / replacements).
 * Prefer keeping recently revised albums when pruning for space.
 */
export function compactAlbumMapStore(data, { keepAlbumIds = [], maxAlbums = 12 } = {}) {
    if (!data || typeof data !== 'object') return {};
    const keep = new Set((keepAlbumIds || []).filter(Boolean).map(String));
    const stripped = stripInlineDataUrls(data) || {};

    const entries = Object.entries(stripped).map(([albumId, bucket]) => ({
        albumId,
        bucket,
        revision: albumRevision(bucket),
        keep: keep.has(albumId),
    }));

    entries.sort((a, b) => {
        if (a.keep !== b.keep) return a.keep ? -1 : 1;
        return b.revision - a.revision;
    });

    const limited = entries.slice(0, Math.max(maxAlbums, keep.size));
    const next = {};
    for (const row of limited) {
        next[row.albumId] = row.bucket;
    }
    return next;
}

function readRawJson(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function trySetItem(key, serialized) {
    localStorage.setItem(key, serialized);
    return true;
}

/**
 * Aggressively shrink known Album Proofer keys so a write can succeed.
 * Keeps `preferAlbumId` when present.
 */
export function reclaimAlbumLocalStorage({ preferAlbumId = null } = {}) {
    const keep = preferAlbumId ? [preferAlbumId] : [];

    for (const key of [ALBUM_PHOTOS_KEY, ALBUM_COLLECTIONS_KEY, ALBUM_REPLACEMENTS_KEY]) {
        try {
            const current = readRawJson(key);
            const compacted = compactAlbumMapStore(current, { keepAlbumIds: keep, maxAlbums: 8 });
            localStorage.setItem(key, JSON.stringify(compacted));
        } catch {
            try {
                localStorage.removeItem(key);
            } catch {
                /* ignore */
            }
        }
    }

    // Transforms / cover text are small; still strip any accidental blobs.
    for (const key of [ALBUM_TRANSFORMS_KEY, 'pixnxt_album_cover_text', 'pixnxt_album_cover_color']) {
        try {
            const current = readRawJson(key);
            localStorage.setItem(key, JSON.stringify(stripInlineDataUrls(current) || {}));
        } catch {
            /* ignore */
        }
    }
}

/**
 * Write JSON to localStorage without blowing the ~5MB quota.
 * @returns {boolean} true when persisted
 */
export function writeLocalStorageJson(key, data, { preferAlbumId = null, compact = true } = {}) {
    const payload = compact ? stripInlineDataUrls(data) ?? data : data;
    let serialized;
    try {
        serialized = JSON.stringify(payload ?? {});
    } catch (e) {
        console.warn('[albumLocalStorage] could not serialize', key, e);
        return false;
    }

    try {
        return trySetItem(key, serialized);
    } catch (firstError) {
        if (!isQuotaExceededError(firstError)) {
            console.warn('[albumLocalStorage] write failed', key, firstError);
            return false;
        }
    }

    // Pass 1: compact every album store, keep the active album.
    try {
        reclaimAlbumLocalStorage({ preferAlbumId });
        const retryPayload =
            key === ALBUM_PHOTOS_KEY ||
            key === ALBUM_COLLECTIONS_KEY ||
            key === ALBUM_REPLACEMENTS_KEY
                ? compactAlbumMapStore(payload, {
                      keepAlbumIds: preferAlbumId ? [preferAlbumId] : [],
                      maxAlbums: 6,
                  })
                : stripInlineDataUrls(payload);
        serialized = JSON.stringify(retryPayload ?? {});
        return trySetItem(key, serialized);
    } catch (secondError) {
        if (!isQuotaExceededError(secondError)) {
            console.warn('[albumLocalStorage] retry failed', key, secondError);
            return false;
        }
    }

    // Pass 2: keep only the preferred album (or empty).
    try {
        const lastChance =
            preferAlbumId && payload && typeof payload === 'object' && payload[preferAlbumId]
                ? { [preferAlbumId]: stripInlineDataUrls(payload[preferAlbumId]) }
                : {};
        serialized = JSON.stringify(lastChance);
        return trySetItem(key, serialized);
    } catch (thirdError) {
        console.warn('[albumLocalStorage] quota exhausted for', key, thirdError);
        return false;
    }
}

export function readLocalStorageJson(key, fallback = {}) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

/** One-shot cleanup after deploy — strip base64 already stuck in older sessions. */
export function migrateStripInlineDataFromAlbumLocalStorage() {
    if (typeof localStorage === 'undefined') return;
    const flagKey = 'pixnxt_album_ls_compact_v1';

    let hasInlineData = false;
    for (const key of ALBUM_STORAGE_KEYS) {
        try {
            const raw = localStorage.getItem(key);
            if (raw && raw.includes('data:')) {
                hasInlineData = true;
                break;
            }
        } catch {
            /* ignore */
        }
    }

    try {
        if (!hasInlineData && localStorage.getItem(flagKey) === '1') return;
    } catch {
        return;
    }

    let changed = false;
    for (const key of ALBUM_STORAGE_KEYS) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            if (!raw.includes('data:') && !raw.includes('"storagePath"')) continue;
            const parsed = JSON.parse(raw);
            const compacted =
                key === ALBUM_PHOTOS_KEY ||
                key === ALBUM_COLLECTIONS_KEY ||
                key === ALBUM_REPLACEMENTS_KEY
                    ? compactAlbumMapStore(parsed, { maxAlbums: 20 })
                    : stripInlineDataUrls(parsed);
            const next = JSON.stringify(compacted ?? {});
            if (next.length < raw.length || raw.includes('data:')) {
                localStorage.setItem(key, next);
                changed = true;
            }
        } catch (e) {
            if (isQuotaExceededError(e)) {
                reclaimAlbumLocalStorage();
            }
        }
    }

    try {
        localStorage.setItem(flagKey, '1');
    } catch {
        reclaimAlbumLocalStorage();
        try {
            localStorage.setItem(flagKey, '1');
        } catch {
            /* ignore */
        }
    }

    if (changed) {
        console.info('[albumLocalStorage] stripped inline data: URLs from album caches');
    }
}

export function estimateAlbumLocalStorageBytes() {
    let total = 0;
    for (const key of ALBUM_STORAGE_KEYS) {
        try {
            const raw = localStorage.getItem(key);
            if (raw) total += raw.length * 2; // UTF-16
        } catch {
            /* ignore */
        }
    }
    return total;
}
