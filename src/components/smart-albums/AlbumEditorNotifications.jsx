import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    formatSpreadDisplayLabel,
    getAlbumSpreadOptions,
    pageToSpreadIndex,
    isEndHalfSpreadIndex,
} from './albumSpreadUtils';
import { MessageSquare, ArrowLeftRight, Check, Mic } from 'lucide-react';
import {
    getNotificationPage,
    getNotificationPanel,
    getNotificationTypeLabel,
    isNotificationMarkedDone,
    listAlbumNotificationsForAlbum,
    NOTIFICATION_REFRESH_EVENTS,
    markAllAlbumProofItemsSeen,
} from '../../services/albumNotifications';
import { isCommentAudioAttachment } from './albumCommentAttachments';
import { resolveFilmstripVisual, FilmstripThumb } from './AlbumSpreadFilmstrip';
import { parseGridSizeAspect } from './albumGridSize';
import { AppLoader } from '../ui/AppLoading';

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
const PANEL_WIDTH = 380;
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
    const [filter, setFilter] = useState('all');
    const rootRef = useRef(null);
    const triggerRef = useRef(null);

    const unreadCount = useMemo(() => items.filter((item) => item.isUnread).length, [items]);
    const swapsCount = useMemo(() => items.filter(item => item.type === 'swap').length, [items]);
    const commentsCount = useMemo(() => items.filter(item => item.type === 'photo_comment' || item.type === 'spread_comment' || item.type === 'client_reply').length, [items]);

    const pageAspect = useMemo(
        () => parseGridSizeAspect(album?.grid_size || 'square'),
        [album?.grid_size]
    );
    const spreadAspect = pageAspect * 2;
    const spreadOpts = useMemo(() => getAlbumSpreadOptions(album), [album]);

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

    const formatCommentTimeOnly = (dateString) => {
        if (!dateString) return '';
        try {
            const d = new Date(dateString);
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        } catch {
            return '';
        }
    };

    const filteredItems = items.filter(item => {
        if (filter === 'unread') return item.isUnread;
        if (filter === 'swaps') return item.type === 'swap';
        if (filter === 'comments') return item.type === 'photo_comment' || item.type === 'spread_comment' || item.type === 'client_reply';
        return true;
    });

    const panelContent = (
        <div
            id={PANEL_ID}
            className="ae-notifications-panel ae-notifications-panel--fixed"
            role="menu"
            style={panelStyle ?? undefined}
        >
            <div className="ae-notifications-header">
                <span className="ae-notifications-title">Activity</span>
                {unreadCount > 0 && (
                    <span className="ae-notifications-unread-badge">{unreadCount} UNREAD</span>
                )}
                <button
                    type="button"
                    className="ae-notifications-mark-read"
                    onClick={async () => {
                        await markAllAlbumProofItemsSeen(album);
                        refresh();
                    }}
                >
                    Mark all read
                </button>
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
            </div>

            <div className="ae-notifications-scroll">
                {loading ? (
                    <AppLoader label="Loading" variant="dropdown" className="ae-notifications-empty app-loader" />
                ) : filteredItems.length === 0 ? (
                    <div className="ae-notifications-empty">No notifications</div>
                ) : (
                    <>
                        <div className="ae-notifications-section-title">TODAY</div>
                        <ul className="ae-notifications-list">
                            {filteredItems.map((item) => {
                                const locLabel = getNotificationLocationLabel(item, album, totalPages);
                                const tagText = locLabel === 'Cover' 
                                    ? 'COVER' 
                                    : locLabel === 'Album' 
                                    ? 'ALBUM' 
                                    : locLabel.toUpperCase();
                                
                                const spreadIndex = item.spreadIndex ?? (item.pageNum != null ? pageToSpreadIndex(item.pageNum, { ...spreadOpts, totalPages }) : null);
                                const hasThumbnail = spreadIndex != null;
                                const isCover = spreadOpts.hasCovers && spreadIndex === 0;
                                const isEndSpread = isEndHalfSpreadIndex(spreadIndex, totalPages, spreadOpts);
                                const tileAspect = (isCover || isEndSpread) ? pageAspect : spreadAspect;
                                const visual = hasThumbnail ? resolveFilmstripVisual(album, spreadIndex, totalPages, spreadOpts) : null;

                                const isAudioComment = item.comment && isCommentAudioAttachment(item.comment);
                                const isDone = isNotificationMarkedDone(item);
                                let iconClass = 'comment';
                                let iconElement = <MessageSquare size={14} />;
                                if (item.type === 'swap') {
                                    iconClass = 'swap';
                                    iconElement = <ArrowLeftRight size={14} />;
                                } else if (item.type === 'changes_submitted' || item.type === 'album_approved') {
                                    iconClass = 'tick';
                                    iconElement = <Check size={14} />;
                                } else if (isAudioComment) {
                                    iconClass = 'audio';
                                    iconElement = <Mic size={14} />;
                                } else if (isDone) {
                                    iconClass = 'tick';
                                    iconElement = <Check size={14} />;
                                }

                                return (
                                    <li key={item.id}>
                                        <button
                                            type="button"
                                            className={`ae-notifications-item${
                                                item.isUnread ? ' ae-notifications-item--unread' : ''
                                            }${isDone ? ' ae-notifications-item--done' : ''}`}
                                            role="menuitem"
                                            onClick={() => handleSelect(item)}
                                        >
                                            <div className="ae-notifications-item-left-area">
                                                {item.isUnread && <span className="ae-notifications-item-unread-dot" />}
                                                {isDone ? (
                                                    <span className="ae-notifications-item-done-mark" aria-hidden>
                                                        <Check size={12} strokeWidth={2.5} />
                                                    </span>
                                                ) : null}
                                                <div className={`ae-notifications-item-icon-container ae-notifications-item-icon-container--${iconClass}`}>
                                                    {iconElement}
                                                </div>
                                            </div>
                                            
                                            <div className="ae-notifications-item-content">
                                                <div className="ae-notifications-item-top">
                                                    <span className="ae-notifications-item-title-row">
                                                        <span className="ae-notifications-item-title">
                                                            {getNotificationTypeLabel(item.type)}
                                                        </span>
                                                        <span className="ae-notifications-item-tag">
                                                            {tagText}
                                                        </span>
                                                    </span>
                                                    <span className="ae-notifications-item-meta">
                                                        {item.createdAt ? (
                                                            <span className="ae-notifications-item-time">
                                                                {formatCommentTimeOnly(item.createdAt)}
                                                            </span>
                                                        ) : null}
                                                        {isDone ? (
                                                            <span className="ae-notifications-item-status">Done</span>
                                                        ) : null}
                                                    </span>
                                                </div>
                                                <span className="ae-notifications-item-preview">
                                                    {item.preview}
                                                </span>
                                            </div>

                                            {hasThumbnail && visual && (
                                                <div className="ae-notifications-item-thumbnail" style={{ aspectRatio: String(tileAspect) }}>
                                                    <FilmstripThumb visual={visual} album={album} />
                                                </div>
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </>
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
