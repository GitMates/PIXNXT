const workersProofer = () => import('./workersProofer.service');

const APPROVED_KEY = 'pixnxt_album_proof_approved';
const SUBMITTED_KEY = 'pixnxt_album_proof_submitted';
const COMMENTING_STARTED_KEY = 'pixnxt_album_client_commenting_started';

function readMap(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function writeMap(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch {
        /* ignore */
    }
}

export function getAlbumApprovedAt(albumId) {
    if (!albumId) return null;
    return readMap(APPROVED_KEY)[albumId] || null;
}

/** True when the client has signed off (server row or local approve mark). */
export function isAlbumClientApproved(album, albumId = album?.id) {
    if (album?.client_approved_at) return true;
    if (albumId && getAlbumApprovedAt(albumId)) return true;
    return false;
}

export function getAlbumChangesSubmittedAt(albumId) {
    if (!albumId) return null;
    return readMap(SUBMITTED_KEY)[albumId] || null;
}

export function markAlbumApproved(albumId) {
    if (!albumId) return;
    const all = readMap(APPROVED_KEY);
    all[albumId] = new Date().toISOString();
    writeMap(APPROVED_KEY, all);
}

export function markAlbumChangesSubmitted(albumId) {
    if (!albumId) return;
    const all = readMap(SUBMITTED_KEY);
    all[albumId] = new Date().toISOString();
    writeMap(SUBMITTED_KEY, all);
}

export function albumHasClientCommentingStartedNotified(albumId) {
    if (!albumId) return false;
    return Boolean(readMap(COMMENTING_STARTED_KEY)[albumId]);
}

export function markClientCommentingStartedNotified(albumId) {
    if (!albumId) return;
    const all = readMap(COMMENTING_STARTED_KEY);
    all[albumId] = new Date().toISOString();
    writeMap(COMMENTING_STARTED_KEY, all);
}

export async function trackAlbumProofActivity({
    albumId,
    action = 'activity',
    guestName = null,
    guestEmail = null,
} = {}) {
    if (!albumId) return null;
    return (await workersProofer()).trackActivity({ albumId, action, guestName, guestEmail });
}

export const albumProofService = {
    async notifyPhotographerAlbumApproved({
        albumId,
        guestName,
        guestEmail,
    }) {
        return (await workersProofer()).notify.approved({ albumId, guestName: guestName?.trim() || null, guestEmail: guestEmail?.trim() || null });
    },

    async notifyPhotographerAlbumChanges({
        albumId,
        guestName,
        guestEmail,
        photoComments = [],
        swapRequests = [],
        spreadComments = [],
    }) {
        void photoComments;
        void swapRequests;
        void spreadComments;
        return (await workersProofer()).notify.changes({ albumId, guestName: guestName?.trim() || null, guestEmail: guestEmail?.trim() || null });
    },

    async notifyPhotographerClientStartedCommenting({
        albumId,
        guestName,
        guestEmail,
    }) {
        return (await workersProofer()).notify.startedCommenting({ albumId, guestName: guestName?.trim() || null, guestEmail: guestEmail?.trim() || null });
    },

    async notifyPhotographerInstantFeedback({
        albumId,
        guestName,
        guestEmail,
    }) {
        return (await workersProofer()).notify.instantFeedback({ albumId, guestName: guestName?.trim() || null, guestEmail: guestEmail?.trim() || null });
    },

    async notifyClientRevisionReady({
        albumId,
        guestName,
        guestEmail,
    }) {
        return (await workersProofer()).notify.revisionReady({ albumId, guestName: guestName?.trim() || null, guestEmail: guestEmail?.trim() || null });
    },

    /** Manual photographer nudge from Albums list Remind. */
    async sendClientReminder({
        albumId,
        guestName,
        guestEmail,
    }) {
        return (await workersProofer()).notify.reminder({ albumId, guestName: guestName?.trim() || null, guestEmail: guestEmail?.trim() || null });
    },
};
