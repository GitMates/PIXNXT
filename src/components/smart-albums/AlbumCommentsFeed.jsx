import React, { useCallback, useEffect, useState } from 'react';
import {
    COMMENTS_CHANGED_EVENT,
    countMeaningfulComments,
    groupCommentsBySpread,
    smartAlbumCommentsService,
} from '../../services/smartAlbumComments.service';
import './AlbumSpreadComments.css';

export default function AlbumCommentsFeed({ albumId }) {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!albumId) return;
        setLoading(true);
        try {
            const rows = await smartAlbumCommentsService.listAlbumComments(albumId);
            setGroups(groupCommentsBySpread(rows));
        } catch (e) {
            console.error(e);
            setGroups([]);
        } finally {
            setLoading(false);
        }
    }, [albumId]);

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

    const total = groups.reduce((n, g) => {
        const rows = g.threads.flatMap((t) => [t.root, ...t.replies]);
        return n + countMeaningfulComments(rows);
    }, 0);

    return (
        <div className="asc-feed">
            <div className="asc-feed-head">
                <h4 className="asc-feed-title">Client feedback</h4>
                <button type="button" className="asc-feed-refresh" onClick={load} disabled={loading}>
                    Refresh
                </button>
            </div>
            {loading ? (
                <p className="asc-feed-muted">Loading comments…</p>
            ) : total === 0 ? (
                <p className="asc-feed-muted">
                    No comments yet. Open Preview, publish the album, and clients can leave feedback
                    per spread.
                </p>
            ) : (
                <ul className="asc-feed-list">
                    {groups.map(({ spreadIndex, spreadLabel, threads }) =>
                        threads.length === 0 ? null : (
                            <li key={spreadIndex} className="asc-feed-spread">
                                <p className="asc-feed-spread-label">{spreadLabel}</p>
                                <ul className="asc-feed-thread-list">
                                    {threads.map(({ root, replies }) => (
                                        <li key={root.id} className="asc-feed-thread">
                                            <div className="asc-feed-message">
                                                <strong>{root.author_name}</strong>
                                                <span>{root.body}</span>
                                            </div>
                                            {replies.map((reply) => (
                                                <div
                                                    key={reply.id}
                                                    className="asc-feed-message asc-feed-message--reply"
                                                >
                                                    <strong>{reply.author_name}</strong>
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
            )}
        </div>
    );
}
