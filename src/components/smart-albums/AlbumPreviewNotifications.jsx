import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    COMMENTS_CHANGED_EVENT,
    formatCommentDateTime,
    GUEST_COMMENTS_SEEN_CHANGED_EVENT,
    isGuestCommentUnseen,
    markGuestCommentsSeen,
    smartAlbumCommentsService,
    truncateCommentPreview,
} from '../../services/smartAlbumComments.service';

export default function AlbumPreviewNotifications({
    albumId,
    onSelectSpread,
    onOpenComments,
}) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const rootRef = useRef(null);

    const refresh = useCallback(async () => {
        if (!albumId) {
            setItems([]);
            return;
        }
        try {
            const comments = await smartAlbumCommentsService.listAlbumComments(albumId);
            const next = comments
                .filter((c) => isGuestCommentUnseen(albumId, c))
                .map((comment) => ({
                    id: comment.id,
                    spreadIndex: comment.spread_index,
                    preview: truncateCommentPreview(comment.body || 'Photographer replied'),
                    createdAt: comment.updated_at || comment.created_at,
                    comment,
                }))
                .sort(
                    (a, b) =>
                        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
                );
            setItems(next);
        } catch {
            setItems([]);
        }
    }, [albumId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    useEffect(() => {
        const onChanged = (e) => {
            if (e.detail?.albumId && e.detail.albumId !== albumId) return;
            refresh();
        };
        window.addEventListener(COMMENTS_CHANGED_EVENT, onChanged);
        window.addEventListener(GUEST_COMMENTS_SEEN_CHANGED_EVENT, onChanged);
        return () => {
            window.removeEventListener(COMMENTS_CHANGED_EVENT, onChanged);
            window.removeEventListener(GUEST_COMMENTS_SEEN_CHANGED_EVENT, onChanged);
        };
    }, [albumId, refresh]);

    useEffect(() => {
        const onDocClick = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    const count = items.length;
    const badgeLabel = count > 99 ? '99+' : String(count);

    const handleSelect = (item) => {
        markGuestCommentsSeen(albumId, [item.comment]);
        setOpen(false);
        onOpenComments?.();
        onSelectSpread?.(item.spreadIndex);
    };

    return (
        <div className="av-preview-notifications" ref={rootRef}>
            <button
                type="button"
                className="av-preview-header-btn av-preview-notifications-trigger"
                onClick={() => {
                    const next = !open;
                    setOpen(next);
                    if (next) refresh();
                }}
                aria-label={count ? `${count} unread replies` : 'Notifications'}
                aria-expanded={open}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="22"
                    height="22"
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
                {count > 0 && <span className="av-preview-notifications-badge">{badgeLabel}</span>}
            </button>

            {open && (
                <div className="av-preview-notifications-panel" role="menu">
                    <div className="av-preview-notifications-header">Photographer replies</div>
                    {items.length === 0 ? (
                        <div className="av-preview-notifications-empty">No new replies</div>
                    ) : (
                        <ul className="av-preview-notifications-list">
                            {items.map((item) => (
                                <li key={item.id}>
                                    <button
                                        type="button"
                                        className="av-preview-notifications-item"
                                        role="menuitem"
                                        onClick={() => handleSelect(item)}
                                    >
                                        <span className="av-preview-notifications-item-label">
                                            {item.spreadIndex <= 0
                                                ? 'Cover'
                                                : `Spread ${Number(item.spreadIndex) + 1}`}
                                        </span>
                                        <span className="av-preview-notifications-item-preview">
                                            {item.preview}
                                        </span>
                                        {item.createdAt && (
                                            <span className="av-preview-notifications-item-time">
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
