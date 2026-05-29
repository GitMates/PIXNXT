import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
    repliesEnabled = true,
    isPhotographer = false,
    photographerName = 'Photographer',
    clientView = false,
    variant = 'default',
}) {
    const isFooter = variant === 'footer';
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [draftBody, setDraftBody] = useState('');
    const [draftId, setDraftId] = useState(null);
    const [saveState, setSaveState] = useState('idle');
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [showGuestFields, setShowGuestFields] = useState(true);
    const [threadsOpen, setThreadsOpen] = useState(false);
    const [albumCommentCount, setAlbumCommentCount] = useState(null);
    const [replyBodies, setReplyBodies] = useState({});
    const [replyBusy, setReplyBusy] = useState(null);
    const [replyOpenId, setReplyOpenId] = useState(null);
    const [composeOpen, setComposeOpen] = useState(false);
    const [resolveBusyId, setResolveBusyId] = useState(null);
    const { toast, showToast, clearToast } = useAppToast(2500);

    const threads = useMemo(() => groupCommentsByThread(comments), [comments]);
    const commentCount = useMemo(() => commentCountFromThreads(threads), [threads]);
    const showClientCompose = clientView && commentsEnabled && !isPhotographer;
    const canModerateThreads = isPhotographer;

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

    const syncComments = useCallback(async () => {
        if (!albumId || spreadIndex == null) return;
        try {
            const rows = await smartAlbumCommentsService.listSpreadComments(albumId, spreadIndex);
            setComments(rows);
            if (isFooter) {
                await refreshAlbumCommentCount();
            }
        } catch (e) {
            console.warn('Comment sync failed', e);
        }
    }, [albumId, spreadIndex, isFooter, refreshAlbumCommentCount]);

    useEffect(() => {
        setThreadsOpen(false);
        setReplyOpenId(null);
        setComposeOpen(false);
    }, [spreadIndex]);

    useEffect(() => {
        if (!isFooter || !showClientCompose || !albumId) return undefined;
        syncComments();
        const intervalId = window.setInterval(syncComments, 8000);
        const onChanged = (e) => {
            if (e.detail?.albumId === albumId) syncComments();
        };
        window.addEventListener(COMMENTS_CHANGED_EVENT, onChanged);
        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener(COMMENTS_CHANGED_EVENT, onChanged);
        };
    }, [isFooter, showClientCompose, albumId, syncComments]);

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
    };

    const handleFooterCommentSubmit = (e) => {
        e?.preventDefault();
        const body = draftBody.trim();
        if (!body) return;
        if (showGuestFields && !guestName.trim()) {
            setComposeOpen(true);
            return;
        }
        submitComment(body);
    };

    const submitComposeModal = async () => {
        const body = draftBody.trim();
        if (!body) return;
        if (showGuestFields && !guestName.trim()) return;
        const guest = resolveGuest();
        await saveDraft(body, guest.name, guest.email);
        setComposeOpen(false);
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

    const handleReply = async (parentId, authorType = 'photographer', bodyOverride) => {
        const body = (bodyOverride ?? replyBodies[parentId] ?? '').trim();
        if (!body) return;
        setReplyBusy(parentId);
        try {
            if (authorType === 'client') {
                const guest = resolveGuest();
                await smartAlbumCommentsService.saveClientReply({
                    albumId,
                    spreadIndex,
                    parentId,
                    body,
                    authorName: guest.name,
                    authorEmail: guest.email,
                });
            } else {
                await smartAlbumCommentsService.savePhotographerReply({
                    albumId,
                    spreadIndex,
                    parentId,
                    body,
                    authorName: photographerName,
                });
            }
            setReplyBodies((prev) => ({ ...prev, [parentId]: '' }));
            setReplyOpenId(null);
            await loadComments();
            if (isFooter) {
                showToast('Reply sent', { variant: 'success', duration: 2500 });
            }
        } catch (e) {
            console.error(e);
            if (isFooter) {
                showToast('Could not send reply. Try again.', { variant: 'error', duration: 4000 });
            }
        } finally {
            setReplyBusy(null);
        }
    };

    const handleToggleResolved = async (root) => {
        if (!canModerateThreads) return;
        setResolveBusyId(root.id);
        try {
            await smartAlbumCommentsService.setThreadResolved({
                albumId,
                spreadIndex,
                rootId: root.id,
                resolved: !root.resolved,
            });
            await loadComments();
        } catch (e) {
            console.error(e);
        } finally {
            setResolveBusyId(null);
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
                <li
                    key={root.id}
                    className={`asc-thread${root.resolved ? ' asc-thread--resolved' : ''}`}
                >
                    <div className={`asc-message asc-message--${root.author_type}`}>
                        <div className="asc-message-meta">
                            <div className="asc-message-headline">
                                <strong>{root.author_name}</strong>
                                <span className="asc-kind-badge">Comment</span>
                            </div>
                            <time dateTime={root.created_at}>
                                {new Date(root.updated_at || root.created_at).toLocaleString()}
                            </time>
                        </div>
                        <p>{root.body}</p>
                        {(isPhotographer || showClientCompose) && commentsEnabled && (
                            <div className="asc-message-actions">
                                {repliesEnabled && (
                                    <button
                                        type="button"
                                        className="asc-link-btn asc-link-btn--inline"
                                        onClick={() => setReplyOpenId(root.id)}
                                    >
                                        Reply
                                    </button>
                                )}
                                {canModerateThreads && (
                                    <button
                                        type="button"
                                        className="asc-link-btn asc-link-btn--inline"
                                        disabled={resolveBusyId === root.id}
                                        onClick={() => handleToggleResolved(root)}
                                    >
                                        {root.resolved ? 'Reopen' : 'Resolve'}
                                    </button>
                                )}
                                <span
                                    className={`asc-thread-status${
                                        root.resolved ? ' asc-thread-status--resolved' : ''
                                    }`}
                                >
                                    {root.resolved ? 'Resolved' : 'Open'}
                                </span>
                            </div>
                        )}
                    </div>
                    {replies.map((reply) => (
                        <div
                            key={reply.id}
                            className={`asc-message asc-message--reply asc-message--${reply.author_type}`}
                        >
                            <div className="asc-message-meta">
                                <div className="asc-message-headline">
                                    <strong>{reply.author_name}</strong>
                                    <span className="asc-kind-badge asc-kind-badge--reply">Reply</span>
                                </div>
                                <time dateTime={reply.created_at}>
                                    {new Date(reply.created_at).toLocaleString()}
                                </time>
                            </div>
                            <p>{reply.body}</p>
                        </div>
                    ))}
                </li>
            ))}
        </ul>
    );

    const replyTarget = replyOpenId
        ? threads.find((t) => t.root.id === replyOpenId)?.root || null
        : null;
    const canReply =
        Boolean(replyTarget) &&
        ((isPhotographer && commentsEnabled) || (showClientCompose && commentsEnabled));
    const replyBody = replyTarget ? replyBodies[replyTarget.id] || '' : '';
    const replyModal =
        canReply &&
        createPortal(
            <div
                className="asc-reply-modal-backdrop"
                onClick={() => setReplyOpenId(null)}
                role="presentation"
            >
                <div
                    className="asc-reply-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Reply to comment"
                    onClick={(e) => e.stopPropagation()}
                >
                    <h5 className="asc-reply-modal-title">Reply to {replyTarget.author_name}</h5>
                    <textarea
                        className="asc-textarea asc-textarea--small"
                        rows={3}
                        autoFocus
                        placeholder={
                            isPhotographer ? 'Write a reply to the client…' : 'Write your reply…'
                        }
                        value={replyBody}
                        onChange={(e) =>
                            setReplyBodies((prev) => ({
                                ...prev,
                                [replyTarget.id]: e.target.value,
                            }))
                        }
                        onKeyDown={(e) => {
                            if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
                            e.preventDefault();
                            handleReply(replyTarget.id, isPhotographer ? 'photographer' : 'client');
                        }}
                    />
                    <div className="asc-reply-modal-actions">
                        <button
                            type="button"
                            className="asc-link-btn asc-link-btn--inline"
                            onClick={() => setReplyOpenId(null)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="asc-btn asc-btn--primary"
                            disabled={replyBusy === replyTarget.id || !replyBody.trim()}
                            onClick={() =>
                                handleReply(replyTarget.id, isPhotographer ? 'photographer' : 'client')
                            }
                        >
                            {replyBusy === replyTarget.id ? 'Sending…' : 'Send reply'}
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        );

    const composeModal =
        composeOpen &&
        showClientCompose &&
        createPortal(
            <div
                className="asc-reply-modal-backdrop"
                onClick={() => setComposeOpen(false)}
                role="presentation"
            >
                <div
                    className="asc-reply-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Add comment"
                    onClick={(e) => e.stopPropagation()}
                >
                    <h5 className="asc-reply-modal-title">Add comment · {spreadLabel}</h5>
                    {showGuestFields ? (
                        <>
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
                        </>
                    ) : (
                        <p className="asc-reply-modal-quote">Commenting as {guestName}</p>
                    )}
                    <textarea
                        className="asc-textarea asc-textarea--small"
                        rows={3}
                        autoFocus={!showGuestFields}
                        placeholder="Type your comment…"
                        value={draftBody}
                        onChange={(e) => handleDraftChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
                            e.preventDefault();
                            submitComposeModal();
                        }}
                    />
                    <div className="asc-reply-modal-actions">
                        <button
                            type="button"
                            className="asc-link-btn asc-link-btn--inline"
                            onClick={() => setComposeOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="asc-btn asc-btn--primary"
                            disabled={saveState === 'saving' || !draftBody.trim()}
                            onClick={submitComposeModal}
                        >
                            {saveState === 'saving' ? 'Saving…' : 'Save comment'}
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        );

    if (isFooter && showClientCompose) {
        const displayCount =
            albumCommentCount != null && !loading ? albumCommentCount : commentCount;
        return (
            <div className="asc-footer-wrap" aria-label={`Comments for ${spreadLabel}`}>
                {threadsOpen && !replyOpenId && !composeOpen && (
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
                {replyModal}
                {composeModal}

                <div className="asc-comment-bar">
                    <button
                        type="button"
                        className="asc-comment-bar-count"
                        onClick={() => setThreadsOpen((v) => !v)}
                        aria-expanded={threadsOpen}
                    >
                        {loading && albumCommentCount == null
                            ? '…'
                            : `${displayCount} comment${displayCount === 1 ? '' : 's'}`}
                    </button>
                    <form className="asc-comment-bar-form" onSubmit={handleFooterCommentSubmit}>
                        <input
                            type="text"
                            className="asc-comment-bar-input"
                            placeholder="Start typing here to add new comment"
                            value={draftBody}
                            onChange={(e) => handleDraftChange(e.target.value)}
                            disabled={saveState === 'saving'}
                            aria-label="Add a comment"
                        />
                        <button type="submit" className="asc-comment-bar-submit">
                            Save comment
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
            {replyModal}

            {isPhotographer && !commentsEnabled && (
                <p className="asc-muted">Enable comments in the editor (Comments panel) to allow client feedback.</p>
            )}
        </section>
    );
}
