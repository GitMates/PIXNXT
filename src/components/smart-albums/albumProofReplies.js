const STORAGE_KEY = 'pixnxt_album_proof_replies';
export const PROOF_REPLIES_CHANGED_EVENT = 'pixnxt-album-proof-replies-changed';

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

function notify(albumId) {
    try {
        window.dispatchEvent(
            new CustomEvent(PROOF_REPLIES_CHANGED_EVENT, { detail: { albumId } })
        );
    } catch {
        /* ignore */
    }
}

/** @param {'photo-pin'|'swap'|'client-message'|'photographer-message'} kind */
export function makeProofReplyParentKey(kind, id) {
    if (!kind || !id) return '';
    return `${kind}:${id}`;
}

export function getProofReplies(albumId, parentKey) {
    if (!albumId || !parentKey) return [];
    const list = readAll()[albumId]?.[parentKey];
    return Array.isArray(list) ? list : [];
}

export function getAllProofRepliesForAlbum(albumId) {
    if (!albumId) return {};
    return { ...(readAll()[albumId] || {}) };
}

export function addProofReply(albumId, parentKey, { body, authorName } = {}) {
    const text = String(body || '').trim();
    if (!albumId || !parentKey || !text) return null;

    const reply = {
        id: `reply_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        body: text,
        authorName: String(authorName || 'Photographer').trim() || 'Photographer',
        authorType: 'photographer',
        createdAt: new Date().toISOString(),
    };

    const all = readAll();
    const albumBucket = { ...(all[albumId] || {}) };
    const existing = Array.isArray(albumBucket[parentKey]) ? albumBucket[parentKey] : [];
    albumBucket[parentKey] = [...existing, reply];
    all[albumId] = albumBucket;
    writeAll(all);
    notify(albumId);
    return reply;
}
