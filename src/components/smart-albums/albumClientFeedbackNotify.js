import {
    albumHasClientCommentingStartedNotified,
    albumProofService,
    markClientCommentingStartedNotified,
} from '../../services/albumProof.service';
import {
    countClientRootComments,
    getGuestProfile,
} from '../../services/smartAlbumComments.service';
import { getPhotoPins } from './albumPhotoPins';
import { getSwapMarks } from './albumSwapMarks';

/** Whether the album already has client photo comments, swaps, or spread comments. */
export function albumHadClientFeedbackBefore(albumId) {
    if (!albumId) return true;
    const pins = getPhotoPins(albumId).length;
    const swaps = getSwapMarks(albumId).length;
    const comments = countClientRootComments(albumId);
    return pins + swaps + comments > 0;
}

/**
 * After a client adds their first comment or swap in preview, email and WhatsApp the photographer once.
 * @param {boolean} hadFeedbackBefore — pass true when feedback existed before this action.
 */
export function notifyAfterClientFeedbackAdded(albumId, { hadFeedbackBefore = false } = {}) {
    if (!albumId || hadFeedbackBefore) return;
    if (albumHasClientCommentingStartedNotified(albumId)) return;

    const guest = getGuestProfile(albumId);
    void albumProofService
        .notifyPhotographerClientStartedCommenting({
            albumId,
            guestName: guest?.name?.trim() || 'Album client',
            guestEmail: guest?.email?.trim() || null,
            siteOrigin: typeof window !== 'undefined' ? window.location.origin : '',
        })
        .then((result) => {
            if (result?.ok) markClientCommentingStartedNotified(albumId);
            if (result?.whatsapp && !result.whatsapp.sent) {
                console.warn('WhatsApp notification skipped or failed:', result.whatsapp);
            }
        })
        .catch((err) => {
            console.warn('Client started commenting notification:', err);
        });
}
