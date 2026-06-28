import { getSwapMarks } from './albumSwapMarks';
import { getGuestProfile } from '../../services/smartAlbumComments.service';

/** Client-preview guard before comments, swaps, or pins are saved locally. */
export function canClientLeaveFeedback(albumId, prooferAccess, action = 'comment') {
    if (!albumId || !prooferAccess) return { ok: true };

    if (
        (action === 'comment' || action === 'swap') &&
        prooferAccess.requireNameForComments
    ) {
        const name = getGuestProfile(albumId)?.name?.trim();
        if (!name) {
            return {
                ok: false,
                code: 'name-required',
                message: 'Enter your name before leaving feedback.',
            };
        }
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

export function mergeAlbumClientFlagsFromProoferAccess(album) {
    if (!album) return album;
    const access = album.preview_data?.proofer_access;
    if (!access) return album;

    return {
        ...album,
        comments_enabled:
            access.commentsEnabled !== undefined
                ? access.commentsEnabled
                : album.comments_enabled,
        messages_enabled:
            access.swapsEnabled !== undefined ? access.swapsEnabled : album.messages_enabled,
        share_link_enabled:
            access.shareLinkEnabled !== undefined
                ? access.shareLinkEnabled
                : album.share_link_enabled,
    };
}
