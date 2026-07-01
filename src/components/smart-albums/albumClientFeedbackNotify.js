import {
    albumProofService,
} from '../../services/albumProof.service';
import { smartAlbumProoferSettingsService } from '../../services/smartAlbumProoferSettings.service';
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

function photographerUsesInstantAlerts(photographerId) {
    if (!photographerId) return false;
    const defaults = smartAlbumProoferSettingsService.getPhotographerDefaults(photographerId);
    return defaults.photographerAlerts === 'instant';
}

/**
 * Notify the photographer about client feedback using account alert settings.
 */
export function notifyClientFeedbackEvent(
    albumId,
    {
        photographerId = null,
        hadFeedbackBefore = false,
        eventType = 'comment',
        eventLabel,
        eventDetail,
        comments = [],
    } = {}
) {
    if (!albumId) return;

    const guest = getGuestProfile(albumId);
    const siteOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const guestName = guest?.name?.trim() || 'Album client';
    const guestEmail = guest?.email?.trim() || null;

    if (photographerUsesInstantAlerts(photographerId)) {
        void albumProofService
            .notifyPhotographerInstantFeedback({
                albumId,
                guestName,
                guestEmail,
                siteOrigin,
                eventType,
                eventLabel,
                eventDetail,
                comments,
            })
            .catch((err) => {
                console.warn('Instant photographer notification:', err);
            });
        return;
    }

    if (hadFeedbackBefore) return;

    void albumProofService
        .notifyPhotographerClientStartedCommenting({
            albumId,
            guestName,
            guestEmail,
            siteOrigin,
        })
        .catch((err) => {
            console.warn('Client started commenting notification:', err);
        });
}

/** @deprecated Use notifyClientFeedbackEvent */
export function notifyAfterClientFeedbackAdded(albumId, options = {}) {
    notifyClientFeedbackEvent(albumId, options);
}

/** @deprecated Use notifyClientFeedbackEvent */
export function notifyInstantClientFeedback(albumId, options = {}) {
    notifyClientFeedbackEvent(albumId, options);
}
