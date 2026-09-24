import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, ArrowLeftRight, Check, Mic, Image as ImageIcon } from 'lucide-react';
import { AppSpinner } from '../ui/AppLoading';
import notificationPng from '../../assets/icons/notification.png';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import {
    buildNotificationUrl,
    clearAllPhotographerNotifications,
    dismissNotificationItem,
    getNotificationTypeLabel,
    isNotificationMarkedDone,
    listPhotographerNotifications,
    markAllPhotographerNotificationsRead,
    markNotificationItemSeen,
    NOTIFICATION_REFRESH_EVENTS,
} from '../../services/albumNotifications';
import {
    formatSpreadDisplayLabel,
    getAlbumSpreadOptions,
    pageToSpreadIndex,
} from './albumSpreadUtils';
import { getCommentAttachmentType } from './albumCommentAttachments';
import '../../pages/smart-albums/SmartAlbums.css';
import '../../pages/smart-albums/AlbumEditor.css';

const PURPLE = '#9b59b6';
const PANEL_WIDTH = 380;
const PANEL_GAP = 10;
const VIEWPORT_PAD = 12;

function getNotificationLocationLabel(item, album) {
    const totalPages = album?.page_count ?? 0;
    const spreadOpts = { ...getAlbumSpreadOptions(album), totalPages };
    if (item.spreadIndex != null) {
        return formatSpreadDisplayLabel(item.spreadIndex, spreadOpts);
    }
    if (item.pageNum != null) {
        const spreadIndex = pageToSpreadIndex(item.pageNum, spreadOpts);
        return formatSpreadDisplayLabel(spreadIndex, spreadOpts);
    }
    return 'Album';
}

function formatNotificationTimeOnly(dateString) {
    if (!dateString) return '';
    try {
        const d = new Date(dateString);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
        return '';
    }
}

function categoryForNotificationType(type) {
    if (type === 'photo_comment' || type === 'spread_comment' || type === 'client_reply') {
        return 'comments';
    }
    if (type === 'swap') return 'swaps';
    return type || 'other';
}

/**
 * One row per album + field (comments / swaps / audio / images) so each
 * count grows separately as the client messages. Album-level events
 * (approved / submitted) stay as their own rows.
 */
function feedbackBucketForRow(row) {
    if (row.type === 'swap') return 'swaps';
    const underlying = row.comment || row.pin || null;
    const attachmentKind = underlying ? getCommentAttachmentType(underlying) : null;
    if (attachmentKind === 'audio') return 'audio';
    if (attachmentKind === 'image') return 'images';
    return 'comments';
}

/** True for client-feedback rows that belong in a bucket group. */
function isFeedbackRow(row) {
    return (
        row.type === 'swap' ||
        row.type === 'photo_comment' ||
        row.type === 'spread_comment' ||
        row.type === 'client_reply'
    );
}

