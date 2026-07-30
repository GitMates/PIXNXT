import { getSwapMarks } from './albumSwapMarks';

/** Client-preview guard before comments, swaps, or pins are saved locally. */
export function canClientLeaveFeedback(albumId, prooferAccess, action = 'comment') {
    if (!albumId || !prooferAccess) return { ok: true };

    if (prooferAccess.feedbackLocked) {
        return {
            ok: false,
            code: 'feedback-locked',
            message: 'This album has been approved. Feedback is closed.',
        };
    }

    if (action === 'comment' && prooferAccess.commentsEnabled === false) {
        return {
            ok: false,
            code: 'comments-disabled',
            message: 'Comments are turned off for this album.',
        };
    }

    if (action === 'swap' && prooferAccess.swapsEnabled === false) {
        return {
            ok: false,
            code: 'swaps-disabled',
            message: 'Swap requests are turned off for this album.',
        };
    }

    if (action === 'swap') {
        const max = Number(prooferAccess.maxFreeSwaps);
        if (Number.isFinite(max) && max >= 0) {
            const count = getSwapMarks(albumId).length;
            if (count >= max) {
                return {
                    ok: false,
                    code: 'swap-limit',
                    message:
                        max === 0
                            ? 'Swap requests are not available for this album.'
                            : `You have used all ${max} free swap request${max === 1 ? '' : 's'}.`,
                };
            }
        }
    }

    return { ok: true };
}

export function canClientAttachImage(prooferAccess, { clientPreview = true } = {}) {
    if (!clientPreview) return true;
    return Boolean(prooferAccess?.allowExternalUploads);
}

export function canClientRecordVoice(prooferAccess, { clientPreview = true } = {}) {
    if (!clientPreview) return true;
    return prooferAccess?.allowVoiceRecordings !== false;
}

export function mergeAlbumClientFlagsFromProoferAccess(album) {
    if (!album) return album;
    const access = album.preview_data?.proofer_access;
    if (!access) return album;

    const locked = Boolean(access.feedbackLocked || album.client_approved_at);

    return {
        ...album,
        comments_enabled: locked
            ? false
            : access.commentsEnabled !== undefined
              ? access.commentsEnabled
              : album.comments_enabled,
        messages_enabled: locked
            ? false
            : access.swapsEnabled !== undefined
              ? access.swapsEnabled
              : album.messages_enabled,
        replies_enabled: locked
            ? false
            : access.repliesEnabled !== undefined
              ? access.repliesEnabled
              : album.replies_enabled,
        share_link_enabled:
            access.shareLinkEnabled !== undefined
                ? access.shareLinkEnabled
                : album.share_link_enabled,
    };
}
