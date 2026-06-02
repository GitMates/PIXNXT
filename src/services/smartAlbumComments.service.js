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

/** Date and time for comment cards (editor feed, spread chips). */
export function formatCommentDateTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
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
        resolved: Boolean(row.resolved),
        resolved_at: row.resolved_at || null,
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

function removeLocalCommentTree(albumId, commentId) {
    const all = readLocal();
    const bucket = all[albumId];
    if (!bucket) return;
    const allRows = Object.keys(bucket).flatMap((key) => bucket[key] || []);
    const toDelete = new Set([commentId]);
    let changed = true;
    while (changed) {
        changed = false;
        allRows.forEach((row) => {
            if (row.parent_id && toDelete.has(row.parent_id) && !toDelete.has(row.id)) {
                toDelete.add(row.id);
                changed = true;
            }
        });
    }
    Object.keys(bucket).forEach((key) => {
        bucket[key] = (bucket[key] || []).filter((c) => !toDelete.has(c.id));
    });
    all[albumId] = bucket;
    writeLocal(all);
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

    async savePhotographerComment({ albumId, spreadIndex, body, authorName }) {
        const payload = {
            album_id: albumId,
            spread_index: spreadIndex,
            author_type: 'photographer',
            author_name: authorName || 'Photographer',
            body: body.trim(),
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
        };

        const saveLocal = () => {
            const saved = this._saveLocalComment(albumId, spreadIndex, {
                ...payload,
                id: crypto.randomUUID(),
            });
            notifyCommentsChanged(albumId);
            return saved;
        };

        try {
            const { data, error } = await supabase
                .from('smart_album_comments')
                .insert({
                    album_id: payload.album_id,
                    spread_index: payload.spread_index,
                    author_type: payload.author_type,
                    author_name: payload.author_name,
                    body: payload.body,
                    updated_at: payload.updated_at,
                })
                .select();

            if (!error && data?.[0]) {
                notifyCommentsChanged(albumId);
                return mapRow(data[0]);
            }
            if (error && !isMissingTableError(error)) {
                console.warn('savePhotographerComment insert:', error.message);
            }
        } catch (e) {
            console.warn('savePhotographerComment insert failed:', e);
        }

        return saveLocal();
    },

    async deleteClientComment({ albumId, commentId }) {
        if (!commentId) return;
        removeLocalCommentTree(albumId, commentId);

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

    async updateCommentBody({ albumId, spreadIndex, commentId, body }) {
        const nextBody = (body || '').trim();
        const updatedAt = new Date().toISOString();
        try {
            const { data, error } = await supabase
                .from('smart_album_comments')
                .update({ body: nextBody, updated_at: updatedAt })
                .eq('id', commentId)
                .select();
            if (!error && data?.[0]) {
                notifyCommentsChanged(albumId);
                return mapRow(data[0]);
            }
            if (error && !isMissingTableError(error)) {
                console.warn('updateCommentBody:', error.message);
            }
        } catch (e) {
            console.warn('updateCommentBody failed:', e);
        }
        const saved = this._saveLocalComment(albumId, spreadIndex, {
            id: commentId,
            spread_index: spreadIndex,
            body: nextBody,
            updated_at: updatedAt,
        });
        notifyCommentsChanged(albumId);
        return saved;
    },

    async deleteComment({ albumId, commentId }) {
        if (!commentId) return;
        removeLocalCommentTree(albumId, commentId);
        try {
            const { error } = await supabase.from('smart_album_comments').delete().eq('id', commentId);
            if (error && !isMissingTableError(error)) {
                console.warn('deleteComment:', error.message);
            }
        } catch (e) {
            console.warn('deleteComment failed:', e);
        }
        notifyCommentsChanged(albumId);
    },

    _saveLocalComment(albumId, spreadIndex, row) {
        const all = readLocal();
        const bucket = { ...(all[albumId] || {}) };
        const list = [...(bucket[spreadIndex] || [])];
        const idx = list.findIndex((c) => c.id === row.id);
        const base = idx >= 0 ? list[idx] : {};
        const entry = {
            ...base,
            ...row,
            parent_id: row.parent_id ?? base.parent_id ?? null,
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
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
        };

        const saveLocal = () => {
            const saved = this._saveLocalComment(albumId, spreadIndex, {
                ...payload,
                id: crypto.randomUUID(),
            });
            notifyCommentsChanged(albumId);
            return saved;
        };

        try {
            const { data, error } = await supabase
                .from('smart_album_comments')
                .insert({
                    album_id: payload.album_id,
                    spread_index: payload.spread_index,
                    parent_id: payload.parent_id,
                    author_type: payload.author_type,
                    author_name: payload.author_name,
                    body: payload.body,
                    updated_at: payload.updated_at,
                })
                .select();

            if (!error && data?.[0]) {
                notifyCommentsChanged(albumId);
                return mapRow(data[0]);
            }
            if (error && !isMissingTableError(error)) {
                console.warn('savePhotographerReply insert:', error.message);
            }
        } catch (e) {
            console.warn('savePhotographerReply insert failed:', e);
        }

        return saveLocal();
    },

    async saveClientReply({ albumId, spreadIndex, parentId, body, authorName, authorEmail }) {
        const payload = {
            album_id: albumId,
            spread_index: spreadIndex,
            parent_id: parentId,
            author_type: 'client',
            author_name: authorName || 'Guest',
            author_email: authorEmail || null,
            body: body.trim(),
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
        };

        try {
            const { data, error } = await supabase
                .from('smart_album_comments')
                .insert({
                    album_id: payload.album_id,
                    spread_index: payload.spread_index,
                    parent_id: payload.parent_id,
                    author_type: payload.author_type,
                    author_name: payload.author_name,
                    author_email: payload.author_email,
                    body: payload.body,
                    updated_at: payload.updated_at,
                })
                .select();

            if (!error && data?.[0]) {
                notifyCommentsChanged(albumId);
                return mapRow(data[0]);
            }
            if (error && !isMissingTableError(error)) {
                console.warn('saveClientReply insert:', error.message);
            }
        } catch (e) {
            console.warn('saveClientReply insert failed:', e);
        }

        const saved = this._saveLocalComment(albumId, spreadIndex, {
            ...payload,
            id: crypto.randomUUID(),
        });
        notifyCommentsChanged(albumId);
        return saved;
    },

    async setThreadResolved({ albumId, spreadIndex, rootId, resolved }) {
        const payload = {
            resolved: Boolean(resolved),
            resolved_at: resolved ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
        };
        try {
            const { data, error } = await supabase
                .from('smart_album_comments')
                .update(payload)
                .eq('id', rootId)
                .eq('parent_id', null)
                .select();
            if (!error && data?.[0]) {
                notifyCommentsChanged(albumId);
                return mapRow(data[0]);
            }
            if (error && !isMissingTableError(error) && !isNoRowsError(error)) {
                console.warn('setThreadResolved:', error.message);
            }
        } catch (e) {
            console.warn('setThreadResolved failed:', e);
        }
        const saved = this._saveLocalComment(albumId, spreadIndex, {
            id: rootId,
            spread_index: spreadIndex,
            ...payload,
        });
        notifyCommentsChanged(albumId);
        return saved;
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
    return roots
        .map((root) => ({
            root,
            replies: replies.filter((r) => r.parent_id === root.id),
        }))
        .sort((a, b) => {
            if (Boolean(a.root.resolved) !== Boolean(b.root.resolved)) {
                return a.root.resolved ? 1 : -1;
            }
            return new Date(a.root.created_at).getTime() - new Date(b.root.created_at).getTime();
        });
}

export function groupRootCommentsBySpread(comments) {
    const map = {};
    (comments || [])
        .filter((c) => !c.parent_id && hasCommentBody(c))
        .forEach((c) => {
            const key = c.spread_index;
            if (!map[key]) map[key] = [];
            map[key].push(c);
        });
    Object.keys(map).forEach((key) => {
        map[key].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
    });
    return map;
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
