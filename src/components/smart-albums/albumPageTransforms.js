const STORAGE_KEY = 'pixnxt_album_page_transforms';

const DEFAULT = { x: 0, y: 0, scaleX: 1, scaleY: 1 };

const SCALE_MIN = 0.5;
const SCALE_MAX = 3;

function clampScale(value) {
    return Math.max(SCALE_MIN, Math.min(SCALE_MAX, value));
}

/** Normalize stored transform (supports legacy `scale` field). */
export function normalizePhotoTransform(t) {
    if (!t) return { ...DEFAULT };
    const legacyScale = Number(t.scale) || 1;
    return {
        x: Number(t.x) || 0,
        y: Number(t.y) || 0,
        scaleX: clampScale(t.scaleX != null ? Number(t.scaleX) : legacyScale),
        scaleY: clampScale(t.scaleY != null ? Number(t.scaleY) : legacyScale),
    };
}

export function photoTransformStyle(transform) {
    const t = normalizePhotoTransform(transform);
    return {
        transform: `translate(${t.x}%, ${t.y}%) scale(${t.scaleX}, ${t.scaleY})`,
    };
}

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

function persistTransform(transform) {
    const t = normalizePhotoTransform(transform);
    return {
        x: t.x,
        y: t.y,
        scaleX: t.scaleX,
        scaleY: t.scaleY,
    };
}

export function getSpreadPhotoTransform(albumId, leftPage) {
    if (!albumId || leftPage == null) return { ...DEFAULT };
    const album = readAll()[albumId];
    return normalizePhotoTransform(album?.[spreadTransformKey(leftPage)]);
}

export function setSpreadPhotoTransform(albumId, leftPage, transform) {
    if (!albumId || leftPage == null) return;
    const all = readAll();
    const album = { ...(all[albumId] || {}) };
    album[spreadTransformKey(leftPage)] = persistTransform(transform);
    album.__revision = (album.__revision || 0) + 1;
    all[albumId] = album;
    writeAll(all);
}

export function getPagePhotoTransform(albumId, pageNum) {
    if (!albumId || pageNum == null) return { ...DEFAULT };
    const album = readAll()[albumId];
    return normalizePhotoTransform(album?.[String(pageNum)]);
}

export function setPagePhotoTransform(albumId, pageNum, transform) {
    if (!albumId || pageNum == null) return;
    const all = readAll();
    const album = { ...(all[albumId] || {}) };
    album[String(pageNum)] = persistTransform(transform);
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
