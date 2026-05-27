import { supabase } from '../lib/supabase/client';

const LOCAL_KEY = 'pixnxt_smart_album_comments_local';
const GUEST_KEY_PREFIX = 'pixnxt_album_guest_';

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
    return msg.includes('smart_album_comments') && (msg.includes('does not exist') || msg.includes('schema cache'));
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

export const smartAlbumCommentsService = {
    async listSpreadComments(albumId, spreadIndex) {
        const { data, error } = await supabase
            .from('smart_album_comments')
            .select('*')
            .eq('album_id', albumId)
            .eq('spread_index', spreadIndex)
            .order('created_at', { ascending: true });

        if (error) {
            if (isMissingTableError(error)) {
                const bucket = readLocal()[albumId] || {};
                return (bucket[spreadIndex] || []).map((c) => mapRow(c));
            }
            throw error;
        }
        return (data || []).map(mapRow);
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

        if (commentId) {
            const { data, error } = await supabase
                .from('smart_album_comments')
                .update({ body: payload.body, updated_at: payload.updated_at })
                .eq('id', commentId)
                .select()
                .single();

            if (error) {
                if (isMissingTableError(error)) {
                    return this._saveLocalComment(albumId, spreadIndex, { ...payload, id: commentId });
                }
                throw error;
            }
            return mapRow(data);
        }

        const { data, error } = await supabase
            .from('smart_album_comments')
            .insert(payload)
            .select()
            .single();

        if (error) {
            if (isMissingTableError(error)) {
                return this._saveLocalComment(albumId, spreadIndex, {
                    ...payload,
                    id: crypto.randomUUID(),
                });
            }
            throw error;
        }
        return mapRow(data);
    },

    _saveLocalComment(albumId, spreadIndex, row) {
        const all = readLocal();
        const bucket = { ...(all[albumId] || {}) };
        const list = [...(bucket[spreadIndex] || [])];
        const idx = list.findIndex((c) => c.id === row.id);
        const entry = { ...row, parent_id: row.parent_id || null, created_at: row.created_at || new Date().toISOString() };
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
            .select()
            .single();

        if (error) {
            if (isMissingTableError(error)) {
                return this._saveLocalComment(albumId, spreadIndex, {
                    ...payload,
                    id: crypto.randomUUID(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
            }
            throw error;
        }
        return mapRow(data);
    },

    async setCommentsEnabled(_photographerId, albumId, enabled) {
        const { error } = await supabase
            .from('smart_albums')
            .update({ comments_enabled: enabled, updated_at: new Date().toISOString() })
            .eq('id', albumId);

        if (error) throw error;
        return { id: albumId, comments_enabled: enabled };
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
