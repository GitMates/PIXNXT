import { supabase } from '../../lib/supabase/client';
import { storageService } from '../../services/storage.service';

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
    const path = `album-proofer/${albumId}/feedback/${crypto.randomUUID()}.${ext}`;
    const file = new File([blob], filename, { type: blob.type || undefined });
    const uploaded = await storageService.upload(path, file);
    return {
        url: uploaded.url,
        name: filename,
        type,
    };
}

export async function upsertFeedbackSeenRows(rows) {
    if (!rows?.length) return;
    try {
        const { error } = await supabase.from('album_proofer_feedback_seen').upsert(rows, {
            onConflict: 'album_id,viewer_role,viewer_key,item_kind,item_id',
        });
        if (error && !isMissingRelationError(error, 'album_proofer_feedback_seen')) {
            console.warn('upsertFeedbackSeenRows:', error.message);
        }
    } catch (err) {
        console.warn('upsertFeedbackSeenRows failed:', err);
    }
}

export async function loadFeedbackSeenMap(albumId, viewerRole, viewerKey = 'default') {
    const empty = {};
    if (!albumId) return empty;
    try {
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
    } catch (err) {
        console.warn('loadFeedbackSeenMap failed:', err);
        return empty;
    }
}
