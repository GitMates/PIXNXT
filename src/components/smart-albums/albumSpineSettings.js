import { clearWrapSegmentCache } from './bookWrapSegment';
import { clearBook3dTextureCache } from './3d/book3dPageCanvas';
import { getRemotePreviewData } from './albumPreviewData';

const STORAGE_KEY = 'pixnxt_album_spine_bounds';

export const SPINE_BOUNDS_CHANGED_EVENT = 'pixnxt-album-spine-bounds-changed';

function notifySpineBoundsChanged(albumId) {
    try {
        window.dispatchEvent(
            new CustomEvent(SPINE_BOUNDS_CHANGED_EVENT, { detail: { albumId } })
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

/** @returns {{ spineStartFraction: number, spineEndFraction: number } | null} */
export function getAlbumSpineBoundsOverride(albumId) {
    if (!albumId) return null;
    const row = readAll()[albumId];
    if (
        row &&
        Number.isFinite(row.spineStartFraction) &&
        Number.isFinite(row.spineEndFraction)
    ) {
        return {
            spineStartFraction: row.spineStartFraction,
            spineEndFraction: row.spineEndFraction,
        };
    }
    const remote = getRemotePreviewData(albumId)?.spine_bounds;
    if (
        remote &&
        Number.isFinite(remote.spineStartFraction) &&
        Number.isFinite(remote.spineEndFraction)
    ) {
        return {
            spineStartFraction: remote.spineStartFraction,
            spineEndFraction: remote.spineEndFraction,
        };
    }
    return null;
}

export function setAlbumSpineBoundsOverride(albumId, spineStartFraction, spineEndFraction) {
    if (!albumId) return;
    const all = readAll();
    all[albumId] = {
        spineStartFraction,
        spineEndFraction,
        updatedAt: Date.now(),
    };
    writeAll(all);
    clearWrapSegmentCache();
    clearBook3dTextureCache();
    notifySpineBoundsChanged(albumId);
}

export function clearAlbumSpineBoundsOverride(albumId) {
    if (!albumId) return;
    const all = readAll();
    if (!all[albumId]) return;
    delete all[albumId];
    writeAll(all);
    clearWrapSegmentCache();
    clearBook3dTextureCache();
    notifySpineBoundsChanged(albumId);
}
