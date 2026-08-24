import {
    albumProofService,
    markClientCommentingStartedNotified,
    trackAlbumProofActivity,
} from '../../services/albumProof.service';
import { smartAlbumProoferSettingsService } from '../../services/smartAlbumProoferSettings.service';
import {
    countClientRootComments,
    getGuestProfile,
} from '../../services/smartAlbumComments.service';
import { getPhotoPins } from './albumPhotoPins';
import { getSwapMarks } from './albumSwapMarks';
import { notifyAlbumProofStatusChanged } from './albumProofStatus';
import { getPublicSiteOrigin } from '../../lib/publicSiteUrl';

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
    // Photographer emails link to the album editor on the platform host.
    const siteOrigin = getPublicSiteOrigin();
    const guestName = guest?.name?.trim() || 'Album client';
    const guestEmail = guest?.email?.trim() || null;

    void trackAlbumProofActivity({
        albumId,
        action: hadFeedbackBefore ? 'activity' : 'client_started_commenting',
        guestName,
        guestEmail,
    }).then(() => {
        if (!hadFeedbackBefore) {
            markClientCommentingStartedNotified(albumId);
        }
        notifyAlbumProofStatusChanged(albumId);
    });

    if (!hadFeedbackBefore) {
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
}

/** @deprecated Use notifyClientFeedbackEvent */
export function notifyAfterClientFeedbackAdded(albumId, options = {}) {
    notifyClientFeedbackEvent(albumId, options);
}

/** @deprecated Use notifyClientFeedbackEvent */
export function notifyInstantClientFeedback(albumId, options = {}) {
    notifyClientFeedbackEvent(albumId, options);
}
