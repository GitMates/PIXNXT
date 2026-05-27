import { supabase } from '../lib/supabase/client';
import { smartAlbumsService } from './smartAlbums.service';

const LOCAL_KEY = 'pixnxt_smart_album_comments_local';
const GUEST_KEY_PREFIX = 'pixnxt_album_guest_';

export const COMMENTS_CHANGED_EVENT = 'pixnxt-album-comments-changed';

export function notifyCommentsChanged(albumId) {
    try {
        window.dispatchEvent(
            new CustomEvent(COMMENTS_CHANGED_EVENT, { detail: { albumId } })
        );
    } catch {
        /* ignore */
    }
}

function readLocal() {
    try {
        const raw = localStorage.getItem(LOCAL_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function writeLocal(data) {
    try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    } catch {
        /* ignore */
    }
}

function isMissingTableError(error) {
    const msg = error?.message || '';
    return (
        msg.includes('smart_album_comments') &&
        (msg.includes('does not exist') || msg.includes('schema cache'))
    );
}

function isNoRowsError(error) {
    return error?.code === 'PGRST116';
}

export function hasCommentBody(comment) {
    return Boolean((comment?.body || '').trim());
}

export function countMeaningfulComments(comments) {
    return (comments || []).filter(hasCommentBody).length;
}

function mapRow(row) {
    return {
        id: row.id,
        album_id: row.album_id,
        spread_index: row.spread_index,
        parent_id: row.parent_id,
        author_type: row.author_type,
        author_name: row.author_name || '',
        author_email: row.author_email || null,
        body: row.body || '',
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export function getGuestProfile(albumId) {
    try {
        const raw = localStorage.getItem(`${GUEST_KEY_PREFIX}${albumId}`);
        return raw ? JSON.parse(raw) : { name: '', email: '', drafts: {} };
    } catch {
        return { name: '', email: '', drafts: {} };
    }
}

export function saveGuestProfile(albumId, profile) {
    try {
        localStorage.setItem(`${GUEST_KEY_PREFIX}${albumId}`, JSON.stringify(profile));
    } catch {
        /* ignore */
    }
}

function listLocalAlbumComments(albumId, spreadIndex) {
    const bucket = readLocal()[albumId] || {};
    if (spreadIndex != null) {
        return (bucket[spreadIndex] || []).map((c) => mapRow(c));
    }
    const all = [];
    Object.keys(bucket).forEach((key) => {
        const idx = Number(key);
        (bucket[idx] || []).forEach((c) => all.push(mapRow(c)));
    });
    return all.sort(
        (a, b) =>
            a.spread_index - b.spread_index ||
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
}

export const smartAlbumCommentsService = {
    async listSpreadComments(albumId, spreadIndex) {
        const local = listLocalAlbumComments(albumId, spreadIndex);
        const { data, error } = await supabase
            .from('smart_album_comments')
            .select('*')
            .eq('album_id', albumId)
            .eq('spread_index', spreadIndex)
            .order('created_at', { ascending: true });

        if (error) {
            if (isMissingTableError(error)) {
                return local;
            }
            console.warn('listSpreadComments:', error.message);
            return local;
        }
        const remote = (data || []).map(mapRow);
        const merged = new Map();
        local.forEach((c) => merged.set(c.id, c));
        remote.forEach((c) => merged.set(c.id, c));
        return [...merged.values()].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
    },

    async listAlbumComments(albumId) {
        const local = listLocalAlbumComments(albumId);
        const { data, error } = await supabase
            .from('smart_album_comments')
            .select('*')
            .eq('album_id', albumId)
            .order('spread_index', { ascending: true })
            .order('created_at', { ascending: true });

        if (error) {
            if (isMissingTableError(error)) {
                return local;
            }
            console.warn('listAlbumComments:', error.message);
            return local;
        }
        const remote = (data || []).map(mapRow);
        const merged = new Map();
        local.forEach((c) => merged.set(c.id, c));
        remote.forEach((c) => merged.set(c.id, c));
        return [...merged.values()].sort(
            (a, b) =>
                a.spread_index - b.spread_index ||
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
    },

    async saveClientComment({ albumId, spreadIndex, commentId, body, authorName, authorEmail }) {
        const payload = {
            album_id: albumId,
            spread_index: spreadIndex,
            author_type: 'client',
            author_name: authorName || 'Guest',
            author_email: authorEmail || null,
            body: body.trim(),
            updated_at: new Date().toISOString(),
        };

        const saveLocal = (row) => {
            const saved = this._saveLocalComment(albumId, spreadIndex, row);
            notifyCommentsChanged(albumId);
            return saved;
        };

        if (commentId) {
            try {
                const { data, error } = await supabase
                    .from('smart_album_comments')
                    .update({ body: payload.body, updated_at: payload.updated_at })
                    .eq('id', commentId)
                    .select();

                if (!error && data?.[0]) {
                    notifyCommentsChanged(albumId);
                    return mapRow(data[0]);
                }
                if (error && !isMissingTableError(error)) {
                    console.warn('saveClientComment update:', error.message);
                }
            } catch (e) {
                console.warn('saveClientComment update failed:', e);
            }
            return saveLocal({ ...payload, id: commentId, created_at: new Date().toISOString() });
        }

        const insertPayload = {
            ...payload,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
        };

        try {
            const { data, error } = await supabase
                .from('smart_album_comments')
                .insert({
                    album_id: insertPayload.album_id,
                    spread_index: insertPayload.spread_index,
                    author_type: insertPayload.author_type,
                    author_name: insertPayload.author_name,
                    author_email: insertPayload.author_email,
                    body: insertPayload.body,
                    updated_at: insertPayload.updated_at,
                })
                .select();

            if (!error && data?.[0]) {
                notifyCommentsChanged(albumId);
                return mapRow(data[0]);
            }
            if (error && !isMissingTableError(error)) {
                console.warn('saveClientComment insert:', error.message);
            }
        } catch (e) {
            console.warn('saveClientComment insert failed:', e);
        }

        return saveLocal(insertPayload);
    },

    async deleteClientComment({ albumId, commentId }) {
        if (!commentId) return;

        const all = readLocal();
        const bucket = all[albumId];
        if (bucket) {
            Object.keys(bucket).forEach((key) => {
                bucket[key] = (bucket[key] || []).filter((c) => c.id !== commentId);
            });
            all[albumId] = bucket;
            writeLocal(all);
        }

        try {
            const { error } = await supabase
                .from('smart_album_comments')
                .delete()
                .eq('id', commentId);

            if (error && !isMissingTableError(error)) {
                console.warn('deleteClientComment:', error.message);
            }
        } catch (e) {
            console.warn('deleteClientComment failed:', e);
        }

        notifyCommentsChanged(albumId);
    },

    _saveLocalComment(albumId, spreadIndex, row) {
        const all = readLocal();
        const bucket = { ...(all[albumId] || {}) };
        const list = [...(bucket[spreadIndex] || [])];
        const idx = list.findIndex((c) => c.id === row.id);
        const entry = {
            ...row,
            parent_id: row.parent_id || null,
            created_at: row.created_at || new Date().toISOString(),
        };
        if (idx >= 0) list[idx] = entry;
        else list.push(entry);
        bucket[spreadIndex] = list;
        all[albumId] = bucket;
        writeLocal(all);
        return mapRow(entry);
    },

    async savePhotographerReply({ albumId, spreadIndex, parentId, body, authorName }) {
        const payload = {
            album_id: albumId,
            spread_index: spreadIndex,
            parent_id: parentId,
            author_type: 'photographer',
            author_name: authorName || 'Photographer',
            body: body.trim(),
        };

        const { data, error } = await supabase
            .from('smart_album_comments')
            .insert(payload)
            .select();

        if (error) {
            if (isMissingTableError(error)) {
                const saved = this._saveLocalComment(albumId, spreadIndex, {
                    ...payload,
                    id: crypto.randomUUID(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
                notifyCommentsChanged(albumId);
                return saved;
            }
            throw error;
        }

        if (!data?.[0]) throw error || new Error('Reply could not be saved.');
        notifyCommentsChanged(albumId);
        return mapRow(data[0]);
    },

    async setCommentsEnabled(photographerId, albumId, enabled) {
        return smartAlbumsService.updateAlbumClientSettings(photographerId, albumId, {
            comments_enabled: enabled,
        });
    },

    async getAlbumPublic(albumId) {
        const { data, error } = await supabase
            .from('smart_albums')
            .select('*')
            .eq('id', albumId)
            .maybeSingle();

        if (error) throw error;
        return data;
    },
};

export function groupCommentsByThread(comments) {
    const roots = comments.filter((c) => !c.parent_id);
    const replies = comments.filter((c) => c.parent_id);
    return roots.map((root) => ({
        root,
        replies: replies.filter((r) => r.parent_id === root.id),
    }));
}

/** Map spread comments to proof grid slots (1 = left, 2 = right). */
export function mapSpreadCommentsToCells(comments, { spreadIndex = 0 } = {}) {
    const byCell = { 1: [], 2: [] };
    const threads = groupCommentsByThread(comments || []).filter((t) => hasCommentBody(t.root));
    const sorted = [...threads].sort(
        (a, b) =>
            new Date(a.root.created_at).getTime() - new Date(b.root.created_at).getTime()
    );

    if (spreadIndex <= 0) {
        byCell[1] = sorted;
        return byCell;
    }

    sorted.forEach((thread, index) => {
        const cellId = (index % 2) + 1;
        byCell[cellId].push(thread);
    });
    return byCell;
}

export function groupCommentsBySpread(comments) {
    const map = new Map();
    comments.forEach((c) => {
        const key = c.spread_index;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(c);
    });
    return [...map.entries()]
        .sort(([a], [b]) => a - b)
        .map(([spreadIndex, rows]) => ({
            spreadIndex,
            spreadLabel: spreadIndex <= 0 ? 'Cover' : `Spread ${spreadIndex}`,
            threads: groupCommentsByThread(rows),
        }));
}
