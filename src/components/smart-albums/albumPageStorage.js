const PHOTOS_KEY = 'pixnxt_album_page_photos';
const TRANSFORMS_KEY = 'pixnxt_album_page_transforms';

/** Cover page + at least one inner spread (2 pages) + end-cover spread (2 pages). */
export const MIN_ALBUM_PAGES = 5;
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
            if (left < newTotalPages) {
                next[key] = bucket[key];
            }
            continue;
        }
        next[key] = bucket[key];
    }
    return next;
}

function rescueMisplacedSpreadKeysInBucket(bucket, removeAt, count) {
    if (!bucket || count <= 0) return { bucket, changed: false };
    const start = Number(removeAt);
    const removeEnd = start + count;
    if (!Number.isFinite(start)) return { bucket, changed: false };

    const next = { ...bucket };
    let changed = false;

    for (let left = start + 1; left < removeEnd; left += 1) {
        const misKey = `spread:${left}`;
        if (next[misKey] == null) continue;
        const rescueKey = `spread:${removeEnd}`;
        if (next[rescueKey] == null) {
            next[rescueKey] = next[misKey];
        }
        delete next[misKey];
        changed = true;
    }

    if (!changed) return { bucket, changed: false };
    next.__revision = (bucket.__revision || 0) + 1;
    return { bucket: next, changed: true };
}

/** Spread keys use the spread's left page only — not every page in the removed range. */
function spreadKeysDroppedForPageRemove(removeAt, count) {
    const start = Number(removeAt);
    if (!Number.isFinite(start) || count <= 0) return [];
    return [`spread:${start}`];
}

function spliceBucketPages(bucket, insertAt, delta) {
    if (!bucket || delta === 0) return bucket;
    const next = { __revision: (bucket.__revision || 0) + 1 };

    for (const key of Object.keys(bucket)) {
        if (key === '__revision') continue;

        if (isPageKey(key)) {
            const page = parseInt(key, 10);
            if (Number.isNaN(page)) continue;
            if (delta > 0) {
                if (page >= insertAt) {
                    next[String(page + delta)] = bucket[key];
                } else {
                    next[key] = bucket[key];
                }
            } else {
                const removeEnd = insertAt - delta;
                if (page >= insertAt && page < removeEnd) continue;
                if (page >= removeEnd) {
                    next[String(page + delta)] = bucket[key];
                } else {
                    next[key] = bucket[key];
                }
            }
            continue;
        }

        const left = spreadLeftFromKey(key);
        if (left != null) {
            if (delta > 0) {
                if (left >= insertAt) {
                    next[`spread:${left + delta}`] = bucket[key];
                } else {
                    next[key] = bucket[key];
                }
            } else {
                const removeEnd = insertAt - delta;
                if (left === insertAt) continue;
                if (left >= removeEnd) {
                    next[`spread:${left + delta}`] = bucket[key];
                } else {
                    next[key] = bucket[key];
                }
            }
            continue;
        }

        next[key] = bucket[key];
    }

    return next;
}

/** Insert or remove pages; negative count removes a range and shifts later keys down. */
export function insertAlbumStoragePages(albumId, insertAt, count) {
    if (!albumId || count === 0) return;

    const photosAll = readJson(PHOTOS_KEY);
    if (photosAll[albumId]) {
        photosAll[albumId] = spliceBucketPages(photosAll[albumId], insertAt, count);
        writeJson(PHOTOS_KEY, photosAll);
    }

    const transformsAll = readJson(TRANSFORMS_KEY);
    if (transformsAll[albumId]) {
        transformsAll[albumId] = spliceBucketPages(transformsAll[albumId], insertAt, count);
        writeJson(TRANSFORMS_KEY, transformsAll);
    }
}

/** Move miskeyed spread/page photos out of a page-remove range before splicing. */
export function rescueMisplacedAlbumStorageBeforeSpreadRemove(albumId, removeAt, count) {
    if (!albumId || count <= 0) return;

    const photosAll = readJson(PHOTOS_KEY);
    if (photosAll[albumId]) {
        const { bucket, changed } = rescueMisplacedSpreadKeysInBucket(
            photosAll[albumId],
            removeAt,
            count
        );
        if (changed) {
            photosAll[albumId] = bucket;
            writeJson(PHOTOS_KEY, photosAll);
        }
    }

    const transformsAll = readJson(TRANSFORMS_KEY);
    if (transformsAll[albumId]) {
        const { bucket, changed } = rescueMisplacedSpreadKeysInBucket(
            transformsAll[albumId],
            removeAt,
            count
        );
        if (changed) {
            transformsAll[albumId] = bucket;
            writeJson(TRANSFORMS_KEY, transformsAll);
        }
    }
}

/** Remove a page range and shift later pages down (before end-cover shrink). */
export function removeAlbumStoragePages(albumId, removeAt, count) {
    if (!albumId || count <= 0) return;
    insertAlbumStoragePages(albumId, removeAt, -count);
}

/** @deprecated Spread delete uses splice only — do not call before removeAlbumStoragePages. */
export function purgeAlbumPageRange(albumId, removeAt, count) {
    if (!albumId || count <= 0) return;
    const start = Number(removeAt);
    const end = start + count;
    if (!Number.isFinite(start)) return;

    const keysToDrop = new Set(spreadKeysDroppedForPageRemove(start, count));
    for (let page = start; page < end; page += 1) {
        keysToDrop.add(String(page));
    }

    const photosAll = readJson(PHOTOS_KEY);
    if (photosAll[albumId]) {
        const album = { ...photosAll[albumId] };
        for (const key of keysToDrop) {
            delete album[key];
        }
        album.__revision = (album.__revision || 0) + 1;
        photosAll[albumId] = album;
        writeJson(PHOTOS_KEY, photosAll);
    }

    const transformsAll = readJson(TRANSFORMS_KEY);
    if (transformsAll[albumId]) {
        const bucket = { ...transformsAll[albumId] };
        for (const key of keysToDrop) {
            delete bucket[key];
        }
        bucket.__revision = (bucket.__revision || 0) + 1;
        transformsAll[albumId] = bucket;
        writeJson(TRANSFORMS_KEY, transformsAll);
    }
}

/** Shift page / spread keys in a photo map (used for remote preview cache). */
export function spliceIndexedPhotoMap(map, insertAt, delta) {
    return spliceBucketPages(map || {}, insertAt, delta);
}

/** Rescue miskeyed spread keys in a preview page map before spread delete. */
export function rescueMisplacedKeysInPhotoMap(map, removeAt, count) {
    const { bucket } = rescueMisplacedSpreadKeysInBucket(map || {}, removeAt, count);
    return bucket;
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
