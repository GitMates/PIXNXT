import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    formatSpreadDisplayLabel,
    getAlbumSpreadOptions,
    pageToSpreadIndex,
} from './albumSpreadUtils';
import {
    getNotificationPage,
    getNotificationPanel,
    getNotificationTypeLabel,
    listAlbumNotificationsForAlbum,
    NOTIFICATION_REFRESH_EVENTS,
} from '../../services/albumNotifications';
import { formatCommentDateTime } from '../../services/smartAlbumComments.service';
import ProofPanelStats from './ProofPanelStats';

function getNotificationLocationLabel(item, album, totalPages) {
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

export default function AlbumEditorNotifications({
    album,
    totalPages = 0,
    spreadUnresolved = 0,
    spreadTotal = 0,
    onSelectNotification,
}) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const rootRef = useRef(null);

    const unreadCount = useMemo(() => items.filter((item) => item.isUnread).length, [items]);

    const refresh = useCallback(async () => {
        if (!album?.id) {
            setItems([]);
            return;
        }
        setLoading(true);
        try {
            const next = await listAlbumNotificationsForAlbum(album);
            setItems(next);
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [album]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    useEffect(() => {
        const onRefresh = (e) => {
            if (e.detail?.albumId && e.detail.albumId !== album?.id) return;
            refresh();
        };
        NOTIFICATION_REFRESH_EVENTS.forEach((eventName) => {
            window.addEventListener(eventName, onRefresh);
        });
        return () => {
            NOTIFICATION_REFRESH_EVENTS.forEach((eventName) => {
                window.removeEventListener(eventName, onRefresh);
            });
        };
    }, [album?.id, refresh]);

    useEffect(() => {
        const onDocClick = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

    const handleToggle = () => {
        const next = !open;
        setOpen(next);
        if (next) refresh();
    };

    const handleSelect = (item) => {
        setOpen(false);
        const page = getNotificationPage(item, album);
        const panel = getNotificationPanel(item);
        onSelectNotification?.({ item, page, panel });
    };

    return (
        <div className="ae-notifications" ref={rootRef}>
            <button
                type="button"
                className="ae-icon-btn ae-notifications-trigger"
                onClick={handleToggle}
                aria-label={unreadCount ? `${unreadCount} unread notifications` : 'Notifications'}
                aria-expanded={open}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                    <span className="ae-notifications-badge">{badgeLabel}</span>
                )}
            </button>

            {open && (
                <div className="ae-notifications-panel" role="menu">
                    <div className="ae-notifications-header">All page notifications</div>
                    <div className="ae-notifications-stats">
                        <ProofPanelStats
                            unresolved={spreadUnresolved}
                            total={spreadTotal}
                            totalLabel="On this spread"
                            compact
                        />
                    </div>
                    {loading ? (
                        <div className="ae-notifications-empty">Loading…</div>
                    ) : items.length === 0 ? (
                        <div className="ae-notifications-empty">No notifications</div>
                    ) : (
                        <ul className="ae-notifications-list">
                            {items.map((item) => (
                                <li key={item.id}>
                                    <button
                                        type="button"
                                        className={`ae-notifications-item${
                                            item.isUnread ? ' ae-notifications-item--unread' : ''
                                        }`}
                                        role="menuitem"
                                        onClick={() => handleSelect(item)}
                                    >
                                        <span className="ae-notifications-item-top">
                                            <span className="ae-notifications-item-type">
                                                {getNotificationTypeLabel(item.type)}
                                            </span>
                                            <span className="ae-notifications-item-location">
                                                {getNotificationLocationLabel(item, album, totalPages)}
                                            </span>
                                        </span>
                                        <span className="ae-notifications-item-preview">
                                            {item.preview}
                                        </span>
                                        {item.createdAt && (
                                            <span className="ae-notifications-item-time">
                                                {formatCommentDateTime(item.createdAt)}
                                            </span>
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
