import { supabase } from '../../lib/supabase/client';
import { storageService } from '../../services/storage.service';
import {
    buildUserModulePath,
    getPhotographerR2Folder,
    R2_USER_MODULES,
} from '../../lib/photographerR2Folder';

/** Shared helpers for album proofing feedback persisted in Supabase. */

export function isMissingRelationError(error, relationName) {
    const msg = error?.message || '';
    if (!msg) return false;
    const mentions =
        msg.includes(relationName) ||
        msg.includes('schema cache') ||
        /relation .* does not exist/i.test(msg) ||
        /Could not find the table/i.test(msg);
    return (
        mentions &&
        (msg.includes('does not exist') ||
            msg.includes('schema cache') ||
            msg.includes('Could not find'))
    );
}

export function isMissingColumnError(error, columnHint = '') {
    const msg = error?.message || '';
    if (!msg) return false;
    if (!/column|schema cache|Could not find/i.test(msg)) return false;
    if (!columnHint) return true;
    return msg.includes(columnHint);
}

function dataUrlToBlob(dataUrl) {
    const [header, data] = String(dataUrl).split(',');
    if (!header || data == null) throw new Error('Invalid attachment data.');
    const mimeMatch = header.match(/data:([^;]+)/);
    const mime = mimeMatch?.[1] || 'application/octet-stream';
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
}

/**
 * Upload a data-URL or keep an already-hosted URL for comment attachments.
 * Returns { url, name, type } suitable for smart_album_comments.
 */
export async function resolveCommentAttachmentForDb(
    albumId,
    attachmentUrl,
    attachmentName = null,
    attachmentType = null
) {
    if (!attachmentUrl) {
        return { url: null, name: null, type: null };
    }
    if (!String(attachmentUrl).startsWith('data:')) {
        return {
            url: attachmentUrl,
            name: attachmentName || null,
            type: attachmentType || null,
        };
    }
    if (!albumId) {
        throw new Error('Missing album for attachment upload.');
    }

    const blob = dataUrlToBlob(attachmentUrl);
    const type =
        attachmentType === 'audio' || attachmentType === 'image'
            ? attachmentType
            : blob.type.startsWith('audio/')
              ? 'audio'
              : 'image';
    const extFromName = attachmentName?.includes('.')
        ? attachmentName.split('.').pop()
        : null;
    const ext =
        extFromName ||
        (type === 'audio'
            ? blob.type.includes('mp4')
                ? 'm4a'
                : blob.type.includes('ogg')
                  ? 'ogg'
                  : 'webm'
            : 'jpg');
    const filename =
        attachmentName || (type === 'audio' ? `voice-message.${ext}` : `attachment.${ext}`);

    const { data: albumRow } = await supabase
        .from('album_proofer_albums')
        .select('photographer_id')
        .eq('id', albumId)
        .maybeSingle();
    const photographerFolder = await getPhotographerR2Folder(albumRow?.photographer_id);
    const path = buildUserModulePath(
        photographerFolder,
        R2_USER_MODULES.ALBUM_PROOFER,
        albumId,
        'feedback',
        `${crypto.randomUUID()}.${ext}`
    );
    const file = new File([blob], filename, { type: blob.type || undefined });
    const uploaded = await storageService.upload(path, file);
    return {
        url: uploaded.url,
        name: filename,
        type,
    };
}

/**
 * Photographer hydrate/mark must share the same viewer_key (auth user id).
 * Falls back to 'default' only when there is no session.
 */
export async function resolvePhotographerViewerKey(explicitKey) {
    if (explicitKey && explicitKey !== 'default') return explicitKey;
    try {
        const { data } = await supabase.auth.getSession();
        const userId = data?.session?.user?.id;
        if (userId) return userId;
    } catch {
        /* ignore */
    }
    return explicitKey || 'default';
}

export async function resolveFeedbackViewerKey(viewerRole, explicitKey, albumId = null) {
    if (viewerRole === 'photographer') {
        return resolvePhotographerViewerKey(explicitKey);
    }
    if (explicitKey && explicitKey !== 'default') return explicitKey;
    if (albumId) {
        try {
            const raw = localStorage.getItem(`pixnxt_album_guest_${albumId}`);
            const guest = raw ? JSON.parse(raw) : null;
            const key = guest?.email?.trim() || guest?.name?.trim();
            if (key) return key;
        } catch {
            /* ignore */
        }
    }
    return explicitKey || 'default';
}

function mergeSeenMaps(primary, fallback) {
    const map = { ...(primary || {}) };
    Object.entries(fallback || {}).forEach(([kind, items]) => {
        if (!map[kind]) map[kind] = {};
        Object.entries(items || {}).forEach(([itemId, seenAt]) => {
            const existing = map[kind][itemId];
            if (!existing) {
                map[kind][itemId] = seenAt;
                return;
            }
            if (new Date(seenAt).getTime() > new Date(existing).getTime()) {
                map[kind][itemId] = seenAt;
            }
        });
    });
    return map;
}

async function fetchFeedbackSeenMap(albumId, viewerRole, viewerKey) {
    const empty = {};
    const { data, error } = await supabase
        .from('album_proofer_feedback_seen')
        .select('item_kind, item_id, seen_at')
        .eq('album_id', albumId)
        .eq('viewer_role', viewerRole)
        .eq('viewer_key', viewerKey || 'default');
    if (error) {
        if (!isMissingRelationError(error, 'album_proofer_feedback_seen')) {
            console.warn('loadFeedbackSeenMap:', error.message);
        }
        return empty;
    }
    const map = {};
    (data || []).forEach((row) => {
        if (!map[row.item_kind]) map[row.item_kind] = {};
        map[row.item_kind][row.item_id] = row.seen_at;
    });
    return map;
}

export async function upsertFeedbackSeenRows(rows) {
    if (!rows?.length) return { ok: false, error: null };
    try {
        const { error } = await supabase.from('album_proofer_feedback_seen').upsert(rows, {
            onConflict: 'album_id,viewer_role,viewer_key,item_kind,item_id',
        });
        if (error) {
            if (!isMissingRelationError(error, 'album_proofer_feedback_seen')) {
                console.warn('upsertFeedbackSeenRows:', error.message);
            }
            return { ok: false, error };
        }
        return { ok: true, error: null };
    } catch (err) {
        console.warn('upsertFeedbackSeenRows failed:', err);
        return { ok: false, error: err };
    }
}

export async function loadFeedbackSeenMap(albumId, viewerRole, viewerKey = 'default') {
    const empty = {};
    if (!albumId) return empty;
    try {
        const key = viewerKey || 'default';
        const primary = await fetchFeedbackSeenMap(albumId, viewerRole, key);
        // Merge legacy rows written under 'default' so refresh keeps Done after the key fix.
        if (key !== 'default') {
            const legacy = await fetchFeedbackSeenMap(albumId, viewerRole, 'default');
            return mergeSeenMaps(primary, legacy);
        }
        return primary;
    } catch (err) {
        console.warn('loadFeedbackSeenMap failed:', err);
        return empty;
    }
}
