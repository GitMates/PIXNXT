const PHOTOS_KEY = 'pixnxt_album_page_photos';
const TRANSFORMS_KEY = 'pixnxt_album_page_transforms';

export const MIN_ALBUM_PAGES = 3;
export const MAX_ALBUM_PAGES = 99;
/** Inner spreads are two pages (left + right). */
export const PAGES_PER_SPREAD = 2;

function readJson(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function writeJson(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.warn('Could not save album storage', key, e);
    }
}

function isPageKey(key) {
    return /^\d+$/.test(key);
}

function spreadLeftFromKey(key) {
    if (!key.startsWith('spread:')) return null;
    const n = parseInt(key.slice(7), 10);
    return Number.isNaN(n) ? null : n;
}

function pruneBucket(bucket, newTotalPages) {
    if (!bucket || newTotalPages < 1) return { __revision: (bucket.__revision || 0) + 1 };
    const next = { __revision: (bucket.__revision || 0) + 1 };
    for (const key of Object.keys(bucket)) {
        if (key === '__revision') continue;
        if (isPageKey(key)) {
            const page = parseInt(key, 10);
            if (page >= newTotalPages) continue;
            next[key] = bucket[key];
            continue;
        }
        const left = spreadLeftFromKey(key);
        if (left != null) {
            if (left + 1 < newTotalPages) {
                next[key] = bucket[key];
            }
            continue;
        }
        next[key] = bucket[key];
    }
    return next;
}

/** Drop photo + transform data for pages removed when shrinking the album. */
export function pruneAlbumStorageForPageCount(albumId, newTotalPages) {
    if (!albumId || newTotalPages < 1) return;

    const photosAll = readJson(PHOTOS_KEY);
    if (photosAll[albumId]) {
        photosAll[albumId] = pruneBucket(photosAll[albumId], newTotalPages);
        writeJson(PHOTOS_KEY, photosAll);
    }

    const transformsAll = readJson(TRANSFORMS_KEY);
    if (transformsAll[albumId]) {
        transformsAll[albumId] = pruneBucket(transformsAll[albumId], newTotalPages);
        writeJson(TRANSFORMS_KEY, transformsAll);
    }
}
