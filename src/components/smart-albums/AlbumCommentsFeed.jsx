import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    COMMENTS_CHANGED_EVENT,
    countMeaningfulComments,
    groupCommentsBySpread,
    smartAlbumCommentsService,
} from '../../services/smartAlbumComments.service';
import AlbumMessageChat from './AlbumMessageChat';
import './AlbumSpreadComments.css';

const FEED_LAST_SEEN_KEY = 'pixnxt_album_comment_feed_seen_at';

export default function AlbumCommentsFeed({ albumId }) {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [chatSpread, setChatSpread] = useState(null);
    const [syncedAt, setSyncedAt] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [deleteBusyId, setDeleteBusyId] = useState(null);
    const [lastSeenAt, setLastSeenAt] = useState(() => {
        try {
            const raw = localStorage.getItem(FEED_LAST_SEEN_KEY);
            const all = raw ? JSON.parse(raw) : {};
            return all[albumId] || null;
        } catch {
            return null;
        }
    });

    const markAllRead = useCallback(() => {
        const ts = new Date().toISOString();
        setLastSeenAt(ts);
        try {
            const raw = localStorage.getItem(FEED_LAST_SEEN_KEY);
            const all = raw ? JSON.parse(raw) : {};
            all[albumId] = ts;
            localStorage.setItem(FEED_LAST_SEEN_KEY, JSON.stringify(all));
        } catch {
            /* ignore */
        }
    }, [albumId]);

    const load = useCallback(async () => {
        if (!albumId) return;
        setLoading(true);
        try {
            const rows = await smartAlbumCommentsService.listAlbumComments(albumId);
            setGroups(groupCommentsBySpread(rows));
            setSyncedAt(new Date());
        } catch (e) {
            console.error(e);
            setGroups([]);
        } finally {
            setLoading(false);
        }
    }, [albumId]);

    const syncSpread = useCallback(async () => {
        if (!albumId) return;
        setSyncing(true);
        try {
            await load();
        } finally {
            setSyncing(false);
        }
    }, [albumId, load]);

    const openChat = useCallback((spreadIndex, spreadLabel, threads) => {
        setChatSpread({ spreadIndex, spreadLabel, threads });
    }, []);

    const closeChat = useCallback(() => {
        setChatSpread(null);
    }, []);

    const handleDeleteMessage = useCallback(
        async (msg) => {
            if (!albumId || !msg?.id) return;
            if (!window.confirm('Delete this comment?')) return;
            setDeleteBusyId(msg.id);
            try {
                await smartAlbumCommentsService.deleteComment({ albumId, commentId: msg.id });
                await load();
                if (chatSpread) {
                    const rows = await smartAlbumCommentsService.listAlbumComments(albumId);
                    const updated = groupCommentsBySpread(rows).find(
                        (g) => g.spreadIndex === chatSpread.spreadIndex
                    );
                    if (updated?.threads.length) {
                        setChatSpread({
                            spreadIndex: chatSpread.spreadIndex,
                            spreadLabel: chatSpread.spreadLabel,
                            threads: updated.threads,
                        });
                    } else {
                        closeChat();
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setDeleteBusyId(null);
            }
        },
        [albumId, load, chatSpread, closeChat]
    );

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        const onChanged = (e) => {
            if (e.detail?.albumId === albumId) load();
        };
        window.addEventListener(COMMENTS_CHANGED_EVENT, onChanged);
        return () => window.removeEventListener(COMMENTS_CHANGED_EVENT, onChanged);
    }, [albumId, load]);

    useEffect(() => {
        if (!chatSpread || !albumId) return undefined;
        syncSpread();
        const intervalId = window.setInterval(syncSpread, 8000);
        const onChanged = (e) => {
            if (e.detail?.albumId === albumId) syncSpread();
        };
        window.addEventListener(COMMENTS_CHANGED_EVENT, onChanged);
        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener(COMMENTS_CHANGED_EVENT, onChanged);
        };
    }, [chatSpread, albumId, syncSpread]);

    const total = groups.reduce((n, g) => {
        const rows = g.threads.map((t) => t.root);
        return n + countMeaningfulComments(rows);
    }, 0);
    const spreadWithComments = groups.filter((g) => g.threads.length > 0).length;
    const openThreads = groups.reduce(
        (n, g) => n + g.threads.filter((t) => !t.root?.resolved).length,
        0
    );
    const hasNewInSpread = (threads) => {
        if (!lastSeenAt) return false;
        const seenTs = new Date(lastSeenAt).getTime();
        return threads.some(({ root }) => new Date(root.created_at).getTime() > seenTs);
    };

    const chatModal = useMemo(() => {
        if (!chatSpread) return null;
        return createPortal(
            <div className="asc-reply-modal-backdrop" onClick={closeChat} role="presentation">
                <div
                    className="asc-messages-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Spread comments"
                    onClick={(e) => e.stopPropagation()}
                >
                    <AlbumMessageChat
                        threads={chatSpread.threads}
                        loading={loading}
                        spreadLabel={chatSpread.spreadLabel}
                        canCompose={false}
                        isPhotographer
                        syncedAt={syncedAt}
                        syncing={syncing}
                        onRefresh={syncSpread}
                        canDelete={() => true}
                        onDelete={handleDeleteMessage}
                        deleteBusyId={deleteBusyId}
                    />
                    <button type="button" className="asc-messages-modal-close" onClick={closeChat}>
                        Close
                    </button>
                </div>
            </div>,
            document.body
        );
    }, [
        chatSpread,
        closeChat,
        loading,
        syncedAt,
        syncing,
        syncSpread,
        handleDeleteMessage,
        deleteBusyId,
    ]);

    return (
        <div className="asc-feed">
            {chatModal}

            <div className="asc-feed-head">
                <h4 className="asc-feed-title">Client feedback</h4>
                <div className="asc-feed-refresh-row">
                    <button type="button" className="asc-feed-refresh" onClick={load} disabled={loading}>
                        Refresh
                    </button>
                    <button
                        type="button"
                        className="asc-feed-refresh asc-feed-refresh--ghost"
                        onClick={markAllRead}
                    >
                        Mark read
                    </button>
                </div>
            </div>
            {loading ? (
                <p className="asc-feed-muted">Loading comments…</p>
            ) : total === 0 ? (
                <p className="asc-feed-muted">
                    No comments yet. Open Preview, publish the album, and clients can leave feedback
                    per spread.
                </p>
            ) : (
                <>
                    <div className="asc-feed-stats">
                        <span className="asc-feed-stat">{total} comments</span>
                        <span className="asc-feed-stat">{spreadWithComments} spreads</span>
                        <span className="asc-feed-stat">{openThreads} open</span>
                    </div>
                    <ul className="asc-feed-list">
                        {groups.map(({ spreadIndex, spreadLabel, threads }) =>
                            threads.length === 0 ? null : (
                                <li key={spreadIndex} className="asc-feed-spread">
                                    <p className="asc-feed-spread-label">
                                        {spreadLabel}
                                        {hasNewInSpread(threads) && <span className="asc-feed-new-dot" />}
                                    </p>
                                    <ul className="asc-feed-thread-list">
                                        {threads.map(({ root }) => (
                                            <li key={root.id} className="asc-feed-thread">
                                                <div className="asc-feed-message">
                                                    <strong>
                                                        {root.author_name}
                                                        {root.resolved ? ' · Resolved' : ' · Open'}
                                                    </strong>
                                                    <span>{root.body}</span>
                                                    <div className="asc-feed-actions">
                                                        <button
                                                            type="button"
                                                            className="asc-feed-btn asc-feed-btn--view"
                                                            onClick={() =>
                                                                openChat(spreadIndex, spreadLabel, threads)
                                                            }
                                                        >
                                                            View
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="asc-feed-btn asc-feed-btn--delete"
                                                            disabled={deleteBusyId === root.id}
                                                            onClick={() => handleDeleteMessage(root)}
                                                        >
                                                            {deleteBusyId === root.id ? 'Deleting…' : 'Delete'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            )
                        )}
                    </ul>
                </>
            )}
        </div>
    );
}
