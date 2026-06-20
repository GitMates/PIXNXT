import { getPhotoPins, isPhotoPinUnseen, markPhotoPinsSeen } from '../components/smart-albums/albumPhotoPins';
import {
    getSwapMarks,
    isSwapMarkUnseen,
    markSwapMarksSeen,
    parseSlotKey,
} from '../components/smart-albums/albumSwapMarks';
import {
    getCommentsSubmittedAt,
    isCommentUnseen,
    markCommentsSeen,
    smartAlbumCommentsService,
    truncateCommentPreview,
} from './smartAlbumComments.service';
import { getAlbumSpreadOptions, spreadIndexToPage } from '../components/smart-albums/albumSpreadUtils';
import { PHOTO_PINS_CHANGED_EVENT, PHOTO_PINS_SEEN_CHANGED_EVENT } from '../components/smart-albums/albumPhotoPins';
import { SWAP_MARKS_CHANGED_EVENT, SWAP_MARKS_SEEN_CHANGED_EVENT } from '../components/smart-albums/albumSwapMarks';
import {
    COMMENTS_CHANGED_EVENT,
    COMMENTS_SEEN_CHANGED_EVENT,
} from './smartAlbumComments.service';

const SUBMIT_SEEN_KEY = 'pixnxt_album_comments_submit_seen';
const PROOF_APPROVED_SEEN_KEY = 'pixnxt_album_proof_approved_seen';
const PROOF_CHANGES_SEEN_KEY = 'pixnxt_album_proof_changes_seen';
const DISMISSED_KEY = 'pixnxt_album_notifications_dismissed';

export const NOTIFICATIONS_CHANGED_EVENT = 'pixnxt-album-notifications-changed';

export const NOTIFICATION_TYPES = {
    PHOTO_COMMENT: 'photo_comment',
    SWAP: 'swap',
    SPREAD_COMMENT: 'spread_comment',
    CLIENT_REPLY: 'client_reply',
    COMMENTS_SIGNED: 'comments_signed',
    ALBUM_APPROVED: 'album_approved',
    CHANGES_SUBMITTED: 'changes_submitted',
};

const TYPE_LABELS = {
    [NOTIFICATION_TYPES.PHOTO_COMMENT]: 'Photo comment',
    [NOTIFICATION_TYPES.SWAP]: 'Swap request',
    [NOTIFICATION_TYPES.SPREAD_COMMENT]: 'Spread comment',
    [NOTIFICATION_TYPES.CLIENT_REPLY]: 'Client reply',
    [NOTIFICATION_TYPES.COMMENTS_SIGNED]: 'Comments confirmed',
    [NOTIFICATION_TYPES.ALBUM_APPROVED]: 'Album approved',
    [NOTIFICATION_TYPES.CHANGES_SUBMITTED]: 'Changes submitted',
};

export function getNotificationTypeLabel(type) {
    return TYPE_LABELS[type] || 'Update';
}

