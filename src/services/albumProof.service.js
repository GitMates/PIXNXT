import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import { getClientFacingOrigin, getPublicSiteOrigin } from '../lib/publicSiteUrl';

const APPROVED_KEY = 'pixnxt_album_proof_approved';
const SUBMITTED_KEY = 'pixnxt_album_proof_submitted';
const COMMENTING_STARTED_KEY = 'pixnxt_album_client_commenting_started';
const SPREADS_REVIEWED_KEY = 'pixnxt_album_spreads_reviewed';
const SPREADS_VISITED_KEY = 'pixnxt_album_spreads_visited';

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

/** Client finished viewing every spread on their first shared-link visit. */
export function hasCompletedSpreadReview(albumId) {
    if (!albumId) return false;
    return Boolean(readMap(SPREADS_REVIEWED_KEY)[albumId]);
}

function getVisitedSpreadSet(albumId) {
    if (!albumId) return new Set();
    const raw = readMap(SPREADS_VISITED_KEY)[albumId];
    if (!Array.isArray(raw)) return new Set();
    return new Set(raw.filter((n) => Number.isInteger(n) && n >= 0));
}

function everySpreadVisited(visited, totalSpreads) {
    if (totalSpreads <= 0) return false;
    for (let i = 0; i < totalSpreads; i += 1) {
        if (!visited.has(i)) return false;
    }
    return true;
}

/** Record a spread visit; returns true once all spreads have been seen at least once. */
export function markSpreadVisited(albumId, spreadIndex, totalSpreads) {
    if (!albumId || !Number.isInteger(spreadIndex) || spreadIndex < 0) return false;
    if (hasCompletedSpreadReview(albumId)) return true;

    const visited = getVisitedSpreadSet(albumId);
    visited.add(spreadIndex);

    const allVisited = readMap(SPREADS_VISITED_KEY);
    allVisited[albumId] = [...visited].sort((a, b) => a - b);
    writeMap(SPREADS_VISITED_KEY, allVisited);

    if (!everySpreadVisited(visited, totalSpreads)) return false;

    const reviewed = readMap(SPREADS_REVIEWED_KEY);
    reviewed[albumId] = new Date().toISOString();
    writeMap(SPREADS_REVIEWED_KEY, reviewed);
    return true;
}

export function allSpreadsVisited(albumId, totalSpreads) {
    if (!albumId || totalSpreads <= 0) return false;
    if (hasCompletedSpreadReview(albumId)) return true;
    return everySpreadVisited(getVisitedSpreadSet(albumId), totalSpreads);
}

export async function trackAlbumProofActivity({
    albumId,
    action = 'activity',
    guestName = null,
    guestEmail = null,
} = {}) {
    if (!albumId) return null;
    try {
        const { data, error } = await supabase.functions.invoke('track-album-proof-activity', {
            body: {
                albumId,
                action,
                guestName: guestName?.trim() || null,
                guestEmail: guestEmail?.trim() || null,
            },
        });
        if (error) {
            console.warn('trackAlbumProofActivity:', error.message);
            return null;
        }
        if (data?.error) {
            console.warn('trackAlbumProofActivity:', data.error);
            return null;
        }
        return data;
    } catch (err) {
        console.warn('trackAlbumProofActivity failed:', err?.message || err);
        return null;
    }
}

async function readFunctionErrorMessage(error) {
    let message = error?.message || 'Could not send notification email';
    if (error instanceof FunctionsHttpError) {
        try {
            const body = await error.context.json();
            if (body?.error) message = body.error;
        } catch {
            /* use default message */
        }
    }
    if (message.includes('non-2xx')) {
        return 'Email could not be sent. Check that SMTP is configured in Supabase Edge Function secrets.';
    }
    return message;
}

export function getClientTimezone() {
    if (typeof window === 'undefined') return null;
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
    } catch {
        return null;
    }
}

