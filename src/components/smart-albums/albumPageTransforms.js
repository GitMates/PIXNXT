const STORAGE_KEY = 'pixnxt_album_page_transforms';

const DEFAULT = { x: 0, y: 0, scale: 1 };

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
        console.warn('Could not save page transforms', e);
    }
}

function spreadTransformKey(leftPage) {
    return `spread:${leftPage}`;
}

export function getSpreadPhotoTransform(albumId, leftPage) {
    if (!albumId || leftPage == null) return { ...DEFAULT };
    const album = readAll()[albumId];
    const t = album?.[spreadTransformKey(leftPage)];
    if (!t) return { ...DEFAULT };
    return {
        x: Number(t.x) || 0,
        y: Number(t.y) || 0,
        scale: Math.max(0.5, Math.min(3, Number(t.scale) || 1)),
    };
}

export function setSpreadPhotoTransform(albumId, leftPage, transform) {
    if (!albumId || leftPage == null) return;
    const all = readAll();
    const album = { ...(all[albumId] || {}) };
    album[spreadTransformKey(leftPage)] = {
        x: transform.x ?? 0,
        y: transform.y ?? 0,
        scale: Math.max(0.5, Math.min(3, transform.scale ?? 1)),
    };
    album.__revision = (album.__revision || 0) + 1;
    all[albumId] = album;
    writeAll(all);
}

export function getPagePhotoTransform(albumId, pageNum) {
    if (!albumId || pageNum == null) return { ...DEFAULT };
    const album = readAll()[albumId];
    const t = album?.[String(pageNum)];
    if (!t) return { ...DEFAULT };
    return {
        x: Number(t.x) || 0,
        y: Number(t.y) || 0,
        scale: Math.max(0.5, Math.min(3, Number(t.scale) || 1)),
    };
}

export function setPagePhotoTransform(albumId, pageNum, transform) {
    if (!albumId || pageNum == null) return;
    const all = readAll();
    const album = { ...(all[albumId] || {}) };
    album[String(pageNum)] = {
        x: transform.x ?? 0,
        y: transform.y ?? 0,
        scale: Math.max(0.5, Math.min(3, transform.scale ?? 1)),
    };
    album.__revision = (album.__revision || 0) + 1;
    all[albumId] = album;
    writeAll(all);
}

export function getTransformRevision(albumId) {
    return readAll()[albumId]?.__revision ?? 0;
}

export function clearAlbumTransforms(albumId) {
    const all = readAll();
    if (!all[albumId]) return;
    delete all[albumId];
    writeAll(all);
}
