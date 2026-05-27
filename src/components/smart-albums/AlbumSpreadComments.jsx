import { SMART_ALBUM_COMMENTS_ENABLED } from './smartAlbumCommentsEnabled';

/* Smart album comment field + save/toast — disabled when SMART_ALBUM_COMMENTS_ENABLED is false */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppToast, useAppToast } from '../ui/AppToast';
import {
    COMMENTS_CHANGED_EVENT,
    countMeaningfulComments,
    getGuestProfile,
    groupCommentsByThread,
    hasCommentBody,
    saveGuestProfile,
    smartAlbumCommentsService,
} from '../../services/smartAlbumComments.service';
import './AlbumSpreadComments.css';

function commentCountFromThreads(threads) {
    return threads.reduce((n, t) => {
        let count = 0;
        if (hasCommentBody(t.root)) count += 1;
        count += t.replies.filter(hasCommentBody).length;
        return n + count;
    }, 0);
}

export default function AlbumSpreadComments({
    albumId,
    spreadIndex,
    spreadLabel = 'Spread',
    commentsEnabled = true,
    isPhotographer = false,
    photographerName = 'Photographer',
    clientView = false,
    variant = 'default',
}) {
    if (!SMART_ALBUM_COMMENTS_ENABLED) return null;

    const isFooter = variant === 'footer';
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [draftBody, setDraftBody] = useState('');
    const [draftId, setDraftId] = useState(null);
    const [saveState, setSaveState] = useState('idle');
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [showGuestFields, setShowGuestFields] = useState(true);
    const [showGuestPopover, setShowGuestPopover] = useState(false);
    const [threadsOpen, setThreadsOpen] = useState(false);
    const [albumCommentCount, setAlbumCommentCount] = useState(null);
    const [replyBodies, setReplyBodies] = useState({});
    const [replyBusy, setReplyBusy] = useState(null);
    const inputRef = useRef(null);
    const { toast, showToast, clearToast } = useAppToast(2500);

    const threads = useMemo(() => groupCommentsByThread(comments), [comments]);
    const commentCount = useMemo(() => commentCountFromThreads(threads), [threads]);
    const showClientCompose = clientView && commentsEnabled && !isPhotographer;

    const loadComments = useCallback(async () => {
        if (!albumId || spreadIndex == null) return;
        setLoading(true);
        try {
            const rows = await smartAlbumCommentsService.listSpreadComments(albumId, spreadIndex);
            setComments(rows);
            const profile = getGuestProfile(albumId);
            const name = profile.name || '';
            const email = profile.email || '';
            setGuestName(name);
            setGuestEmail(email);
            setShowGuestFields(!name.trim());

            const draftCommentId = profile.drafts?.[spreadIndex];
            if (draftCommentId) {
                const draft = rows.find((c) => c.id === draftCommentId && c.author_type === 'client');
                if (draft && hasCommentBody(draft)) {
                    setDraftId(draft.id);
                    setDraftBody(draft.body);
                } else {
                    if (draft && !hasCommentBody(draft)) {
                        smartAlbumCommentsService
                            .deleteClientComment({ albumId, commentId: draft.id })
                            .catch(() => {});
                    }
                    setDraftId(null);
                    setDraftBody('');
                }
            } else {
                setDraftId(null);
                setDraftBody('');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [albumId, spreadIndex]);

    const refreshAlbumCommentCount = useCallback(async () => {
        if (!albumId) return;
        try {
            const all = await smartAlbumCommentsService.listAlbumComments(albumId);
            setAlbumCommentCount(countMeaningfulComments(all));
        } catch (e) {
            console.warn('Could not load album comment count', e);
        }
    }, [albumId]);

    useEffect(() => {
        loadComments();
    }, [loadComments]);

    useEffect(() => {
        if (!isFooter) return;
        refreshAlbumCommentCount();
    }, [isFooter, refreshAlbumCommentCount]);

    useEffect(() => {
        if (!isFooter || !albumId) return undefined;
        const onChanged = (e) => {
            if (e.detail?.albumId === albumId) refreshAlbumCommentCount();
        };
        window.addEventListener(COMMENTS_CHANGED_EVENT, onChanged);
        return () => window.removeEventListener(COMMENTS_CHANGED_EVENT, onChanged);
    }, [isFooter, albumId, refreshAlbumCommentCount]);

    useEffect(() => {
        setThreadsOpen(false);
    }, [spreadIndex]);

    const persistGuestProfile = useCallback(
        (patch) => {
            const profile = { ...getGuestProfile(albumId), ...patch };
            saveGuestProfile(albumId, profile);
        },
        [albumId]
    );

    const resolveGuest = useCallback(() => {
        const profile = getGuestProfile(albumId);
        const name = guestName.trim() || profile.name?.trim() || 'Guest';
        const email = guestEmail.trim() || profile.email?.trim() || null;
        return { name, email };
    }, [albumId, guestName, guestEmail]);

    const saveDraft = useCallback(
        async (body, name, email) => {
            if (!albumId || spreadIndex == null || !body.trim()) return;
            const authorName = name || 'Guest';
            setSaveState('saving');
            try {
                const saved = await smartAlbumCommentsService.saveClientComment({
                    albumId,
                    spreadIndex,
                    commentId: draftId,
                    body,
                    authorName,
                    authorEmail: email || null,
                });
                setDraftId(saved.id);
                setGuestName(authorName);
                persistGuestProfile({
                    name: authorName,
                    email: email || null,
                    drafts: { ...getGuestProfile(albumId).drafts, [spreadIndex]: saved.id },
                });
                setShowGuestFields(false);
                setShowGuestPopover(false);
                setSaveState('saved');
                setComments((prev) => {
                    const next = prev.filter((c) => c.id !== saved.id);
                    return [...next, saved].sort(
                        (a, b) =>
                            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    );
                });
                if (isFooter) {
                    refreshAlbumCommentCount();
                }
                try {
                    await loadComments();
                } catch (reloadErr) {
                    console.warn('Comment saved; reload failed:', reloadErr);
                }
            } catch (e) {
                console.error(e);
                setSaveState('error');
            }
        },
        [albumId, spreadIndex, draftId, loadComments, persistGuestProfile, isFooter, refreshAlbumCommentCount]
    );

    const clearDraftComment = useCallback(async () => {
        const id = draftId;
        if (!id || !albumId || spreadIndex == null) return;
        try {
            await smartAlbumCommentsService.deleteClientComment({ albumId, commentId: id });
            const profile = getGuestProfile(albumId);
            const drafts = { ...profile.drafts };
            delete drafts[spreadIndex];
            persistGuestProfile({ drafts });
            setDraftId(null);
            setDraftBody('');
            setComments((prev) => prev.filter((c) => c.id !== id));
            if (isFooter) refreshAlbumCommentCount();
        } catch (e) {
            console.error(e);
        }
    }, [albumId, spreadIndex, draftId, persistGuestProfile, isFooter, refreshAlbumCommentCount]);

    useEffect(() => {
        if (!isFooter) return undefined;
        if (saveState === 'saved') {
            showToast('Comment saved', { variant: 'success', duration: 2500 });
            setSaveState('idle');
        } else if (saveState === 'error') {
            showToast(
                'Could not sync to server — saved on this device. Turn on Publish and Allow comments in the editor.',
                { variant: 'error', duration: 5500 }
            );
            setSaveState('idle');
        }
        return undefined;
    }, [saveState, isFooter, showToast]);

    const handleDraftChange = (value) => {
        setDraftBody(value);
    };

    const handleGuestContinue = () => {
        if (!guestName.trim()) return;
        persistGuestProfile({ name: guestName.trim(), email: guestEmail.trim() || null });
        setShowGuestFields(false);
        setShowGuestPopover(false);
        inputRef.current?.focus();
    };

    const handleInputFocus = () => {
        if (showGuestFields) setShowGuestPopover(true);
    };

    const submitComment = useCallback(
        async (text) => {
            if (!showClientCompose) return;
            const body = (text ?? draftBody).trim();
            if (!body) {
                if (draftId) await clearDraftComment();
                return;
            }
            const guest = resolveGuest();
            saveDraft(body, guest.name, guest.email);
        },
        [draftBody, showClientCompose, resolveGuest, saveDraft, draftId, clearDraftComment]
    );

    const handleCommentSubmit = (e) => {
        e.preventDefault();
        const text = e.currentTarget.elements.comment?.value ?? draftBody;
        submitComment(text);
    };

    const handleCommentKeyDown = (e) => {
        if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
        e.preventDefault();
        submitComment(e.currentTarget.value);
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
            <div className={`asc-panel asc-panel--disabled${isFooter ? ' asc-panel--footer' : ''}`}>
                <p>Comments are not available for this album.</p>
            </div>
        );
    }

    const renderThreadList = () => (
        <ul className="asc-thread-list">
            {threads.map(({ root, replies }) => (
                <li key={root.id} className="asc-thread">
                    <div className={`asc-message asc-message--${root.author_type}`}>
                        <div className="asc-message-meta">
                            <strong>{root.author_name}</strong>
                            <time dateTime={root.created_at}>
                                {new Date(root.updated_at || root.created_at).toLocaleString()}
                            </time>
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
                                <time dateTime={reply.created_at}>
                                    {new Date(reply.created_at).toLocaleString()}
                                </time>
                            </div>
                            <p>{reply.body}</p>
                        </div>
                    ))}
                    {isPhotographer && commentsEnabled && (
                        <div className="asc-reply-box">
                            <textarea
                                className="asc-textarea asc-textarea--small"
                                rows={2}
                                placeholder="Write a reply to the client…"
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
    );

    if (isFooter && showClientCompose) {
        return (
            <div className="asc-footer-wrap" aria-label={`Comments for ${spreadLabel}`}>
                {threadsOpen && (
                    <div className="asc-bar-panel">
                        {loading ? (
                            <p className="asc-bar-panel-muted">Loading comments…</p>
                        ) : threads.length === 0 ? (
                            <p className="asc-bar-panel-muted">No comments on this spread yet.</p>
                        ) : (
                            renderThreadList()
                        )}
                    </div>
                )}

                {showGuestPopover && showGuestFields && (
                    <div className="asc-bar-guest-pop">
                        <p className="asc-bar-guest-title">Your name</p>
                        <input
                            type="text"
                            className="asc-bar-guest-input"
                            placeholder="e.g. Sarah James"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                        />
                        <input
                            type="email"
                            className="asc-bar-guest-input"
                            placeholder="Email (optional)"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                        />
                        <button
                            type="button"
                            className="asc-bar-guest-btn"
                            disabled={!guestName.trim()}
                            onClick={handleGuestContinue}
                        >
                            Continue
                        </button>
                    </div>
                )}

                <div className="asc-comment-bar">
                    <button
                        type="button"
                        className="asc-comment-bar-count"
                        onClick={() => setThreadsOpen((v) => !v)}
                        aria-expanded={threadsOpen}
                    >
                        {loading && albumCommentCount == null
                            ? '…'
                            : (() => {
                                  const count =
                                      albumCommentCount != null ? albumCommentCount : commentCount;
                                  return `${count} comment${count === 1 ? '' : 's'}`;
                              })()}
                    </button>
                    <form className="asc-comment-bar-form" onSubmit={handleCommentSubmit}>
                        <input
                            ref={inputRef}
                            type="text"
                            name="comment"
                            className="asc-comment-bar-input"
                            placeholder="Type your comment and press Enter to save"
                            value={draftBody}
                            onChange={(e) => handleDraftChange(e.target.value)}
                            onKeyDown={handleCommentKeyDown}
                            onFocus={handleInputFocus}
                            spellCheck={false}
                            autoComplete="off"
                            aria-label={`Add comment for ${spreadLabel}`}
                        />
                        <button type="submit" className="asc-comment-bar-submit" tabIndex={-1}>
                            Post
                        </button>
                    </form>
                    {saveState === 'saving' && (
                        <span className="asc-comment-bar-saving" aria-live="polite">
                            Saving…
                        </span>
                    )}
                </div>

                {createPortal(
                    <AppToast
                        toast={toast}
                        onDismiss={clearToast}
                        hostClassName="asc-comment-toast-host"
                    />,
                    document.body
                )}
            </div>
        );
    }

    if (isFooter) {
        return (
            <div className="asc-footer-wrap" aria-label={`Comments for ${spreadLabel}`}>
                {threadsOpen && threads.length > 0 && (
                    <div className="asc-bar-panel">{renderThreadList()}</div>
                )}
                <div className="asc-comment-bar asc-comment-bar--readonly">
                    <button
                        type="button"
                        className="asc-comment-bar-count"
                        onClick={() => setThreadsOpen((v) => !v)}
                    >
                        {loading ? '…' : `${commentCount} comment${commentCount === 1 ? '' : 's'}`}
                    </button>
                    <span className="asc-comment-bar-hint">
                        {isPhotographer && !commentsEnabled
                            ? 'Enable comments in the editor to allow client feedback.'
                            : 'Comments appear here when clients leave feedback.'}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <section className="asc-panel" aria-label={`Comments for ${spreadLabel}`}>
            <header className="asc-header">
                <div>
                    <h2 className="asc-title">Your feedback</h2>
                    <p className="asc-subtitle">
                        Comments for <strong>{spreadLabel}</strong> · press Enter to save
                    </p>
                </div>
            </header>

            {showClientCompose && (
                <div className="asc-compose asc-compose--primary">
                    {showGuestFields ? (
                        <div className="asc-guest-intro">
                            <p className="asc-guest-intro-text">
                                Introduce yourself once, then add notes for each spread you review.
                            </p>
                            <div className="asc-guest-fields asc-guest-fields--stacked">
                                <label className="asc-field">
                                    <span className="asc-field-label">Your name</span>
                                    <input
                                        type="text"
                                        className="asc-input"
                                        placeholder="e.g. Sarah James"
                                        value={guestName}
                                        onChange={(e) => setGuestName(e.target.value)}
                                    />
                                </label>
                                <label className="asc-field">
                                    <span className="asc-field-label">Email (optional)</span>
                                    <input
                                        type="email"
                                        className="asc-input"
                                        placeholder="you@email.com"
                                        value={guestEmail}
                                        onChange={(e) => setGuestEmail(e.target.value)}
                                    />
                                </label>
                            </div>
                            <button
                                type="button"
                                className="asc-btn asc-btn--primary asc-btn--full"
                                disabled={!guestName.trim()}
                                onClick={handleGuestContinue}
                            >
                                Continue
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="asc-compose-row">
                                <span className="asc-compose-as">Commenting as</span>
                                <strong>{guestName}</strong>
                                <button
                                    type="button"
                                    className="asc-link-btn"
                                    onClick={() => setShowGuestFields(true)}
                                >
                                    Change
                                </button>
                            </div>
                            <label className="asc-field asc-field--full">
                                <span className="asc-field-label">Message for this spread</span>
                                <textarea
                                    className="asc-textarea"
                                    rows={4}
                                    placeholder="Share what you like, or what should change on this spread…"
                                    value={draftBody}
                                    onChange={(e) => handleDraftChange(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing)
                                            return;
                                        e.preventDefault();
                                        submitComment(e.currentTarget.value);
                                    }}
                                />
                            </label>
                            <div className="asc-compose-foot">
                                <span className={`asc-save-status asc-save-status--${saveState}`}>
                                    {saveState === 'saving' && 'Saving…'}
                                    {saveState === 'saved' && 'Saved'}
                                    {saveState === 'error' && 'Could not save — try again'}
                                    {saveState === 'idle' &&
                                        (draftBody.trim()
                                            ? 'Press Enter to save'
                                            : 'Type to add your feedback')}
                                </span>
                            </div>
                        </>
                    )}
                </div>
            )}

            <div className="asc-thread-area">
                {loading ? (
                    <p className="asc-muted">Loading comments…</p>
                ) : threads.length === 0 ? (
                    <p className="asc-empty">
                        {showClientCompose
                            ? 'No comments on this spread yet. Be the first to leave feedback above.'
                            : 'No comments on this spread yet.'}
                    </p>
                ) : (
                    renderThreadList()
                )}
            </div>

            {isPhotographer && !commentsEnabled && (
                <p className="asc-muted">Enable comments in the editor (Comments panel) to allow client feedback.</p>
            )}
        </section>
    );
}
