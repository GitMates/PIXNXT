import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

const PANEL_ID = 'ae-notifications-panel';
const PANEL_WIDTH = 320;
const PANEL_MARGIN = 12;
const PANEL_GAP = 8;

function computePanelStyle(triggerRect) {
    const width = Math.min(PANEL_WIDTH, window.innerWidth - PANEL_MARGIN * 2);
    let right = Math.max(PANEL_MARGIN, window.innerWidth - triggerRect.right);
    if (right + width > window.innerWidth - PANEL_MARGIN) {
        right = PANEL_MARGIN;
    }
    return {
        top: triggerRect.bottom + PANEL_GAP,
        right,
        bottom: PANEL_MARGIN,
        width,
    };
}

export default function AlbumEditorNotifications({
    album,
    totalPages = 0,
    bookPage = 0,
    activePanel = null,
    onSelectNotification,
}) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [panelStyle, setPanelStyle] = useState(null);
    const rootRef = useRef(null);
    const triggerRef = useRef(null);

    const unreadCount = useMemo(() => items.filter((item) => item.isUnread).length, [items]);

    const updatePanelPosition = useCallback(() => {
        if (!triggerRef.current) return;
        setPanelStyle(computePanelStyle(triggerRef.current.getBoundingClientRect()));
    }, []);

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
        const onVisibility = () => {
            if (document.visibilityState === 'visible') refresh();
        };

        NOTIFICATION_REFRESH_EVENTS.forEach((eventName) => {
            window.addEventListener(eventName, onRefresh);
        });
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            NOTIFICATION_REFRESH_EVENTS.forEach((eventName) => {
                window.removeEventListener(eventName, onRefresh);
            });
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [album?.id, refresh]);

    useLayoutEffect(() => {
        if (!open) {
            setPanelStyle(null);
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
    }, [open, updatePanelPosition, items.length, loading]);

    useEffect(() => {
        if (!open) return undefined;

        const closeIfOutside = (event) => {
            if (rootRef.current?.contains(event.target)) return;
            if (document.getElementById(PANEL_ID)?.contains(event.target)) return;
            setOpen(false);
        };

        const closeOnKey = () => {
            setOpen(false);
        };

        const closeOnScroll = (event) => {
            const panel = document.getElementById(PANEL_ID);
            if (panel?.contains(event.target)) return;
            setOpen(false);
        };

        document.addEventListener('pointerdown', closeIfOutside, true);
        document.addEventListener('keydown', closeOnKey, true);
        window.addEventListener('scroll', closeOnScroll, true);

        return () => {
            document.removeEventListener('pointerdown', closeIfOutside, true);
            document.removeEventListener('keydown', closeOnKey, true);
            window.removeEventListener('scroll', closeOnScroll, true);
        };
    }, [open]);

    useEffect(() => {
        setOpen(false);
    }, [bookPage, activePanel]);

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

    const panelContent = (
        <div
            id={PANEL_ID}
            className="ae-notifications-panel ae-notifications-panel--fixed"
            role="menu"
            style={panelStyle ?? undefined}
        >
            <div className="ae-notifications-header">All page notifications</div>
            <div className="ae-notifications-stats">
                <ProofPanelStats
                    unresolved={unreadCount}
                    total={items.length}
                    totalLabel="Total comment"
                    compact
                />
            </div>
            <div className="ae-notifications-scroll">
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
                                        <span className="ae-notifications-item-meta">
                                            {!item.isUnread ? (
                                                <span className="ae-notifications-item-status">
                                                    Resolved
                                                </span>
                                            ) : null}
                                            <span className="ae-notifications-item-location">
                                                {getNotificationLocationLabel(
                                                    item,
                                                    album,
                                                    totalPages
                                                )}
                                            </span>
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
        </div>
    );

    return (
        <div className="ae-notifications" ref={rootRef}>
            <button
                ref={triggerRef}
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

            {open && panelStyle && createPortal(panelContent, document.body)}
        </div>
    );
}
