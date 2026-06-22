import { supabase } from '../lib/supabase/client';
import { smartAlbumsService } from './smartAlbums.service';

const LOCAL_KEY = 'pixnxt_smart_album_comments_local';
const SEEN_KEY = 'pixnxt_smart_album_comments_seen';
const GUEST_SEEN_KEY = 'pixnxt_smart_album_guest_comments_seen';
const SUBMITTED_KEY = 'pixnxt_smart_album_comments_submitted';
const GUEST_KEY_PREFIX = 'pixnxt_album_guest_';

export const COMMENTS_CHANGED_EVENT = 'pixnxt-album-comments-changed';
export const COMMENTS_SEEN_CHANGED_EVENT = 'pixnxt-album-comments-seen-changed';
export const GUEST_COMMENTS_SEEN_CHANGED_EVENT = 'pixnxt-album-guest-comments-seen-changed';

export function notifyCommentsChanged(albumId) {
    try {
        window.dispatchEvent(
            new CustomEvent(COMMENTS_CHANGED_EVENT, { detail: { albumId } })
        );
    } catch {
        /* ignore */
    }
}

export function notifyCommentsSeenChanged(albumId) {
    try {
        window.dispatchEvent(
            new CustomEvent(COMMENTS_SEEN_CHANGED_EVENT, { detail: { albumId } })
        );
    } catch {
        /* ignore */
    }
}

