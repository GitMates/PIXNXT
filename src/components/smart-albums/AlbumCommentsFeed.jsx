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

export default function AlbumCommentsFeed({
    albumId,
    photographerName = 'Photographer',
    repliesEnabled = true,
}) {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [chatSpread, setChatSpread] = useState(null);
    const [chatText, setChatText] = useState('');
    const [chatReplyToId, setChatReplyToId] = useState(null);
    const [chatBusy, setChatBusy] = useState(false);
    const [syncedAt, setSyncedAt] = useState(null);
    const [syncing, setSyncing] = useState(false);
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

    const openChat = useCallback((spreadIndex, spreadLabel, threads, replyToId = null) => {
        setChatSpread({ spreadIndex, spreadLabel, threads });
        setChatReplyToId(replyToId);
        setChatText('');
    }, []);

    const closeChat = useCallback(() => {
        setChatSpread(null);
        setChatReplyToId(null);
        setChatText('');
    }, []);

    const handleSend = useCallback(async () => {
        if (!chatSpread || !albumId || !chatReplyToId) return;
        const body = chatText.trim();
        if (!body) return;
        setChatBusy(true);
        try {
            await smartAlbumCommentsService.savePhotographerReply({
                albumId,
                spreadIndex: chatSpread.spreadIndex,
                parentId: chatReplyToId,
                body,
                authorName: photographerName,
            });
            setChatText('');
            setChatReplyToId(null);
            await load();
            const rows = await smartAlbumCommentsService.listAlbumComments(albumId);
            const updated = groupCommentsBySpread(rows).find(
                (g) => g.spreadIndex === chatSpread.spreadIndex
            );
            if (updated) {
                setChatSpread({
                    spreadIndex: chatSpread.spreadIndex,
                    spreadLabel: chatSpread.spreadLabel,
                    threads: updated.threads,
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setChatBusy(false);
        }
    }, [albumId, chatSpread, chatReplyToId, chatText, photographerName, load]);

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
        const rows = g.threads.flatMap((t) => [t.root, ...t.replies]);
        return n + countMeaningfulComments(rows);
    }, 0);
    const spreadWithComments = groups.filter((g) => g.threads.length > 0).length;
    const totalReplies = groups.reduce(
        (n, g) => n + g.threads.reduce((m, t) => m + (t.replies?.length || 0), 0),
        0
    );
    const openThreads = groups.reduce(
        (n, g) => n + g.threads.filter((t) => !t.root?.resolved).length,
        0
    );
    const hasNewInSpread = (threads) => {
        if (!lastSeenAt) return false;
        const seenTs = new Date(lastSeenAt).getTime();
        return threads.some(({ root, replies }) => {
            const rows = [root, ...(replies || [])];
            return rows.some((r) => new Date(r.created_at).getTime() > seenTs);
        });
    };

    const chatModal = useMemo(() => {
        if (!chatSpread) return null;
        return createPortal(
            <div className="asc-reply-modal-backdrop" onClick={closeChat} role="presentation">
                <div
                    className="asc-messages-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Spread messages"
                    onClick={(e) => e.stopPropagation()}
                >
                    <AlbumMessageChat
                        threads={chatSpread.threads}
                        loading={loading}
                        spreadLabel={chatSpread.spreadLabel}
                        repliesEnabled={repliesEnabled}
                        canCompose={false}
                        canReply={repliesEnabled}
                        isPhotographer
                        composerValue={chatText}
                        onComposerChange={setChatText}
                        onSend={handleSend}
                        composerBusy={chatBusy}
                        composerPlaceholder="Write your reply…"
                        syncedAt={syncedAt}
                        syncing={syncing}
                        onRefresh={syncSpread}
                        replyToId={chatReplyToId}
                        onReplyTo={(id) => setChatReplyToId(id)}
                        onCancelReply={() => setChatReplyToId(null)}
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
        repliesEnabled,
        chatText,
        handleSend,
        chatBusy,
        syncedAt,
        syncing,
        syncSpread,
        chatReplyToId,
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
                        <span className="asc-feed-stat">{totalReplies} replies</span>
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
                                        {threads.map(({ root, replies }) => (
                                            <li key={root.id} className="asc-feed-thread">
                                                <div className="asc-feed-message">
                                                    <strong>
                                                        {root.author_name}
                                                        {root.resolved ? ' · Resolved' : ' · Open'}
                                                    </strong>
                                                    <span>{root.body}</span>
                                                    <div className="asc-feed-actions">
                                                        {repliesEnabled ? (
                                                            <button
                                                                type="button"
                                                                className="asc-link-btn asc-link-btn--inline"
                                                                onClick={() =>
                                                                    openChat(
                                                                        spreadIndex,
                                                                        spreadLabel,
                                                                        threads,
                                                                        root.id
                                                                    )
                                                                }
                                                            >
                                                                Reply
                                                            </button>
                                                        ) : null}
                                                        <button
                                                            type="button"
                                                            className="asc-link-btn asc-link-btn--inline"
                                                            onClick={() =>
                                                                openChat(spreadIndex, spreadLabel, threads)
                                                            }
                                                        >
                                                            Messages
                                                        </button>
                                                    </div>
                                                </div>
                                                {replies.map((reply) => (
                                                    <div
                                                        key={reply.id}
                                                        className="asc-feed-message asc-feed-message--reply"
                                                    >
                                                        <strong>{reply.author_name} · Reply</strong>
                                                        <span>{reply.body}</span>
                                                    </div>
                                                ))}
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
