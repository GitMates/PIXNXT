import { apiFetch } from '../../lib/api/client';

/** In-memory cache hydrated via the Workers API. */
const repliesByAlbum = Object.create(null);

export const PROOF_REPLIES_CHANGED_EVENT = 'pixnxt-album-proof-replies-changed';

function notify(albumId) {
    try {
        window.dispatchEvent(
            new CustomEvent(PROOF_REPLIES_CHANGED_EVENT, { detail: { albumId } })
        );
    } catch {
        /* ignore */
    }
}

function mapReplyRow(row) {
    return {
        id: row.id,
        body: row.body || '',
        authorName: row.author_name || '',
        authorType: row.author_type === 'client' ? 'client' : 'photographer',
        createdAt: row.created_at,
    };
}

/** @param {'photo-pin'|'swap'|'client-message'|'photographer-message'} kind */
export function makeProofReplyParentKey(kind, id) {
    if (!kind || !id) return '';
    return `${kind}:${id}`;
}

export function getProofReplies(albumId, parentKey) {
    if (!albumId || !parentKey) return [];
    const list = repliesByAlbum[albumId]?.[parentKey];
    return Array.isArray(list) ? list : [];
}

export function getAllProofRepliesForAlbum(albumId) {
    if (!albumId) return {};
    return { ...(repliesByAlbum[albumId] || {}) };
}

export async function hydrateProofReplies(albumId) {
    if (!albumId) return {};
    try {
        const data = await apiFetch(`/v1/proofer/albums/${albumId}/replies`).catch(() => null);
        const rows = data?.replies || [];
        const bucket = {};
        rows.forEach((row) => {
            const key = row.parent_key;
            if (!bucket[key]) bucket[key] = [];
            bucket[key].push(mapReplyRow(row));
        });
        repliesByAlbum[albumId] = bucket;
        notify(albumId);
        return bucket;
    } catch (err) {
        console.warn('hydrateProofReplies failed:', err);
        return getAllProofRepliesForAlbum(albumId);
    }
}

export function addProofReply(albumId, parentKey, { body, authorName, authorType } = {}) {
    const text = String(body || '').trim();
    if (!albumId || !parentKey || !text) return null;

    const type = authorType === 'client' ? 'client' : 'photographer';
    const reply = {
        id: crypto.randomUUID(),
        body: text,
        authorName:
            String(authorName || (type === 'client' ? 'Guest' : 'Photographer')).trim() ||
            (type === 'client' ? 'Guest' : 'Photographer'),
        authorType: type,
        createdAt: new Date().toISOString(),
    };

    const albumBucket = { ...(repliesByAlbum[albumId] || {}) };
    const existing = Array.isArray(albumBucket[parentKey]) ? albumBucket[parentKey] : [];
    albumBucket[parentKey] = [...existing, reply];
    repliesByAlbum[albumId] = albumBucket;
    notify(albumId);

    void (async () => {
        try {
            await apiFetch(`/v1/proofer/albums/${albumId}/replies`, {
                method: 'POST',
                body: {
                    parentKey: parentKey,
                    body: reply.body,
                    authorName: reply.authorName,
                    authorType: type,
                },
            });
        } catch (err) {
            console.warn('addProofReply persist failed:', err);
        }
    })();

    return reply;
}
