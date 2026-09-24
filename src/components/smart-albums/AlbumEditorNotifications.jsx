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
    markNotificationItemSeen,
} from '../../services/albumNotifications';
import { isCommentAudioAttachment } from './albumCommentAttachments';
import { resolveFilmstripVisual, FilmstripThumb } from './AlbumSpreadFilmstrip';
import { parseGridSizeAspect } from './albumGridSize';
import { AppLoader } from '../ui/AppLoading';
import { apiBase, getAccessToken } from '../../lib/api/client';
import { smartAlbumsService } from '../../services/smartAlbums.service';

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
    onAlbumUpdate,
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
    const spreadOpts = useMemo(
        () => getAlbumSpreadOptions(album),
        // getAlbumSpreadOptions only reads layout flags; avoid re-creating on
        // every parent render when the album object identity changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [album?.id, album?.has_covers, album?.blank_covers, album?.grid_layout, album?.page_count]
    );

    // Latest album for async refresh without rebinding `refresh` on every render.
    const albumRef = useRef(album);
    albumRef.current = album;
    const refreshSeqRef = useRef(0);
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const updatePanelPosition = useCallback(() => {
        if (!triggerRef.current) return;
        setPanelStyle(computePanelStyle(triggerRef.current.getBoundingClientRect()));
    }, []);

    const refresh = useCallback(async ({ silent = false } = {}) => {
        const current = albumRef.current;
        if (!current?.id) {
            if (mountedRef.current) setItems([]);
            return;
        }
        const seq = (refreshSeqRef.current += 1);
        // Don't blank the cached list with a spinner on background refreshes;
        // only show the loader for the initial load when we have no items yet.
        let didShowLoader = false;
        if (!silent) {
            didShowLoader = true;
            if (mountedRef.current) setLoading(true);
        }
        try {
            const next = await listAlbumNotificationsForAlbum(current);
            if (mountedRef.current && seq === refreshSeqRef.current) {
                setItems(next);
            }
        } catch {
            if (mountedRef.current && seq === refreshSeqRef.current) {
                setItems([]);
            }
        } finally {
            if (mountedRef.current && seq === refreshSeqRef.current && didShowLoader) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh, album?.id]);

    // Re-pull the album row (approval / submit stamps live on it) and then
    // rebuild the items. Coalesces bursts so SSE + visibility can't stampede.
    const albumRefreshInflightRef = useRef(null);
    const lastAlbumRefreshAtRef = useRef(0);
    const refreshAlbumRow = useCallback(async () => {
        const current = albumRef.current;
        if (!current?.id) {
            refresh({ silent: true });
            return;
        }
        if (albumRefreshInflightRef.current) return albumRefreshInflightRef.current;
        if (Date.now() - lastAlbumRefreshAtRef.current < 5000) {
            refresh({ silent: true });
            return Promise.resolve();
        }
        const task = (async () => {
            try {
                const photographerId = current.photographer_id;
                if (photographerId) {
                    const fresh = await smartAlbumsService.getAlbum(photographerId, current.id);
                    if (fresh && mountedRef.current) onAlbumUpdate?.(fresh);
                }
            } catch {
                /* keep the cached album; items refresh below still runs */
            } finally {
                lastAlbumRefreshAtRef.current = Date.now();
                albumRefreshInflightRef.current = null;
            }
            if (mountedRef.current) refresh({ silent: true });
        })();
        albumRefreshInflightRef.current = task;
        return task;
    }, [refresh, onAlbumUpdate]);

    useEffect(() => {
        let debounceId = null;
        const onRefresh = (e) => {
            if (e.detail?.albumId && e.detail.albumId !== album?.id) return;
            // Burst of seen-events (pins + swaps + comments) from one view
            // should trigger a single background refresh, not N spinners.
            if (debounceId) window.clearTimeout(debounceId);
            debounceId = window.setTimeout(() => {
                refresh({ silent: true });
            }, 300);
        };
        const onVisibility = () => {
            if (document.visibilityState === 'visible') void refreshAlbumRow();
        };

        NOTIFICATION_REFRESH_EVENTS.forEach((eventName) => {
            window.addEventListener(eventName, onRefresh);
        });
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            if (debounceId) window.clearTimeout(debounceId);
            NOTIFICATION_REFRESH_EVENTS.forEach((eventName) => {
                window.removeEventListener(eventName, onRefresh);
            });
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [album?.id, refresh, refreshAlbumRow]);

    // Live proof events (client approves / submits from their own device).
    // The backend SSE closes after ~60s, so reconnect with backoff.
    useEffect(() => {
        const albumId = album?.id;
        if (!albumId || typeof EventSource === 'undefined') return undefined;
        let source = null;
        let retryId = null;
        let disposed = false;
        const connect = () => {
            if (disposed) return;
            let token = null;
            try {
                token = getAccessToken();
            } catch {
                token = null;
            }
            if (!token) return;
            let url = '';
            try {
                url = `${apiBase()}/v1/proofer/albums/${encodeURIComponent(albumId)}/events?access_token=${encodeURIComponent(token)}`;
            } catch {
                return;
            }
            try {
                source = new EventSource(url);
            } catch {
                return;
            }
            const onUpdate = () => {
                void refreshAlbumRow();
            };
            source.addEventListener('feedback-updated', onUpdate);
            source.addEventListener('hello', () => {});
            source.onerror = () => {
                try {
                    source?.close();
                } catch {
                    /* ignore */
                }
                source = null;
                if (!disposed && !retryId) {
                    retryId = window.setTimeout(() => {
                        retryId = null;
                        connect();
                    }, 3000);
                }
            };
        };
        connect();
        return () => {
            disposed = true;
            if (retryId) window.clearTimeout(retryId);
            try {
                source?.close();
            } catch {
                /* ignore */
            }
            source = null;
        };
    }, [album?.id, refreshAlbumRow]);

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
    }, [open, updatePanelPosition]);

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
        // Viewing the comment in the sidebar counts as seen, so the
        // notification badge drops immediately (e.g. 7 -> 5 after
        // opening spread 2's comments when spread 7 still has 5).
        try {
            markNotificationItemSeen(item);
        } catch {
            /* ignore */
        }
        // Optimistically drop the badge without waiting for the refresh event.
        setItems((prev) =>
            prev.map((row) => (row.id === item.id ? { ...row, isUnread: false } : row))
        );
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
                {loading && items.length === 0 ? (
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
                                // Keep the type icon when done; done state is shown via
                                // the done-mark + DONE label (avoids two check circles).
                                let iconClass = 'comment';
                                let iconElement = <MessageSquare size={14} />;
                                if (item.type === 'swap') {
                                    iconClass = 'swap';
                                    iconElement = <ArrowLeftRight size={14} />;
                                } else if (item.type === 'album_approved') {
                                    iconClass = 'approved';
                                    iconElement = <Check size={14} strokeWidth={2.5} />;
                                } else if (item.type === 'changes_submitted') {
                                    iconClass = 'tick';
                                    iconElement = <Check size={14} />;
                                } else if (isAudioComment) {
                                    iconClass = 'audio';
                                    iconElement = <Mic size={14} />;
                                }

                                return (
                                    <li key={item.id}>
                                        <button
                                            type="button"
                                            className={`ae-notifications-item${
                                                item.isUnread ? ' ae-notifications-item--unread' : ''
                                            }${isDone ? ' ae-notifications-item--done' : ''}${
                                                item.type === 'album_approved' ? ' ae-notifications-item--approved' : ''
                                            }`}
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
