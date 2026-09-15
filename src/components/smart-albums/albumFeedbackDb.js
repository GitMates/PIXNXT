import { storageService } from '../../services/storage.service';

/** Shared helpers for album proofing feedback persisted via the Workers API. */

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
 * Uses the share-gated album attachment endpoint so guests (clients on the
 * album link) can attach photos/voice notes without a photographer session.
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

    const { apiBase, getAccessToken } = await import('../../lib/api/client');
    const headers = {
        'Content-Type': blob.type || (type === 'audio' ? 'audio/webm' : 'image/jpeg'),
        'X-File-Name': filename,
    };
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(
        `${apiBase()}/v1/proofer/albums/${encodeURIComponent(albumId)}/attachments`,
        {
            method: 'POST',
            headers,
            credentials: 'include',
            body: blob,
        }
    );
    if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error?.message || `Attachment upload failed (${res.status})`);
    }
    const data = await res.json().catch(() => ({}));
    const path = data?.path;
    if (!path) throw new Error('Attachment upload returned no path.');
    return {
        url: storageService.getPublicUrl(path),
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
        const { getUser } = await import('../../services/auth.service');
        const user = await getUser().catch(() => null);
        if (user?.id) return user.id;
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
    try {
        const { apiFetch } = await import('../../lib/api/client');
        const data = await apiFetch(
            `/v1/proofer/albums/${albumId}/seen?role=${encodeURIComponent(viewerRole)}&key=${encodeURIComponent(viewerKey || 'default')}`
        );
        const map = {};
        for (const row of data?.seen || []) {
            if (!map[row.item_kind]) map[row.item_kind] = {};
            map[row.item_kind][row.item_id] = row.seen_at;
        }
        return map;
    } catch (err) {
        console.warn('loadFeedbackSeenMap:', err?.message || err);
        return empty;
    }
}

export async function upsertFeedbackSeenRows(rows) {
    if (!rows?.length) return { ok: false, error: null };
    try {
        const { apiFetch } = await import('../../lib/api/client');
        const byAlbum = new Map();
        for (const row of rows) {
            if (!byAlbum.has(row.album_id)) byAlbum.set(row.album_id, []);
            byAlbum.get(row.album_id).push(row);
        }
        for (const [albumId, group] of byAlbum) {
            const first = group[0];
            await apiFetch(`/v1/proofer/albums/${albumId}/seen`, {
                method: 'POST',
                body: {
                    viewerRole: first.viewer_role,
                    viewerKey: first.viewer_key,
                    items: group.map((r) => ({ kind: r.item_kind, id: String(r.item_id) })),
                },
            });
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
