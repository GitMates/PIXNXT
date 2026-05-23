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

export function getPagePhotoOverride(albumId, pageNum) {
    if (!albumId || pageNum == null) return null;
    const album = readAll()[albumId];
    return album?.[String(pageNum)] ?? null;
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
 * Assign uploaded images to album pages starting at startPage (default 1, skips cover).
 */
export async function assignPhotosFromFiles(albumId, files, { startPage = 1, totalPages = 21 } = {}) {
    if (!albumId || !files?.length) return 0;

    const all = readAll();
    const album = { ...(all[albumId] || {}) };
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    let page = startPage;
    let assigned = 0;

    for (const file of imageFiles) {
        if (page >= totalPages) break;
        try {
            album[String(page)] = await readFileAsDataUrl(file);
            assigned += 1;
            page += 1;
        } catch (e) {
            console.warn('Skip file', file.name, e);
        }
    }

    album.__revision = (album.__revision || 0) + 1;
    all[albumId] = album;
    writeAll(all);
    return assigned;
}
