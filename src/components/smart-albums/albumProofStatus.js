import {
    getAlbumApprovedAt,
    getAlbumChangesSubmittedAt,
    albumHasClientCommentingStartedNotified,
    isAlbumClientApproved,
} from '../../services/albumProof.service';
import { countClientRootComments } from '../../services/smartAlbumComments.service';

export const ALBUM_PROOF_STATUS_CHANGED_EVENT = 'pixnxt-album-proof-status-changed';

export function notifyAlbumProofStatusChanged(albumId) {
    if (!albumId || typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent(ALBUM_PROOF_STATUS_CHANGED_EVENT, { detail: { albumId } })
    );
}

export { isAlbumClientApproved };

function pickLatestTimestamp(...values) {
    let latest = null;
    for (const value of values) {
        if (!value) continue;
        const time = new Date(value).getTime();
        if (Number.isNaN(time)) continue;
        if (!latest || time > new Date(latest).getTime()) {
            latest = value;
        }
    }
    return latest;
}

/** Merge server proof timestamps with local preview fallbacks. */
export function mergeAlbumProofTimestamps(album, summary = null) {
    if (!album?.id) return album;

    const clientApprovedAt = album.client_approved_at || getAlbumApprovedAt(album.id);
    const clientChangesSubmittedAt =
        album.client_changes_submitted_at || getAlbumChangesSubmittedAt(album.id);
    const clientCommentingStartedAt =
        album.client_commenting_started_at ||
        (albumHasClientCommentingStartedNotified(album.id) ? summary?.latestClientActivityAt : null) ||
        (summary?.clientCommentCount ? summary.latestClientActivityAt : null);

    const clientLastActivityAt = pickLatestTimestamp(
        album.client_last_activity_at,
        clientApprovedAt,
        clientChangesSubmittedAt,
        clientCommentingStartedAt,
        summary?.latestClientActivityAt
    );

    return {
        ...album,
        client_approved_at: clientApprovedAt || null,
        client_changes_submitted_at: clientChangesSubmittedAt || null,
        client_commenting_started_at: clientCommentingStartedAt || null,
        client_last_activity_at: clientLastActivityAt || null,
        __proofSummary: summary || album.__proofSummary || null,
    };
}

export function isAlbumAwaitingFeedback(album) {
    if (!album || album.client_approved_at) return false;
    if (album.client_changes_submitted_at) return false;
    return album.share_link_enabled !== false;
}

export function getAlbumProofStatus(album) {
    const merged = mergeAlbumProofTimestamps(album);

    if (merged.client_approved_at) {
        return { label: 'Approved', tone: 'approved' };
    }
    if (merged.client_changes_submitted_at) {
        return { label: 'Revision requested', tone: 'revision' };
    }
    if (isAlbumAwaitingFeedback(merged)) {
        return { label: 'Awaiting feedback', tone: 'awaiting' };
    }
    return { label: 'Draft', tone: 'draft' };
}

export function getAlbumProofActivityAt(album) {
    const merged = mergeAlbumProofTimestamps(album);
    const status = getAlbumProofStatus(merged);

    if (status.tone === 'approved') {
        return merged.client_approved_at || merged.updated_at || merged.created_at;
    }
    if (status.tone === 'revision') {
        return merged.client_changes_submitted_at || merged.client_last_activity_at;
    }
    if (status.tone === 'awaiting') {
        return (
            merged.client_last_activity_at ||
            merged.client_commenting_started_at ||
            merged.__proofSummary?.latestClientActivityAt ||
            merged.published_at ||
            merged.updated_at ||
            merged.created_at
        );
    }
    return merged.updated_at || merged.created_at;
}

export function getAlbumProofFootnote(album, status) {
    const merged = mergeAlbumProofTimestamps(album);
    const summary = merged.__proofSummary;
    const localClientComments = countClientRootComments(album.id);
    const clientSpreadCount = Math.max(
        summary?.clientSpreadCount || 0,
        localClientComments > 0 ? 1 : 0
    );
    const hasClientActivity =
        Boolean(merged.client_commenting_started_at) ||
        Boolean(summary?.clientCommentCount) ||
        localClientComments > 0;

    if (status?.tone === 'revision' || merged.client_changes_submitted_at) {
        const spreads = clientSpreadCount || summary?.clientCommentCount || 1;
        return `${spreads} spread${spreads === 1 ? '' : 's'} with client feedback`;
    }
    if (merged.client_approved_at) {
        const by = merged.client_approved_by?.trim();
        return by ? `Approved by ${by}` : 'Approved for binding';
    }
    if (hasClientActivity) {
        return 'Client started reviewing spreads';
    }
    if (isAlbumAwaitingFeedback(merged)) {
        return 'Awaiting client sign-off';
    }
    const pages = merged.page_count || 0;
    return pages ? `${pages} spreads in album` : '';
}
