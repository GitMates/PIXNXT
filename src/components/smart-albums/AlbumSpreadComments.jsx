import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    getGuestProfile,
    groupCommentsByThread,
    saveGuestProfile,
    smartAlbumCommentsService,
} from '../../services/smartAlbumComments.service';
import './AlbumSpreadComments.css';

const SAVE_DELAY_MS = 700;

function spreadLabel(spreadIndex) {
    if (spreadIndex <= 0) return 'Cover';
    return `Spread ${spreadIndex}`;
}

export default function AlbumSpreadComments({
    albumId,
    spreadIndex,
    commentsEnabled = true,
    isPhotographer = false,
    photographerName = 'Photographer',
    onAlbumUpdate,
}) {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [draftBody, setDraftBody] = useState('');
    const [draftId, setDraftId] = useState(null);
    const [saveState, setSaveState] = useState('idle');
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [replyBodies, setReplyBodies] = useState({});
    const [replyBusy, setReplyBusy] = useState(null);
    const saveTimerRef = useRef(null);

    const threads = useMemo(() => groupCommentsByThread(comments), [comments]);

    const loadComments = useCallback(async () => {
        if (!albumId || spreadIndex == null) return;
        setLoading(true);
        try {
            const rows = await smartAlbumCommentsService.listSpreadComments(albumId, spreadIndex);
            setComments(rows);
            const profile = getGuestProfile(albumId);
            setGuestName(profile.name || '');
            setGuestEmail(profile.email || '');
            const draftCommentId = profile.drafts?.[spreadIndex];
            if (draftCommentId) {
                const draft = rows.find((c) => c.id === draftCommentId && c.author_type === 'client');
                if (draft) {
                    setDraftId(draft.id);
                    setDraftBody(draft.body);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [albumId, spreadIndex]);

    useEffect(() => {
        loadComments();
    }, [loadComments]);

    useEffect(() => {
        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, []);

    const persistGuestProfile = useCallback(
        (patch) => {
            const profile = { ...getGuestProfile(albumId), ...patch };
            saveGuestProfile(albumId, profile);
        },
        [albumId]
    );

    const saveDraft = useCallback(
        async (body, name, email) => {
            if (!albumId || spreadIndex == null || !body.trim()) return;
            setSaveState('saving');
            try {
                const saved = await smartAlbumCommentsService.saveClientComment({
                    albumId,
                    spreadIndex,
                    commentId: draftId,
                    body,
                    authorName: name || 'Guest',
                    authorEmail: email || null,
                });
                setDraftId(saved.id);
                persistGuestProfile({
                    name: name || 'Guest',
                    email: email || null,
                    drafts: { ...getGuestProfile(albumId).drafts, [spreadIndex]: saved.id },
                });
                setSaveState('saved');
                await loadComments();
            } catch (e) {
                console.error(e);
                setSaveState('error');
            }
        },
        [albumId, spreadIndex, draftId, loadComments, persistGuestProfile]
    );

    const handleDraftChange = (value) => {
        setDraftBody(value);
        if (!commentsEnabled || isPhotographer) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            if (!guestName.trim()) return;
            saveDraft(value, guestName, guestEmail);
        }, SAVE_DELAY_MS);
    };

    const handleGuestBlur = () => {
        if (guestName.trim()) {
            persistGuestProfile({ name: guestName.trim(), email: guestEmail.trim() || null });
        }
    };

    const handleReply = async (parentId) => {
        const body = (replyBodies[parentId] || '').trim();
        if (!body) return;
        setReplyBusy(parentId);
        try {
            await smartAlbumCommentsService.savePhotographerReply({
                albumId,
                spreadIndex,
                parentId,
                body,
                authorName: photographerName,
            });
            setReplyBodies((prev) => ({ ...prev, [parentId]: '' }));
            await loadComments();
        } catch (e) {
            console.error(e);
        } finally {
            setReplyBusy(null);
        }
    };

    if (!commentsEnabled && !isPhotographer) {
        return (
            <div className="asc-panel asc-panel--disabled">
                <p>Comments are turned off for this album.</p>
            </div>
        );
    }

    return (
        <section className="asc-panel" aria-label={`Comments for ${spreadLabel(spreadIndex)}`}>
            <header className="asc-header">
                <h2 className="asc-title">Comments</h2>
                <span className="asc-spread-tag">{spreadLabel(spreadIndex)}</span>
            </header>

            {loading ? (
                <p className="asc-muted">Loading comments…</p>
            ) : threads.length === 0 ? (
                <p className="asc-muted">No comments on this spread yet.</p>
            ) : (
                <ul className="asc-thread-list">
                    {threads.map(({ root, replies }) => (
                        <li key={root.id} className="asc-thread">
                            <div className={`asc-message asc-message--${root.author_type}`}>
                                <div className="asc-message-meta">
                                    <strong>{root.author_name}</strong>
                                    <span>{new Date(root.updated_at || root.created_at).toLocaleString()}</span>
                                </div>
                                <p>{root.body}</p>
                            </div>
                            {replies.map((reply) => (
                                <div
                                    key={reply.id}
                                    className={`asc-message asc-message--reply asc-message--${reply.author_type}`}
                                >
                                    <div className="asc-message-meta">
                                        <strong>{reply.author_name}</strong>
                                        <span>{new Date(reply.created_at).toLocaleString()}</span>
                                    </div>
                                    <p>{reply.body}</p>
                                </div>
                            ))}
                            {isPhotographer && commentsEnabled && (
                                <div className="asc-reply-box">
                                    <textarea
                                        className="asc-textarea asc-textarea--small"
                                        rows={2}
                                        placeholder="Reply to client…"
                                        value={replyBodies[root.id] || ''}
                                        onChange={(e) =>
                                            setReplyBodies((prev) => ({
                                                ...prev,
                                                [root.id]: e.target.value,
                                            }))
                                        }
                                    />
                                    <button
                                        type="button"
                                        className="asc-btn asc-btn--primary"
                                        disabled={replyBusy === root.id}
                                        onClick={() => handleReply(root.id)}
                                    >
                                        {replyBusy === root.id ? 'Sending…' : 'Send reply'}
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {!isPhotographer && commentsEnabled && (
                <div className="asc-compose">
                    <div className="asc-guest-fields">
                        <input
                            type="text"
                            className="asc-input"
                            placeholder="Your name"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            onBlur={handleGuestBlur}
                        />
                        <input
                            type="email"
                            className="asc-input"
                            placeholder="Email (optional)"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            onBlur={handleGuestBlur}
                        />
                    </div>
                    <textarea
                        className="asc-textarea"
                        rows={4}
                        placeholder="Add your feedback for this spread…"
                        value={draftBody}
                        onChange={(e) => handleDraftChange(e.target.value)}
                        onBlur={() => {
                            if (guestName.trim() && draftBody.trim()) {
                                saveDraft(draftBody, guestName, guestEmail);
                            }
                        }}
                    />
                    <div className="asc-compose-foot">
                        <span className={`asc-save-status asc-save-status--${saveState}`}>
                            {saveState === 'saving' && 'Saving…'}
                            {saveState === 'saved' && 'Saved'}
                            {saveState === 'error' && 'Could not save'}
                            {saveState === 'idle' && 'Changes save automatically'}
                        </span>
                    </div>
                </div>
            )}

            {isPhotographer && !commentsEnabled && (
                <p className="asc-muted">Enable comments on the cover spread to allow client feedback.</p>
            )}
        </section>
    );
}
