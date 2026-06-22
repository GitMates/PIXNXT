import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import notificationPng from '../../assets/icons/notification.png';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import {
    buildNotificationUrl,
    clearAllPhotographerNotifications,
    dismissNotificationItem,
    getNotificationTypeLabel,
    listPhotographerNotifications,
    markAllPhotographerNotificationsRead,
    NOTIFICATION_REFRESH_EVENTS,
} from '../../services/albumNotifications';
import { formatCommentDateTime } from '../../services/smartAlbumComments.service';
import '../../pages/smart-albums/SmartAlbums.css';

const PURPLE = '#9b59b6';
const PANEL_WIDTH = 340;
const PANEL_GAP = 10;
const VIEWPORT_PAD = 12;

function clampPanelPosition(triggerRect) {
    let left = triggerRect.left;
    const top = triggerRect.bottom + PANEL_GAP;
    const maxLeft = window.innerWidth - PANEL_WIDTH - VIEWPORT_PAD;
    if (left > maxLeft) left = maxLeft;
    if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;
    return { top, left };
}

export default function SmartAlbumNotifications({ userId }) {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [albums, setAlbums] = useState([]);
    const [panelPos, setPanelPos] = useState(null);
    const rootRef = useRef(null);

    const unreadCount = useMemo(() => items.filter((item) => item.isUnread).length, [items]);

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

    const handleSelect = (item) => {
        const album = albums.find((a) => a.id === item.albumId);
        // Do not auto-mark as read when opening from the bell.
        // Users can explicitly mark notifications read or clear them instead.
        setOpen(false);
        navigate(buildNotificationUrl(item, album));
    };

    const handleDismiss = (e, item) => {
        e.stopPropagation();
        dismissNotificationItem(item);
        setItems((prev) => prev.filter((row) => row.id !== item.id));
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

    return (
        <div className="sa-notifications" ref={rootRef}>
            <button
                type="button"
                className="sa-notifications-trigger"
                onClick={handleToggle}
                aria-label={unreadCount ? `${unreadCount} unread notifications` : 'Notifications'}
                aria-expanded={open}
            >
                <img
                    src={notificationPng}
                    alt=""
                    className="w-[18px] h-[18px] object-contain shrink-0"
                    aria-hidden
                />
                {unreadCount > 0 && (
                    <span className="sa-notifications-badge" style={{ background: PURPLE }}>
                        {badgeLabel}
                    </span>
                )}
            </button>

            {open &&
                panelPos &&
                createPortal(
                    <div
                        id="sa-notifications-panel"
                        className="sa-notifications-panel sa-notifications-panel--fixed"
                        role="menu"
                        style={{ top: panelPos.top, left: panelPos.left }}
                    >
                        <div className="sa-notifications-panel-header">
                            <span>Notifications</span>
                            <div className="sa-notifications-panel-actions">
                                {unreadCount > 0 && (
                                    <span className="sa-notifications-panel-count">
                                        {unreadCount} new
                                    </span>
                                )}
                                {items.length > 0 && (
                                    <button
                                        type="button"
                                        className="sa-notifications-clear-btn"
                                        onClick={handleClearAll}
                                    >
                                        Clear all
                                    </button>
                                )}
                            </div>
                        </div>

                        {unreadCount > 0 && items.length > 0 && (
                            <div className="sa-notifications-toolbar">
                                <button
                                    type="button"
                                    className="sa-notifications-mark-read-btn"
                                    onClick={handleMarkAllRead}
                                >
                                    Mark all as read
                                </button>
                            </div>
                        )}

                        {loading && !items.length ? (
                            <div className="sa-notifications-empty">Loading…</div>
                        ) : items.length === 0 ? (
                            <div className="sa-notifications-empty">No notifications</div>
                        ) : (
                            <ul className="sa-notifications-list">
                                {items.map((item) => (
                                    <li
                                        key={item.id}
                                        className={`sa-notifications-row${
                                            item.isUnread
                                                ? ' sa-notifications-row--unread'
                                                : ' sa-notifications-row--read'
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            className="sa-notifications-item"
                                            role="menuitem"
                                            onClick={() => handleSelect(item)}
                                        >
                                            <span className="sa-notifications-item-top">
                                                <span className="sa-notifications-item-type">
                                                    {item.isUnread && (
                                                        <span
                                                            className="sa-notifications-unread-dot"
                                                            aria-hidden
                                                        />
                                                    )}
                                                    {getNotificationTypeLabel(item.type)}
                                                </span>
                                                {!item.isUnread ? (
                                                    <span className="sa-notifications-item-status">
                                                        Resolved
                                                    </span>
                                                ) : null}
                                            </span>
                                            <span className="sa-notifications-item-album">
                                                {item.albumName}
                                            </span>
                                            <span className="sa-notifications-item-preview">
                                                {item.preview}
                                            </span>
                                            {item.createdAt && (
                                                <span className="sa-notifications-item-time">
                                                    {formatCommentDateTime(item.createdAt)}
                                                </span>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            className="sa-notifications-dismiss"
                                            aria-label="Delete notification"
                                            onClick={(e) => handleDismiss(e, item)}
                                        >
                                            ×
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>,
                    document.body
                )}
        </div>
    );
}