async function invokeProofEmail(payload) {
    const { data, error } = await supabase.functions.invoke('send-album-proof-email', {
        body: {
            ...payload,
            clientTimezone: payload.clientTimezone ?? getClientTimezone(),
        },
    });

    if (error) {
        throw new Error(await readFunctionErrorMessage(error));
    }
    if (data?.error) {
        throw new Error(data.error);
    }
    return data;
}

export const albumProofService = {
    async notifyPhotographerAlbumApproved({
        albumId,
        guestName,
        guestEmail,
        siteOrigin,
    }) {
        return invokeProofEmail({
            albumId,
            action: 'approve',
            guestName: guestName?.trim() || null,
            guestEmail: guestEmail?.trim() || null,
            siteOrigin: siteOrigin || getPublicSiteOrigin(),
        });
    },

    async notifyPhotographerAlbumChanges({
        albumId,
        guestName,
        guestEmail,
        siteOrigin,
        photoComments = [],
        swapRequests = [],
        spreadComments = [],
    }) {
        return invokeProofEmail({
            albumId,
            action: 'submit_changes',
            guestName: guestName?.trim() || null,
            guestEmail: guestEmail?.trim() || null,
            siteOrigin: siteOrigin || getPublicSiteOrigin(),
            photoComments,
            swapRequests,
            spreadComments,
        });
    },

    async notifyPhotographerClientStartedCommenting({
        albumId,
        guestName,
        guestEmail,
        siteOrigin,
    }) {
        return invokeProofEmail({
            albumId,
            action: 'client_started_commenting',
            guestName: guestName?.trim() || null,
            guestEmail: guestEmail?.trim() || null,
            siteOrigin: siteOrigin || getPublicSiteOrigin(),
        });
    },

    async notifyPhotographerInstantFeedback({
        albumId,
        guestName,
        guestEmail,
        siteOrigin,
        eventType = 'comment',
        eventLabel,
        eventDetail,
        comments = [],
    }) {
        const { data, error } = await supabase.functions.invoke('send-album-comments-email', {
            body: {
                albumId,
                mode: 'instant',
                guestName: guestName?.trim() || null,
                guestEmail: guestEmail?.trim() || null,
                siteOrigin: siteOrigin || getPublicSiteOrigin(),
                clientTimezone: getClientTimezone(),
                eventType,
                eventLabel,
                eventDetail,
                comments,
            },
        });

        if (error) {
            throw new Error(await readFunctionErrorMessage(error));
        }
        if (data?.error) {
            throw new Error(data.error);
        }
        return data;
    },

    async notifyClientRevisionReady({
        albumId,
        guestName,
        guestEmail,
        siteOrigin,
        photographerProfile = null,
    }) {
        const { data, error } = await supabase.functions.invoke('send-smart-album-client-email', {
            body: {
                albumId,
                action: 'status_revision_ready',
                guestName: guestName?.trim() || null,
                guestEmail: guestEmail?.trim() || null,
                siteOrigin: siteOrigin || getClientFacingOrigin(photographerProfile),
            },
        });

        if (error) {
            throw new Error(await readFunctionErrorMessage(error));
        }
        if (data?.error) {
            throw new Error(data.error);
        }
        return data;
    },

    /** Manual photographer nudge from Albums list Remind. */
    async sendClientReminder({
        albumId,
        guestName,
        guestEmail,
        siteOrigin,
        photographerProfile = null,
        force = true,
    }) {
        const { data, error } = await supabase.functions.invoke('send-smart-album-client-email', {
            body: {
                albumId,
                action: 'client_reminder',
                guestName: guestName?.trim() || null,
                guestEmail: guestEmail?.trim() || null,
                siteOrigin: siteOrigin || getClientFacingOrigin(photographerProfile),
                force: Boolean(force),
            },
        });

        if (error) {
            throw new Error(await readFunctionErrorMessage(error));
        }
        if (data?.error) {
            throw new Error(data.error);
        }
        return data;
    },
};
