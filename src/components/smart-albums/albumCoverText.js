import { resolveCoverImageSrc } from './albumPagePhotos';

const STORAGE_KEY = 'pixnxt_album_cover_text';

export const COVER_TEXT_CHANGED_EVENT = 'pixnxt-album-cover-text-changed';

function notifyCoverTextChanged(albumId) {
    try {
        window.dispatchEvent(
            new CustomEvent(COVER_TEXT_CHANGED_EVENT, { detail: { albumId } })
        );
    } catch {
        /* ignore */
    }
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
    } catch {
        /* ignore */
    }
}

/** @returns {string} */
export function getAlbumCoverText(albumId) {
    if (!albumId) return '';
    const row = readAll()[albumId];
    const text = row?.message;
    return typeof text === 'string' ? text.trim() : '';
}

export function setAlbumCoverText(albumId, message) {
    if (!albumId) return;
    const trimmed = String(message ?? '').trim();
    const all = readAll();
    if (!trimmed) {
        if (!all[albumId]) return;
        delete all[albumId];
        writeAll(all);
        notifyCoverTextChanged(albumId);
        return;
    }
    all[albumId] = { message: trimmed, updatedAt: Date.now() };
    writeAll(all);
    notifyCoverTextChanged(albumId);
}

export function clearAlbumCoverText(albumId) {
    setAlbumCoverText(albumId, '');
}

/** Custom cover message, or album title when no cover photo has been uploaded. */
export function resolveFrontCoverDisplayText(album, albumId) {
    const custom = getAlbumCoverText(albumId);
    if (custom) return custom;

    const hasCoverPhoto = Boolean(resolveCoverImageSrc(album, { showSamples: false }));
    if (hasCoverPhoto) return '';

    return String(album?.name ?? '').trim();
}