function groupPhotographerNotifications(items) {
    const bucketed = new Map();
    const singles = [];
    (items || []).forEach((item) => {
        if (isFeedbackRow(item)) {
            const key = `${item.albumId}::${feedbackBucketForRow(item)}`;
            if (!bucketed.has(key)) bucketed.set(key, []);
            bucketed.get(key).push(item);
        } else {
            singles.push(item);
        }
    });

    const byTimeDesc = (a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();

    const groups = [...bucketed.entries()].map(([key, rows]) => {
        const sorted = [...rows].sort(byTimeDesc);
        const latest = sorted[0];
        const bucket = feedbackBucketForRow(latest);
        const unread = rows.filter((r) => r.isUnread).length;
        const spreadSet = new Set(
            rows.map((r) =>
                r.spreadIndex != null
                    ? `s${r.spreadIndex}`
                    : r.pageNum != null
                      ? `p${r.pageNum}`
                      : 'album'
            )
        );
        return {
            key,
            category: bucket,
            albumId: latest.albumId,
            albumName: latest.albumName,
            spreadIndex: latest.spreadIndex,
            pageNum: latest.pageNum,
            comment: latest.comment,
            type: latest.type,
            items: sorted,
            ids: new Set(rows.map((r) => r.id)),
            count: rows.length,
            spreadCount: spreadSet.size,
            unreadCount: unread,
            isUnread: unread > 0,
            createdAt: latest.createdAt,
            latest,
        };
    });

    singles.forEach((item) => {
        groups.push({
            key: item.id,
            category: categoryForNotificationType(item.type),
            albumId: item.albumId,
            albumName: item.albumName,
            spreadIndex: item.spreadIndex,
            pageNum: item.pageNum,
            comment: item.comment,
            type: item.type,
            items: [item],
            ids: new Set([item.id]),
            count: 1,
            buckets: null,
            spreadCount: 1,
            unreadCount: item.isUnread ? 1 : 0,
            isUnread: Boolean(item.isUnread),
            createdAt: item.createdAt,
            latest: item,
        });
    });

    return groups.sort(byTimeDesc);
}

function groupTitleForGroup(group) {
    if (group.category === 'comments') {
        return group.count > 1 ? `${group.count} comments` : 'Comment';
    }
    if (group.category === 'swaps') {
        return group.count > 1 ? `${group.count} swap requests` : 'Swap request';
    }
    if (group.category === 'audio') {
        return group.count > 1 ? `${group.count} voice messages` : 'Voice message';
    }
    if (group.category === 'images') {
        return group.count > 1 ? `${group.count} photo messages` : 'Photo message';
    }
    if (group.count > 1) return `${getNotificationTypeLabel(group.type)} (${group.count})`;
    return getNotificationTypeLabel(group.type);
}

function groupPreviewForGroup(group) {
    if (group.count <= 1) return group.latest?.preview || '';
    const latestPreview = group.latest?.preview || '';
    const nouns = {
        comments: 'comments',
        swaps: 'swap requests',
        audio: 'voice messages',
        images: 'photo messages',
    };
    const noun = nouns[group.category] || 'updates';
    return latestPreview ? `${latestPreview} · +${group.count - 1} more` : `${group.count} ${noun}`;
}

function clampPanelPosition(triggerRect) {
    let left = triggerRect.left;
    const top = triggerRect.bottom + PANEL_GAP;
    const maxLeft = window.innerWidth - PANEL_WIDTH - VIEWPORT_PAD;
    if (left > maxLeft) left = maxLeft;
    if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;
    return { top, left };
}

export default function SmartAlbumNotifications({ userId, variant = 'default' }) {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [albums, setAlbums] = useState([]);
    const [panelPos, setPanelPos] = useState(null);
    const [filter, setFilter] = useState('all');
    const rootRef = useRef(null);

    const unreadCount = useMemo(() => items.filter((item) => item.isUnread).length, [items]);
    const bucketOf = useCallback(
        (item) => (isFeedbackRow(item) ? feedbackBucketForRow(item) : null),
        []
    );
    const swapsCount = useMemo(() => items.filter((item) => bucketOf(item) === 'swaps').length, [items, bucketOf]);
    const commentsCount = useMemo(
        () => items.filter((item) => bucketOf(item) === 'comments').length,
        [items, bucketOf]
    );
    const audioCount = useMemo(() => items.filter((item) => bucketOf(item) === 'audio').length, [items, bucketOf]);
    const imagesCount = useMemo(
        () => items.filter((item) => bucketOf(item) === 'images').length,
        [items, bucketOf]
    );
    const albumsById = useMemo(() => {
        const map = {};
        (albums || []).forEach((album) => {
            if (album?.id) map[album.id] = album;
        });
        return map;
    }, [albums]);

    const filteredItems = useMemo(() => {
        if (filter === 'unread') return items.filter((item) => item.isUnread);
        if (filter === 'swaps') return items.filter((item) => bucketOf(item) === 'swaps');
        if (filter === 'comments') return items.filter((item) => bucketOf(item) === 'comments');
        if (filter === 'audio') return items.filter((item) => bucketOf(item) === 'audio');
        if (filter === 'images') return items.filter((item) => bucketOf(item) === 'images');
        return items;
    }, [items, filter, bucketOf]);

    // One user-friendly feedback row per album (comment / swap / audio /
    // image counts grow as the client messages).
    const groupedItems = useMemo(
        () => groupPhotographerNotifications(filteredItems),
        [filteredItems]
    );

    const updatePanelPosition = useCallback(() => {
        if (!rootRef.current) return;
        const rect = rootRef.current.getBoundingClientRect();
        setPanelPos(clampPanelPosition(rect));
    }, []);

    const refreshItems = useCallback(async (albumList) => {
        if (!albumList?.length) {
            setItems([]);
            return;
        }
        setLoading(true);
        try {
            const next = await listPhotographerNotifications(albumList);
            setItems(next);
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const reloadAlbums = useCallback(async () => {
        if (!userId) return [];
        try {
            const data = await smartAlbumsService.getAlbums(userId);
            setAlbums(data);
            return data;
        } catch {
            setAlbums([]);
            return [];
        }
    }, [userId]);

    useEffect(() => {
        if (!userId) {
            setAlbums([]);
            setItems([]);
            return undefined;
        }

        let cancelled = false;
        (async () => {
            const data = await reloadAlbums();
            if (!cancelled && data.length) {
                await refreshItems(data);
            }
        })();

        const pollId = window.setInterval(async () => {
            const data = await reloadAlbums();
            if (!cancelled && data.length) {
                await refreshItems(data);
            }
        }, 45000);

        return () => {
            cancelled = true;
            window.clearInterval(pollId);
        };
    }, [userId, refreshItems, reloadAlbums]);

    useEffect(() => {
        const onRefresh = async () => {
            const data = await reloadAlbums();
            await refreshItems(data.length ? data : albums);
        };

        NOTIFICATION_REFRESH_EVENTS.forEach((eventName) => {
            window.addEventListener(eventName, onRefresh);
        });
        return () => {
            NOTIFICATION_REFRESH_EVENTS.forEach((eventName) => {
                window.removeEventListener(eventName, onRefresh);
            });
        };
    }, [albums, refreshItems, reloadAlbums]);

    useLayoutEffect(() => {
        if (!open) {
            setPanelPos(null);
            return undefined;
        }
        updatePanelPosition();
        const onLayoutChange = () => updatePanelPosition();
        window.addEventListener('resize', onLayoutChange);
        window.addEventListener('scroll', onLayoutChange, true);
        return () => {
            window.removeEventListener('resize', onLayoutChange);
            window.removeEventListener('scroll', onLayoutChange, true);
        };
    }, [open, updatePanelPosition]);

    useEffect(() => {
        const onDocClick = (e) => {
            const panel = document.getElementById('sa-notifications-panel');
            if (rootRef.current?.contains(e.target)) return;
            if (panel?.contains(e.target)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    const handleToggle = async () => {
        const next = !open;
        setOpen(next);
        if (next) {
            const data = await reloadAlbums();
            await refreshItems(data.length ? data : albums);
        }
    };

    const handleSelectGroup = (group) => {
        // Opening a grouped row marks every comment/swap in that spread seen,
        // so e.g. Spread 2 (2) + Spread 7 (5) = badge 7 -> 5 after one click.
        try {
            group.items.forEach((row) => markNotificationItemSeen(row));
        } catch {
            /* ignore */
        }
        setItems((prev) =>
            prev.map((row) => (group.ids.has(row.id) ? { ...row, isUnread: false } : row))
        );
        const album = albums.find((a) => a.id === group.albumId);
        setOpen(false);
        navigate(buildNotificationUrl(group.latest, album));
    };

    const handleDismissGroup = (e, group) => {
        e.stopPropagation();
        try {
            group.items.forEach((row) => dismissNotificationItem(row));
        } catch {
            /* ignore */
        }
        setItems((prev) => prev.filter((row) => !group.ids.has(row.id)));
    };

    const handleMarkAllRead = async (e) => {
        e.stopPropagation();
        await markAllPhotographerNotificationsRead(albums);
        setItems((prev) => prev.map((row) => ({ ...row, isUnread: false })));
    };

    const handleClearAll = async (e) => {
        e.stopPropagation();
        await clearAllPhotographerNotifications(albums);
        setItems([]);
        setOpen(false);
    };

    const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

    const isSidebar = variant === 'sidebar';

    return (
        <div className="sa-notifications" ref={rootRef}>
            <button
                type="button"
                className={`sa-notifications-trigger${isSidebar ? ' sa-notifications-trigger--sidebar' : ''}`}
                onClick={handleToggle}
                aria-label={unreadCount ? `${unreadCount} unread notifications` : 'Notifications'}
                aria-expanded={open}
            >
                {isSidebar ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                ) : (
                    <img
                        src={notificationPng}
                        alt=""
                        className="w-[18px] h-[18px] object-contain shrink-0"
                        aria-hidden
                    />
                )}
                {unreadCount > 0 && (
                    <span
                        className={`sa-notifications-badge${isSidebar ? ' sa-notifications-badge--dot' : ''}`}
                        style={isSidebar ? undefined : { background: PURPLE }}
                    >
                        {isSidebar ? '' : badgeLabel}
                    </span>
                )}
            </button>

            {open &&
                panelPos &&
                createPortal(
                    <div
                        id="sa-notifications-panel"
                        className="sa-notifications-panel sa-notifications-panel--fixed sa-notifications-panel--activity"
                        role="menu"
                        style={{ top: panelPos.top, left: panelPos.left }}
                    >
                        <div className="ae-notifications-header">
                            <span className="ae-notifications-title">Activity</span>
                            {unreadCount > 0 && (
                                <span className="ae-notifications-unread-badge">
                                    {unreadCount} UNREAD
                                </span>
                            )}
                            <button
                                type="button"
                                className="ae-notifications-mark-read"
                                onClick={handleMarkAllRead}
                            >
                                Mark all read
                            </button>
                            {items.length > 0 && (
                                <button
                                    type="button"
                                    className="sa-notifications-clear-btn sa-notifications-clear-btn--activity"
                                    onClick={handleClearAll}
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        <div className="ae-notifications-filters">
                            <button
                                type="button"
                                className={`ae-notifications-filter-btn${filter === 'all' ? ' ae-notifications-filter-btn--active' : ''}`}
                                onClick={() => setFilter('all')}
                            >
                                All {items.length}
                            </button>
                            <button
                                type="button"
                                className={`ae-notifications-filter-btn${filter === 'unread' ? ' ae-notifications-filter-btn--active' : ''}`}
                                onClick={() => setFilter('unread')}
                            >
                                Unread {unreadCount}
                            </button>
                            <button
                                type="button"
                                className={`ae-notifications-filter-btn${filter === 'swaps' ? ' ae-notifications-filter-btn--active' : ''}`}
                                onClick={() => setFilter('swaps')}
                            >
                                Swaps {swapsCount}
                            </button>
                            <button
                                type="button"
                                className={`ae-notifications-filter-btn${filter === 'comments' ? ' ae-notifications-filter-btn--active' : ''}`}
                                onClick={() => setFilter('comments')}
                            >
                                Comments {commentsCount}
                            </button>
                            <button
                                type="button"
                                className={`ae-notifications-filter-btn${filter === 'audio' ? ' ae-notifications-filter-btn--active' : ''}`}
                                onClick={() => setFilter('audio')}
                            >
                                Audio {audioCount}
                            </button>
                            <button
                                type="button"
                                className={`ae-notifications-filter-btn${filter === 'images' ? ' ae-notifications-filter-btn--active' : ''}`}
                                onClick={() => setFilter('images')}
                            >
                                Photos {imagesCount}
                            </button>
                        </div>

                        <div className="ae-notifications-scroll">
                            {loading && !items.length ? (
                                <div className="ae-notifications-empty app-loader app-loader--dropdown">
                                    <AppSpinner size="sm" />
                                    <span className="app-loader__label--sans">Loading</span>
                                </div>
                            ) : groupedItems.length === 0 ? (
                                <div className="ae-notifications-empty">No notifications</div>
                            ) : (
                                <>
                                    <div className="ae-notifications-section-title">TODAY</div>
                                    <ul className="ae-notifications-list">
                                        {groupedItems.map((group) => {
                                            const item = group.latest;
                                            const album = albumsById[group.albumId];
                                            const locLabel = album
                                                ? getNotificationLocationLabel(item, album)
                                                : 'Album';
                                            // A row can span spreads: show the spread count,
                                            // otherwise the single spread label.
                                            const tagText =
                                                group.spreadCount > 1
                                                    ? `${group.spreadCount} SPREADS`
                                                    : locLabel === 'Cover'
                                                      ? 'COVER'
                                                      : locLabel === 'Album'
                                                        ? 'ALBUM'
                                                        : locLabel.toUpperCase();

                                            // No thumbnails in the outer panel — text-only rows.

                                            const isDone =
                                                !group.isUnread &&
                                                group.items.every((row) => isNotificationMarkedDone(row));
                                            // Keep the type icon even when done; done state is
                                            // shown via the done-mark + DONE label.
                                            let iconClass = 'comment';
                                            let iconElement = <MessageSquare size={14} />;
                                            if (group.category === 'swaps') {
                                                iconClass = 'swap';
                                                iconElement = <ArrowLeftRight size={14} />;
                                            } else if (item.type === 'album_approved') {
                                                iconClass = 'approved';
                                                iconElement = <Check size={14} strokeWidth={2.5} />;
                                            } else if (item.type === 'changes_submitted') {
                                                iconClass = 'tick';
                                                iconElement = <Check size={14} />;
                                            } else if (group.category === 'audio') {
                                                iconClass = 'audio';
                                                iconElement = <Mic size={14} />;
                                            } else if (group.category === 'images') {
                                                iconClass = 'image';
                                                iconElement = <ImageIcon size={14} />;
                                            }

                                            return (
                                                <li
                                                    key={group.key}
                                                    className="sa-notifications-activity-row"
                                                >
                                                    <button
                                                        type="button"
                                                        className={`ae-notifications-item${
                                                            group.isUnread
                                                                ? ' ae-notifications-item--unread'
                                                                : ''
                                                        }${isDone ? ' ae-notifications-item--done' : ''}${
                                                            item?.type === 'album_approved'
                                                                ? ' ae-notifications-item--approved'
                                                                : ''
                                                        }`}
                                                        role="menuitem"
                                                        onClick={() => handleSelectGroup(group)}
                                                    >
                                                        <div className="ae-notifications-item-left-area">
                                                            {group.isUnread && (
                                                                <span className="ae-notifications-item-unread-dot" />
                                                            )}
                                                            {isDone ? (
                                                                <span
                                                                    className="ae-notifications-item-done-mark"
                                                                    aria-hidden
                                                                >
                                                                    <Check size={12} strokeWidth={2.5} />
                                                                </span>
                                                            ) : null}
                                                            <div
                                                                className={`ae-notifications-item-icon-container ae-notifications-item-icon-container--${iconClass}`}
                                                            >
                                                                {iconElement}
                                                            </div>
                                                        </div>

                                                        <div className="ae-notifications-item-content">
                                                            <div className="ae-notifications-item-top">
                                                                <span className="ae-notifications-item-title-row">
                                                                    <span className="ae-notifications-item-title">
                                                                        {groupTitleForGroup(group)}
                                                                    </span>
                                                                    <span className="ae-notifications-item-tag">
                                                                        {tagText}
                                                                    </span>
                                                                </span>
                                                                <span className="ae-notifications-item-meta">
                                                                    {group.createdAt ? (
                                                                        <span className="ae-notifications-item-time">
                                                                            {formatNotificationTimeOnly(
                                                                                group.createdAt
                                                                            )}
                                                                        </span>
                                                                    ) : null}
                                                                    {isDone ? (
                                                                        <span className="ae-notifications-item-status">
                                                                            Done
                                                                        </span>
                                                                    ) : null}
                                                                </span>
                                                            </div>
                                                            <span className="ae-notifications-item-album">
                                                                {group.albumName}
                                                            </span>
                                                            <span className="ae-notifications-item-preview">
                                                                {groupPreviewForGroup(group)}
                                                            </span>
                                                        </div>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        aria-label="Delete notification"
                                                        className="sa-notifications-dismiss sa-notifications-dismiss--activity"
                                                        onClick={(e) => handleDismissGroup(e, group)}
                                                    >
                                                        ×
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </>
                            )}
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}