function readSeen() {
    try {
        const raw = localStorage.getItem(SEEN_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function writeSeen(data) {
    try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(data));
    } catch {
        /* ignore */
    }
}

/** True when the photographer has not viewed this comment since its last update. */
export function isCommentUnseen(albumId, comment) {
    if (!albumId || !comment?.id) return false;
    const seenAt = readSeen()[albumId]?.[comment.id];
    if (!seenAt) return true;
    const stamp = comment.updated_at || comment.created_at;
    if (!stamp) return false;
    return new Date(stamp).getTime() > new Date(seenAt).getTime();
}

export function markCommentsSeen(albumId, comments) {
    if (!albumId || !comments?.length) return;
    const all = readSeen();
    const bucket = { ...(all[albumId] || {}) };
    const now = new Date().toISOString();
    comments.forEach((comment) => {
        if (comment?.id) bucket[comment.id] = now;
    });
    all[albumId] = bucket;
    writeSeen(all);
    notifyCommentsSeenChanged(albumId);
}

function readGuestSeen() {
    try {
        const raw = localStorage.getItem(GUEST_SEEN_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function writeGuestSeen(data) {
    try {
        localStorage.setItem(GUEST_SEEN_KEY, JSON.stringify(data));
    } catch {
        /* ignore */
    }
}

export function notifyGuestCommentsSeenChanged(albumId) {
    try {
        window.dispatchEvent(
            new CustomEvent(GUEST_COMMENTS_SEEN_CHANGED_EVENT, { detail: { albumId } })
        );
    } catch {
        /* ignore */
    }
}

/** True when the client has not viewed a photographer comment/reply since its last update. */
export function isGuestCommentUnseen(albumId, comment) {
    if (!albumId || !comment?.id || comment.author_type !== 'photographer') return false;
    const seenAt = readGuestSeen()[albumId]?.[comment.id];
    if (!seenAt) return true;
    const stamp = comment.updated_at || comment.created_at;
    if (!stamp) return false;
    return new Date(stamp).getTime() > new Date(seenAt).getTime();
}

export function markGuestCommentsSeen(albumId, comments) {
    if (!albumId || !comments?.length) return;
    const all = readGuestSeen();
    const bucket = { ...(all[albumId] || {}) };
    const now = new Date().toISOString();
    comments.forEach((comment) => {
        if (comment?.id) bucket[comment.id] = now;
    });
    all[albumId] = bucket;
    writeGuestSeen(all);
    notifyGuestCommentsSeenChanged(albumId);
}

function readSubmitted() {
    try {
        const raw = localStorage.getItem(SUBMITTED_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function writeSubmitted(data) {
    try {
        localStorage.setItem(SUBMITTED_KEY, JSON.stringify(data));
    } catch {
        /* ignore */
    }
}

export function getCommentsSubmittedAt(albumId) {
    if (!albumId) return null;
    return readSubmitted()[albumId] || null;
}

export function markCommentsSubmitted(albumId) {
    if (!albumId) return;
    const all = readSubmitted();
    all[albumId] = new Date().toISOString();
    writeSubmitted(all);
    notifyCommentsChanged(albumId);
}

/** Short preview for sidebar comment cards (first N words). */
export function truncateCommentPreview(text, maxWords = 6, ellipsis = '....') {
    if (!text || typeof text !== 'string') return '';
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) return trimmed;
    return `${words.slice(0, maxWords).join(' ')}${ellipsis}`;
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

/** Time only for chat-style bubbles (e.g. 5:48 PM). */
export function formatCommentTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString([], {
        hour: 'numeric',
        minute: '2-digit',
    });
}

/** Centered feed date pill (e.g. 6/22/2026). Accepts ISO string or epoch ms. */
export function formatFeedDateLabel(isoOrMs) {
    if (isoOrMs == null || isoOrMs === '') return '';
    const d = new Date(isoOrMs);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString([], {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
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

export function normalizeCommentAuthorName(name) {
    return (name || 'Guest').trim().toLowerCase();
}

/** Client's single root comment on a spread (newest if duplicates exist). */
export function findGuestSpreadRootComment(comments, authorName) {
    const norm = normalizeCommentAuthorName(authorName);
    return (
        (comments || [])
            .filter(
                (c) =>
                    !c.parent_id &&
                    c.author_type === 'client' &&
                    hasCommentBody(c) &&
                    normalizeCommentAuthorName(c.author_name) === norm
            )
            .sort(
                (a, b) =>
                    new Date(b.updated_at || b.created_at).getTime() -
                    new Date(a.updated_at || a.created_at).getTime()
            )[0] || null
    );
}

export function countMeaningfulComments(comments) {
    return (comments || []).filter(hasCommentBody).length;
}

/** Root spread comments grouped by spread index (see groupRootCommentsBySpread). */
export function countSpreadComments(spreadCommentsBySpread) {
    return countMeaningfulComments(Object.values(spreadCommentsBySpread || {}).flat());
}

export function countUnseenSpreadComments(albumId, spreadCommentsBySpread) {
    return Object.values(spreadCommentsBySpread || {})
        .flat()
        .filter((comment) => isCommentUnseen(albumId, comment)).length;
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
                return local.filter((c) => c.spread_index === spreadIndex);
            }
            console.warn('listSpreadComments:', error.message);
            return local.filter((c) => c.spread_index === spreadIndex);
        }
        const remote = (data || []).map(mapRow);
        const merged = new Map();
        local.forEach((c) => merged.set(c.id, c));
        remote.forEach((c) => merged.set(c.id, c));
        return [...merged.values()]
            .filter((c) => c.spread_index === spreadIndex)
            .sort(
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
        let resolvedCommentId = commentId || null;
        if (resolvedCommentId) {
            const onSpread = listLocalAlbumComments(albumId, spreadIndex).some(
                (c) => c.id === resolvedCommentId
            );
            if (!onSpread) {
                const foreign = listLocalAlbumComments(albumId).find(
                    (c) => c.id === resolvedCommentId && c.spread_index !== spreadIndex
                );
                if (foreign) resolvedCommentId = null;
            }
        }

        if (!resolvedCommentId && authorName) {
            const existing = findGuestSpreadRootComment(
                listLocalAlbumComments(albumId, spreadIndex),
                authorName
            );
            if (existing) resolvedCommentId = existing.id;
        }

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

        if (resolvedCommentId) {
            try {
                const { data, error } = await supabase
                    .from('smart_album_comments')
                    .update({
                        body: payload.body,
                        spread_index: spreadIndex,
                        updated_at: payload.updated_at,
                    })
                    .eq('id', resolvedCommentId)
                    .eq('spread_index', spreadIndex)
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
            const localRow = listLocalAlbumComments(albumId, spreadIndex).find(
                (c) => c.id === resolvedCommentId
            );
            if (localRow) {
                return saveLocal({
                    ...payload,
                    id: resolvedCommentId,
                    created_at: localRow.created_at,
                });
            }
            resolvedCommentId = null;
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

    async consolidateClientSpreadComments(albumId, spreadIndex, authorName, keepCommentId) {
        if (!albumId || spreadIndex == null || !keepCommentId || !authorName) return;
        const rows = await this.listSpreadComments(albumId, spreadIndex);
        const norm = normalizeCommentAuthorName(authorName);
        const extras = rows.filter(
            (c) =>
                !c.parent_id &&
                c.author_type === 'client' &&
                hasCommentBody(c) &&
                normalizeCommentAuthorName(c.author_name) === norm &&
                c.id !== keepCommentId
        );
        for (const extra of extras) {
            await this.deleteClientComment({ albumId, commentId: extra.id });
        }
    },

    async saveClientCommentAndConsolidate(params) {
        const saved = await this.saveClientComment(params);
        if (saved?.id) {
            await this.consolidateClientSpreadComments(
                params.albumId,
                params.spreadIndex,
                params.authorName,
                saved.id
            );
        }
        return saved;
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
        const normalizedSpread = Number(spreadIndex);
        const list = [...(bucket[normalizedSpread] || [])];
        const idx = list.findIndex((c) => c.id === row.id);
        const base = idx >= 0 ? list[idx] : {};
        const entry = {
            ...base,
            ...row,
            spread_index: normalizedSpread,
            parent_id: row.parent_id ?? base.parent_id ?? null,
            created_at: row.created_at || base.created_at || new Date().toISOString(),
        };
        if (idx >= 0) list[idx] = entry;
        else list.push(entry);
        bucket[normalizedSpread] = list;
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

    async notifyPhotographerAlbumComments({
        albumId,
        guestName,
        guestEmail,
        siteOrigin,
        comments,
    }) {
        const payload = {
            albumId,
            guestName: guestName?.trim() || null,
            guestEmail: guestEmail?.trim() || null,
            siteOrigin:
                siteOrigin || (typeof window !== 'undefined' ? window.location.origin : ''),
            comments: (comments || [])
                .filter((c) => !c.parent_id && hasCommentBody(c))
                .map((c) => ({
                    spread_index: c.spread_index,
                    author_name: c.author_name,
                    body: c.body,
                    created_at: c.created_at,
                    updated_at: c.updated_at,
                })),
        };

        const { data, error } = await supabase.functions.invoke('send-album-comments-email', {
            body: payload,
        });

        if (error) {
            throw new Error(error.message || 'Could not send notification email');
        }
        if (data?.error) {
            throw new Error(data.error);
        }
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
            spreadLabel: spreadIndex <= 0 ? 'Cover' : `Spread ${Number(spreadIndex) + 1}`,
            threads: groupCommentsByThread(rows),
        }));
}
