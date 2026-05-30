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
import AlbumMessageChat from './AlbumMessageChat';
import './AlbumSpreadComments.css';

function commentCountFromThreads(threads) {
    return threads.reduce((n, t) => (hasCommentBody(t.root) ? n + 1 : n), 0);
}

export default function AlbumSpreadComments({
    albumId,
    spreadIndex,
    spreadLabel = 'Spread',
    commentsEnabled = true,
    messagesEnabled = true,
    isPhotographer = false,
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
    const [composeOpen, setComposeOpen] = useState(false);
    const [messagesOpen, setMessagesOpen] = useState(false);
    const [chatText, setChatText] = useState('');
    const [syncedAt, setSyncedAt] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [deleteBusyId, setDeleteBusyId] = useState(null);
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

    const syncComments = useCallback(async () => {
        if (!albumId || spreadIndex == null) return;
        setSyncing(true);
        try {
            const rows = await smartAlbumCommentsService.listSpreadComments(albumId, spreadIndex);
            setComments(rows);
            setSyncedAt(new Date());
        } catch (e) {
            console.warn('Comment sync failed', e);
        } finally {
            setSyncing(false);
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
        setComposeOpen(false);
        setMessagesOpen(false);
        setChatText('');
    }, [spreadIndex]);

    useEffect(() => {
        if (!messagesEnabled) setMessagesOpen(false);
    }, [messagesEnabled]);

    useEffect(() => {
        if (!isFooter || !messagesOpen || !messagesEnabled || !albumId) return undefined;
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
    }, [isFooter, messagesOpen, messagesEnabled, albumId, syncComments]);

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

    const handleChatSend = async () => {
        const body = chatText.trim();
        if (!body) return;
        if (showGuestFields && !guestName.trim()) {
            showToast('Enter your name to continue.', { variant: 'info', duration: 3000 });
            return;
        }
        const guest = resolveGuest();
        await saveDraft(body, guest.name, guest.email);
        setChatText('');
        setSyncedAt(new Date());
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

    const canDeleteMessage = useCallback(
        (msg) => {
            if (!msg?.id) return false;
            if (isPhotographer) return true;
            if (!showClientCompose || msg.author_type !== 'client') return false;
            const guest = resolveGuest();
            return msg.author_name?.trim().toLowerCase() === guest.name.trim().toLowerCase();
        },
        [isPhotographer, showClientCompose, resolveGuest]
    );

    const handleDeleteMessage = async (msg) => {
        if (!albumId || !msg?.id || !canDeleteMessage(msg)) return;
        if (!window.confirm('Delete this comment?')) return;
        setDeleteBusyId(msg.id);
        try {
            if (isPhotographer) {
                await smartAlbumCommentsService.deleteComment({ albumId, commentId: msg.id });
            } else {
                await smartAlbumCommentsService.deleteClientComment({ albumId, commentId: msg.id });
            }
            if (draftId === msg.id) {
                const profile = getGuestProfile(albumId);
                const drafts = { ...profile.drafts };
                delete drafts[spreadIndex];
                persistGuestProfile({ drafts });
                setDraftId(null);
                setDraftBody('');
            }
            await loadComments();
            setSyncedAt(new Date());
            if (isFooter) {
                refreshAlbumCommentCount();
                showToast('Comment deleted', { variant: 'success', duration: 2500 });
            }
        } catch (e) {
            console.error(e);
            if (isFooter) {
                showToast('Could not delete comment', { variant: 'error', duration: 4000 });
            }
        } finally {
            setDeleteBusyId(null);
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
            {threads.map(({ root }) => (
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
                                {canDeleteMessage(root) && (
                                    <button
                                        type="button"
                                        className="asc-link-btn asc-link-btn--inline asc-link-btn--danger"
                                        disabled={deleteBusyId === root.id}
                                        onClick={() => handleDeleteMessage(root)}
                                    >
                                        {deleteBusyId === root.id ? 'Deleting…' : 'Delete'}
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
                </li>
            ))}
        </ul>
    );

    const renderMessagesChat = (compactGuest = false) => (
        <>
            {compactGuest && showGuestFields && (
                <div className="asc-chat-guest-setup">
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
                    <button
                        type="button"
                        className="asc-btn asc-btn--primary asc-btn--full"
                        disabled={!guestName.trim()}
                        onClick={handleGuestContinue}
                    >
                        Continue
                    </button>
                </div>
            )}
            <AlbumMessageChat
                threads={threads}
                loading={loading}
                spreadLabel={spreadLabel}
                canCompose={showClientCompose && !showGuestFields}
                isPhotographer={isPhotographer}
                guestName={guestName || 'Guest'}
                composerValue={chatText}
                onComposerChange={setChatText}
                onSend={handleChatSend}
                composerBusy={saveState === 'saving'}
                syncedAt={syncedAt}
                syncing={syncing}
                onRefresh={syncComments}
                canDelete={canDeleteMessage}
                onDelete={handleDeleteMessage}
                deleteBusyId={deleteBusyId}
            />
        </>
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
        const handleFooterInputKeyDown = (e) => {
            if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
            e.preventDefault();
            if (showGuestFields && !guestName.trim()) {
                setComposeOpen(true);
                return;
            }
            submitComment(e.currentTarget.value);
        };
        return (
            <div className="asc-footer-wrap" aria-label={`Comments for ${spreadLabel}`}>
                {messagesEnabled && messagesOpen && (
                    <div className="asc-messages-sheet">{renderMessagesChat(true)}</div>
                )}
                {composeModal}

                <div className="asc-comment-bar">
                    <div className="asc-comment-bar-inner">
                        <button
                            type="button"
                            className="asc-comment-bar-count"
                            onClick={() => {
                                if (messagesEnabled) setMessagesOpen((v) => !v);
                            }}
                            aria-expanded={messagesEnabled ? messagesOpen : undefined}
                        >
                            {loading && albumCommentCount == null
                                ? '…'
                                : `${displayCount} comment${displayCount === 1 ? '' : 's'}`}
                        </button>
                        <form
                            className="asc-comment-bar-form"
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (showGuestFields && !guestName.trim()) {
                                    setComposeOpen(true);
                                    return;
                                }
                                submitComment(draftBody);
                            }}
                        >
                            <input
                                type="text"
                                className="asc-comment-bar-input"
                                placeholder="Start typing here to add new comment"
                                value={draftBody}
                                onChange={(e) => handleDraftChange(e.target.value)}
                                onKeyDown={handleFooterInputKeyDown}
                                disabled={saveState === 'saving'}
                                aria-label="Add a comment for this spread"
                            />
                            <button type="submit" className="asc-comment-bar-submit">
                                Save comment
                            </button>
                        </form>
                        {saveState === 'saving' && (
                            <span className="asc-comment-bar-saving">Saving…</span>
                        )}
                    </div>
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
                    <div className="asc-comment-bar-inner">
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
