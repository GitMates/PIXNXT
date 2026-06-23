import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';

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

async function invokeProofEmail(payload) {
    const { data, error } = await supabase.functions.invoke('send-album-proof-email', {
        body: payload,
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
            siteOrigin: siteOrigin || (typeof window !== 'undefined' ? window.location.origin : ''),
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
            siteOrigin: siteOrigin || (typeof window !== 'undefined' ? window.location.origin : ''),
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
            siteOrigin: siteOrigin || (typeof window !== 'undefined' ? window.location.origin : ''),
        });
    },
};
