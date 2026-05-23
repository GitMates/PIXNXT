const STORAGE_KEY = 'pixnxt_album_page_photos';

function readAll() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function writeAll(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Could not save album photos', e);
    }
}

function spreadStorageKey(leftPage) {
    return `spread:${leftPage}`;
}

export function getSpreadPhotoOverride(albumId, leftPage) {
    if (!albumId || leftPage == null) return null;
    const album = readAll()[albumId];
    return album?.[spreadStorageKey(leftPage)] ?? null;
}

export function getPagePhotoOverride(albumId, pageNum) {
    if (!albumId || pageNum == null) return null;
    const album = readAll()[albumId];
    return album?.[String(pageNum)] ?? null;
}

/** Per-slot image: whole-spread photo (panoramic) or single-page override. */
export function getGridSlotPhoto(albumId, pageNum, cellId, spreadLeftPage) {
    const spreadSrc = getSpreadPhotoOverride(albumId, spreadLeftPage);
    if (spreadSrc) {
        return { src: spreadSrc, panoramic: cellId === 1 ? 'left' : 'right' };
    }
    const pageSrc = getPagePhotoOverride(albumId, pageNum);
    if (pageSrc) return { src: pageSrc, panoramic: null };
    return { src: null, panoramic: null };
}

export function hasGridSlotPhoto(albumId, pageNum, cellId, spreadLeftPage) {
    if (getSpreadPhotoOverride(albumId, spreadLeftPage)) return true;
    return Boolean(getPagePhotoOverride(albumId, pageNum));
}

export function getAlbumPhotoRevision(albumId) {
    const album = readAll()[albumId];
    return album?.__revision ?? 0;
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Assign uploaded images to album pages.
 * Pass `targets` (page indices) to fill specific grid slots; otherwise sequential from startPage.
 */
export async function assignPhotosFromFiles(
    albumId,
    files,
    { startPage = 1, totalPages = 21, targets } = {}
) {
    if (!albumId || !files?.length) return 0;

    const all = readAll();
    const album = { ...(all[albumId] || {}) };
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    const pageQueue =
        targets?.length > 0
            ? targets
            : imageFiles.map((_, i) => startPage + i);
    let assigned = 0;

    for (let i = 0; i < imageFiles.length; i++) {
        const page = pageQueue[i];
        if (page == null || page < 0 || page >= totalPages) break;
        try {
            album[String(page)] = await readFileAsDataUrl(imageFiles[i]);
            assigned += 1;
        } catch (e) {
            console.warn('Skip file', imageFiles[i].name, e);
        }
    }

    album.__revision = (album.__revision || 0) + 1;
    all[albumId] = album;
    writeAll(all);
    return assigned;
}

export function setPagePhotoFromDataUrl(albumId, pageNum, dataUrl, { clearSpreadForLeft } = {}) {
    if (!albumId || pageNum == null || !dataUrl) return false;
    const all = readAll();
    const album = { ...(all[albumId] || {}) };
    if (clearSpreadForLeft != null) {
        delete album[spreadStorageKey(clearSpreadForLeft)];
    }
    album[String(pageNum)] = dataUrl;
    album.__revision = (album.__revision || 0) + 1;
    all[albumId] = album;
    writeAll(all);
    return true;
}

export function clearPagePhoto(albumId, pageNum) {
    if (!albumId || pageNum == null) return false;
    const all = readAll();
    const album = { ...(all[albumId] || {}) };
    if (!(String(pageNum) in album)) return false;
    delete album[String(pageNum)];
    album.__revision = (album.__revision || 0) + 1;
    all[albumId] = album;
    writeAll(all);
    return true;
}

/** Remove all placed photos from album pages (collection is unchanged). */
export function clearAllAlbumPagePhotos(albumId, { totalPages = 21 } = {}) {
    if (!albumId) return 0;
    const all = readAll();
    const prev = all[albumId] || {};
    let cleared = 0;
    for (const key of Object.keys(prev)) {
        if (key !== '__revision') cleared += 1;
    }
    all[albumId] = { __revision: (prev.__revision || 0) + 1 };
    writeAll(all);
    return cleared;
}

/** One image across the full spread (left + right pages). */
export function setSpreadPhoto(albumId, leftPage, dataUrl, rightPage) {
    if (!albumId || leftPage == null || !dataUrl) return false;
    const all = readAll();
    const album = { ...(all[albumId] || {}) };
    album[spreadStorageKey(leftPage)] = dataUrl;
    delete album[String(leftPage)];
    if (rightPage != null) delete album[String(rightPage)];
    album.__revision = (album.__revision || 0) + 1;
    all[albumId] = album;
    writeAll(all);
    return true;
}

export function placeCollectionPhotoOnPages(albumId, dataUrl, pageIndices, { spreadLeftPage } = {}) {
    if (!albumId || !dataUrl || !pageIndices?.length) return 0;
    let placed = 0;
    for (const page of pageIndices) {
        if (setPagePhotoFromDataUrl(albumId, page, dataUrl, { clearSpreadForLeft: spreadLeftPage }))
            placed += 1;
    }
    return placed;
}
