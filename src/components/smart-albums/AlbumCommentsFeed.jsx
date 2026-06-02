import React, { useCallback, useEffect, useState } from 'react';
import {
    COMMENTS_CHANGED_EVENT,
    COMMENTS_SEEN_CHANGED_EVENT,
    countMeaningfulComments,
    formatCommentDateTime,
    groupCommentsBySpread,
    isCommentUnseen,
    markCommentsSeen,
    smartAlbumCommentsService,
    truncateCommentPreview,
} from '../../services/smartAlbumComments.service';
import './AlbumSpreadComments.css';

export default function AlbumCommentsFeed({
    albumId,
    onNavigateToSpread,
    activeSpreadIndex = null,
}) {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteBusyId, setDeleteBusyId] = useState(null);
    const [seenTick, setSeenTick] = useState(0);

    const load = useCallback(
        async ({ showLoading = true } = {}) => {
            if (!albumId) return;
            if (showLoading) setLoading(true);
            try {
                const rows = await smartAlbumCommentsService.listAlbumComments(albumId);
                setGroups(groupCommentsBySpread(rows));
            } catch (e) {
                console.error(e);
                setGroups([]);
            } finally {
                if (showLoading) setLoading(false);
            }
        },
        [albumId]
    );

    const handleDeleteMessage = useCallback(
        async (msg, e) => {
            e.stopPropagation();
            if (!albumId || !msg?.id) return;
            if (!window.confirm('Delete this comment?')) return;
            setDeleteBusyId(msg.id);
            try {
                await smartAlbumCommentsService.deleteComment({ albumId, commentId: msg.id });
                await load({ showLoading: false });
            } catch (err) {
                console.error(err);
            } finally {
                setDeleteBusyId(null);
            }
        },
        [albumId, load]
    );

    const handleCommentClick = useCallback(
        (spreadIndex, root) => {
            if (albumId && root) markCommentsSeen(albumId, [root]);
            onNavigateToSpread?.(spreadIndex);
        },
        [albumId, onNavigateToSpread]
    );

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        const onChanged = (e) => {
            if (e.detail?.albumId !== albumId) return;
            load({ showLoading: false });
        };
        const onSeen = (e) => {
            if (e.detail?.albumId !== albumId) return;
            setSeenTick((tick) => tick + 1);
        };
        window.addEventListener(COMMENTS_CHANGED_EVENT, onChanged);
        window.addEventListener(COMMENTS_SEEN_CHANGED_EVENT, onSeen);
        return () => {
            window.removeEventListener(COMMENTS_CHANGED_EVENT, onChanged);
            window.removeEventListener(COMMENTS_SEEN_CHANGED_EVENT, onSeen);
        };
    }, [albumId, load]);

    const total = groups.reduce((n, g) => {
        const rows = g.threads.map((t) => t.root);
        return n + countMeaningfulComments(rows);
    }, 0);
    const spreadWithComments = groups.filter((g) => g.threads.length > 0).length;

    return (
        <div className="asc-feed">
            <div className="asc-feed-head">
                <h4 className="asc-feed-title">Client feedback</h4>
                <div className="asc-feed-refresh-row">
                    <button type="button" className="asc-feed-refresh" onClick={() => load()} disabled={loading}>
                        Refresh
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
                    </div>
                    <ul className="asc-feed-list">
                        {groups.map(({ spreadIndex, spreadLabel, threads }) =>
                            threads.length === 0 ? null : (
                                <li key={spreadIndex} className="asc-feed-spread">
                                    <p className="asc-feed-spread-label">
                                        {spreadLabel}
                                        {threads.some(({ root }) => isCommentUnseen(albumId, root)) && (
                                            <span className="asc-feed-new-dot" aria-label="New comment" />
                                        )}
                                    </p>
                                    <ul className="asc-feed-thread-list">
                                        {threads.map(({ root }) => {
                                            const unseen = isCommentUnseen(albumId, root);
                                            return (
                                            <li key={root.id} className="asc-feed-thread">
                                                <button
                                                    type="button"
                                                    className={`asc-feed-message asc-feed-message--link${
                                                        unseen ? ' asc-feed-message--unseen' : ''
                                                    }${
                                                        activeSpreadIndex === spreadIndex
                                                            ? ' asc-feed-message--active'
                                                            : ''
                                                    }`}
                                                    onClick={() => handleCommentClick(spreadIndex, root)}
                                                >
                                                    <div className="asc-feed-message-head">
                                                        <strong>
                                                            {root.author_name}
                                                            {unseen && (
                                                                <span className="asc-feed-new-badge">New</span>
                                                            )}
                                                        </strong>
                                                        <time
                                                            className="asc-feed-message-time"
                                                            dateTime={root.created_at}
                                                        >
                                                            {formatCommentDateTime(
                                                                root.updated_at || root.created_at
                                                            )}
                                                        </time>
                                                    </div>
                                                    <span
                                                        className="asc-feed-message-body"
                                                        title={root.body}
                                                    >
                                                        {truncateCommentPreview(root.body)}
                                                    </span>
                                                    <div className="asc-feed-actions">
                                                        <span className="asc-feed-go-hint">
                                                            View spread
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className="asc-feed-btn asc-feed-btn--delete"
                                                            disabled={deleteBusyId === root.id}
                                                            onClick={(e) => handleDeleteMessage(root, e)}
                                                        >
                                                            {deleteBusyId === root.id
                                                                ? 'Deleting…'
                                                                : 'Delete'}
                                                        </button>
                                                    </div>
                                                </button>
                                            </li>
                                            );
                                        })}
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
