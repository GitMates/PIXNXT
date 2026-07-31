const SHARE_PAUSED_AT_KEY = 'pixnxt_album_share_paused_at';

function readPausedMap() {
    if (typeof window === 'undefined') return {};
    try {
        const raw = localStorage.getItem(SHARE_PAUSED_AT_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export function readSharePausedAt(albumId) {
    if (!albumId) return null;
    const map = readPausedMap();
    return map[albumId] || null;
}

export function writeSharePausedAt(albumId, iso) {
    if (!albumId || typeof window === 'undefined') return;
    try {
        const map = readPausedMap();
        if (iso) map[albumId] = iso;
        else delete map[albumId];
        localStorage.setItem(SHARE_PAUSED_AT_KEY, JSON.stringify(map));
    } catch {
        /* ignore */
    }
}

/** Prefer in-memory album field, then local pause stamp. */
export function getAlbumSharePausedAt(album) {
    if (!album) return null;
    return album.share_link_paused_at || readSharePausedAt(album.id) || null;
}