function readSubmitSeen() {
    try {
        const raw = localStorage.getItem(SUBMIT_SEEN_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function writeSubmitSeen(data) {
    try {
        localStorage.setItem(SUBMIT_SEEN_KEY, JSON.stringify(data));
    } catch {
        /* ignore */
    }
}

function readDismissed() {
    try {
        const raw = localStorage.getItem(DISMISSED_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function writeDismissed(data) {
    try {
        localStorage.setItem(DISMISSED_KEY, JSON.stringify(data));
    } catch {
        /* ignore */
    }
}

export function notifyNotificationsChanged() {
    try {
        window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT));
    } catch {
        /* ignore */
    }
}

export function isNotificationDismissed(notificationId) {
    if (!notificationId) return false;
    return Boolean(readDismissed()[notificationId]);
}

export function isSubmitNotificationUnseen(albumId) {
    const submittedAt = getCommentsSubmittedAt(albumId);
    if (!albumId || !submittedAt) return false;
    const seenAt = readSubmitSeen()[albumId];
    if (!seenAt) return true;
    return new Date(submittedAt).getTime() > new Date(seenAt).getTime();
}

export function markSubmitNotificationSeen(albumId) {
    const submittedAt = getCommentsSubmittedAt(albumId);
    if (!albumId || !submittedAt) return;
    const all = readSubmitSeen();
    all[albumId] = submittedAt;
    writeSubmitSeen(all);
    notifyNotificationsChanged();
}

function readProofApprovedSeen() {
    try {
        const raw = localStorage.getItem(PROOF_APPROVED_SEEN_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function writeProofApprovedSeen(data) {
    try {
        localStorage.setItem(PROOF_APPROVED_SEEN_KEY, JSON.stringify(data));
    } catch {
        /* ignore */
    }
}

function readProofChangesSeen() {
    try {
        const raw = localStorage.getItem(PROOF_CHANGES_SEEN_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function writeProofChangesSeen(data) {
    try {
        localStorage.setItem(PROOF_CHANGES_SEEN_KEY, JSON.stringify(data));
    } catch {
        /* ignore */
    }
}

function isProofApprovedUnseen(albumId, approvedAt) {
    if (!albumId || !approvedAt) return false;
    const seenAt = readProofApprovedSeen()[albumId];
    if (!seenAt) return true;
    return new Date(approvedAt).getTime() > new Date(seenAt).getTime();
}

function isProofChangesUnseen(albumId, submittedAt) {
    if (!albumId || !submittedAt) return false;
    const seenAt = readProofChangesSeen()[albumId];
    if (!seenAt) return true;
    return new Date(submittedAt).getTime() > new Date(seenAt).getTime();
}

function markProofApprovedSeen(albumId, approvedAt) {
    if (!albumId || !approvedAt) return;
    const all = readProofApprovedSeen();
    all[albumId] = approvedAt;
    writeProofApprovedSeen(all);
    notifyNotificationsChanged();
}

function markProofChangesSeen(albumId, submittedAt) {
    if (!albumId || !submittedAt) return;
    const all = readProofChangesSeen();
    all[albumId] = submittedAt;
    writeProofChangesSeen(all);
    notifyNotificationsChanged();
}

function collectSyncNotificationsForAlbum(album, dismissed) {
    if (!album?.id) return [];
    const albumId = album.id;
    const albumName = album.name || 'Album';
    const items = [];

    getPhotoPins(albumId).forEach((pin) => {
        const id = `pin-${pin.id}`;
        if (dismissed[id]) return;
        items.push({
            id,
            type: NOTIFICATION_TYPES.PHOTO_COMMENT,
            albumId,
            albumName,
            pageNum: pin.pageNum,
            preview: truncateCommentPreview(pin.message || pin.label || 'New comment on photo'),
            createdAt: pin.updatedAt || pin.createdAt,
            isUnread: isPhotoPinUnseen(albumId, pin),
            pin,
        });
    });

    getSwapMarks(albumId).forEach((mark) => {
        const id = `swap-${mark.id}`;
        if (dismissed[id]) return;
        const slotA = parseSlotKey(mark.a);
        items.push({
            id,
            type: NOTIFICATION_TYPES.SWAP,
            albumId,
            albumName,
            pageNum: slotA.pageNum,
            preview: 'Client requested a photo swap',
            createdAt: mark.createdAt,
            isUnread: isSwapMarkUnseen(albumId, mark),
            mark,
        });
    });

    const submittedAt = getCommentsSubmittedAt(albumId);
    if (submittedAt) {
        const id = `submit-${albumId}`;
        if (!dismissed[id]) {
            items.push({
                id,
                type: NOTIFICATION_TYPES.COMMENTS_SIGNED,
                albumId,
                albumName,
                preview: 'Client confirmed and sent album comments',
                createdAt: submittedAt,
                isUnread: isSubmitNotificationUnseen(albumId),
            });
        }
    }

    if (album.client_approved_at) {
        const id = `proof-approved-${albumId}`;
        if (!dismissed[id]) {
            const by = album.client_approved_by?.trim();
            items.push({
                id,
                type: NOTIFICATION_TYPES.ALBUM_APPROVED,
                albumId,
                albumName,
                preview: by
                    ? `${by} approved this album for binding`
                    : 'Client approved this album for binding',
                createdAt: album.client_approved_at,
                isUnread: isProofApprovedUnseen(albumId, album.client_approved_at),
            });
        }
    }

    if (album.client_changes_submitted_at) {
        const id = `proof-changes-${albumId}`;
        if (!dismissed[id]) {
            const by = album.client_changes_submitted_by?.trim();
            items.push({
                id,
                type: NOTIFICATION_TYPES.CHANGES_SUBMITTED,
                albumId,
                albumName,
                preview: by
                    ? `${by} submitted album change requests`
                    : 'Client submitted album change requests',
                createdAt: album.client_changes_submitted_at,
                isUnread: isProofChangesUnseen(albumId, album.client_changes_submitted_at),
            });
        }
    }

    return items;
}

async function collectCommentNotificationsForAlbum(album, dismissed) {
    if (!album?.id) return [];
    const albumId = album.id;
    const albumName = album.name || 'Album';

    try {
        const comments = await smartAlbumCommentsService.listAlbumComments(albumId);
        return comments
            .filter((c) => c.author_type === 'client')
            .map((comment) => {
                const id = `comment-${comment.id}`;
                if (dismissed[id]) return null;
                return {
                    id,
                    type: comment.parent_id
                        ? NOTIFICATION_TYPES.CLIENT_REPLY
                        : NOTIFICATION_TYPES.SPREAD_COMMENT,
                    albumId,
                    albumName,
                    spreadIndex: comment.spread_index,
                    preview: truncateCommentPreview(comment.body || 'New comment'),
                    authorName: comment.author_name,
                    createdAt: comment.updated_at || comment.created_at,
                    isUnread: isCommentUnseen(albumId, comment),
                    comment,
                };
            })
            .filter(Boolean);
    } catch (e) {
        console.warn('collectCommentNotificationsForAlbum:', e);
        return [];
    }
}

export async function listPhotographerNotifications(albums) {
    const dismissed = readDismissed();
    const syncItems = (albums || []).flatMap((album) =>
        collectSyncNotificationsForAlbum(album, dismissed)
    );
    const commentBatches = await Promise.all(
        (albums || []).map((album) => collectCommentNotificationsForAlbum(album, dismissed))
    );
    const all = [...syncItems, ...commentBatches.flat()];
    return all.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
}

export async function countUnreadPhotographerNotifications(albums) {
    const items = await listPhotographerNotifications(albums);
    return items.filter((item) => item.isUnread).length;
}

/** @deprecated Use countUnreadPhotographerNotifications */
export async function countPhotographerNotifications(albums) {
    return countUnreadPhotographerNotifications(albums);
}

export function markNotificationItemSeen(item) {
    if (!item?.albumId) return;
    const { albumId } = item;

    switch (item.type) {
        case NOTIFICATION_TYPES.PHOTO_COMMENT:
            if (item.pin) markPhotoPinsSeen(albumId, [item.pin]);
            break;
        case NOTIFICATION_TYPES.SWAP:
            if (item.mark) markSwapMarksSeen(albumId, [item.mark]);
            break;
        case NOTIFICATION_TYPES.SPREAD_COMMENT:
        case NOTIFICATION_TYPES.CLIENT_REPLY:
            if (item.comment) markCommentsSeen(albumId, [item.comment]);
            break;
        case NOTIFICATION_TYPES.COMMENTS_SIGNED:
            markSubmitNotificationSeen(albumId);
            break;
        case NOTIFICATION_TYPES.ALBUM_APPROVED:
            markProofApprovedSeen(albumId, item.createdAt);
            break;
        case NOTIFICATION_TYPES.CHANGES_SUBMITTED:
            markProofChangesSeen(albumId, item.createdAt);
            break;
        default:
            break;
    }
    notifyNotificationsChanged();
}

export function dismissNotificationItem(item) {
    if (!item?.id) return;
    const all = readDismissed();
    all[item.id] = true;
    writeDismissed(all);
    if (item.isUnread) {
        markNotificationItemSeen(item);
    }
    notifyNotificationsChanged();
}

export function markAllNotificationsRead(items) {
    if (!items?.length) return;
    items.filter((item) => item.isUnread).forEach((item) => markNotificationItemSeen(item));
}

export function dismissAllNotifications(items) {
    if (!items?.length) return;
    const all = readDismissed();
    items.forEach((item) => {
        if (item?.id) all[item.id] = true;
    });
    writeDismissed(all);
    markAllNotificationsRead(items);
    notifyNotificationsChanged();
}

export function getNotificationPanel(item) {
    switch (item?.type) {
        case NOTIFICATION_TYPES.PHOTO_COMMENT:
            return 'pin';
        case NOTIFICATION_TYPES.SWAP:
            return 'pin';
        case NOTIFICATION_TYPES.SPREAD_COMMENT:
        case NOTIFICATION_TYPES.CLIENT_REPLY:
        case NOTIFICATION_TYPES.COMMENTS_SIGNED:
        case NOTIFICATION_TYPES.CHANGES_SUBMITTED:
            return 'comments';
        case NOTIFICATION_TYPES.ALBUM_APPROVED:
            return null;
        default:
            return null;
    }
}

export function getNotificationPage(item, album) {
    if (item?.pageNum != null) return item.pageNum;
    if (item?.spreadIndex == null || !album) return 0;
    const spreadOpts = getAlbumSpreadOptions(album);
    return spreadIndexToPage(item.spreadIndex, {
        ...spreadOpts,
        totalPages: album.page_count,
        showCover: true,
    });
}

export function buildNotificationUrl(item, album) {
    const page = getNotificationPage(item, album);
    const panel = getNotificationPanel(item);
    const params = new URLSearchParams();
    params.set('page', String(page));
    if (panel) params.set('panel', panel);
    return `/smart-albums/album/${item.albumId}?${params.toString()}`;
}

export const NOTIFICATION_REFRESH_EVENTS = [
    PHOTO_PINS_CHANGED_EVENT,
    PHOTO_PINS_SEEN_CHANGED_EVENT,
    SWAP_MARKS_CHANGED_EVENT,
    SWAP_MARKS_SEEN_CHANGED_EVENT,
    COMMENTS_CHANGED_EVENT,
    COMMENTS_SEEN_CHANGED_EVENT,
    NOTIFICATIONS_CHANGED_EVENT,
];
