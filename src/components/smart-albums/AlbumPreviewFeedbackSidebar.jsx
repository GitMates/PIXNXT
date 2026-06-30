import React, { useCallback, useEffect, useState } from 'react';
import { Mic, Paperclip, Play, Send, X } from 'lucide-react';
import AlbumPreviewSpreadFeed from './AlbumPreviewSpreadFeed';
import {
    getGuestProfile,
    saveGuestProfile,
    smartAlbumCommentsService,
} from '../../services/smartAlbumComments.service';
import { canClientLeaveFeedback } from './albumProoferPreview';
import './AlbumPreviewFeedbackSidebar.css';

const TUTORIAL_DISMISS_KEY = 'pixnxt_album_feedback_tutorial_dismissed';

const QUICK_STEPS = [
    'Click on any area of the photo to place an annotation',
    'Leave a comment or describe what needs to be changed',
    'Attach images or audio recordings for clarity',
    'Submit and photographer will see your feedback pinned to the exact location',
];

function readTutorialDismissed() {
    try {
        return localStorage.getItem(TUTORIAL_DISMISS_KEY) === '1';
    } catch {
        return false;
    }
}

function writeTutorialDismissed() {
    try {
        localStorage.setItem(TUTORIAL_DISMISS_KEY, '1');
    } catch {
        /* ignore */
    }
}

function FeedbackTutorial({ onDismiss, onVideoClick }) {
    return (
        <article className="av-feedback-tutorial">
            <div className="av-feedback-tutorial__head">
                <div>
                    <h3 className="av-feedback-tutorial__title">
                        How to Leave Comments &amp; Swap Requests
                    </h3>
                    <p className="av-feedback-tutorial__subtitle">Quick guide on using annotations</p>
                </div>
                <button
                    type="button"
                    className="av-feedback-tutorial__close"
                    onClick={onDismiss}
                    aria-label="Dismiss tutorial"
                >
                    <X size={16} />
                </button>
            </div>

            <button
                type="button"
                className="av-feedback-tutorial__video"
                onClick={onVideoClick}
                aria-label="Play tutorial video"
            >
                <span className="av-feedback-tutorial__play">
                    <Play size={18} fill="currentColor" />
                </span>
                <span className="av-feedback-tutorial__video-label">Click to play</span>
            </button>

            <div className="av-feedback-tutorial__steps">
                <p className="av-feedback-tutorial__steps-label">Quick steps</p>
                <ol className="av-feedback-tutorial__list">
                    {QUICK_STEPS.map((step, index) => (
                        <li key={step}>
                            <span className="av-feedback-tutorial__step-num">{index + 1}</span>
                            <span>{step}</span>
                        </li>
                    ))}
                </ol>
            </div>

            <button type="button" className="av-feedback-tutorial__dismiss" onClick={onDismiss}>
                Got it, dismiss tutorial
            </button>
        </article>
    );
}

function FeedbackCompose({
    albumId,
    spreadIndex,
    commentsEnabled,
    clientPreview,
    prooferAccess,
    allowExternalUploads,
    onBlocked,
    onSaved,
    onNotify,
}) {
    const [draft, setDraft] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setDraft('');
    }, [spreadIndex]);

    const resolveGuest = useCallback(() => {
        const profile = getGuestProfile(albumId);
        return {
            name: profile?.name?.trim() || 'Guest',
            email: profile?.email?.trim() || null,
        };
    }, [albumId]);

    const handleSend = useCallback(async () => {
        const body = draft.trim();
        if (!body || !albumId || spreadIndex == null || saving) return;
        if (!commentsEnabled) return;

        if (clientPreview && prooferAccess) {
            const guard = canClientLeaveFeedback(albumId, prooferAccess, 'comment');
            if (!guard.ok) {
                onBlocked?.(guard.message, guard.code);
                return;
            }
        }

        if (clientPreview && prooferAccess?.requireNameForComments) {
            const profileName = getGuestProfile(albumId)?.name?.trim();
            if (!profileName) {
                onBlocked?.('Enter your name before leaving feedback.', 'name-required');
                return;
            }
        }

        const guest = resolveGuest();

        setSaving(true);
        try {
            await smartAlbumCommentsService.saveClientCommentAndConsolidate({
                albumId,
                spreadIndex,
                body,
                authorName: guest.name,
                authorEmail: guest.email,
            });
            if (guest.name) {
                saveGuestProfile(albumId, {
                    ...getGuestProfile(albumId),
                    name: guest.name,
                    email: guest.email,
                });
            }
            setDraft('');
            onSaved?.();
        } catch (err) {
            console.error(err);
            onNotify?.('Could not save comment. Please try again.');
        } finally {
            setSaving(false);
        }
    }, [
        draft,
        albumId,
        spreadIndex,
        saving,
        commentsEnabled,
        clientPreview,
        prooferAccess,
        resolveGuest,
        onBlocked,
        onSaved,
        onNotify,
    ]);

    const handleKeyDown = (event) => {
        if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
        event.preventDefault();
        void handleSend();
    };

    const disabled = !commentsEnabled || saving;

    return (
        <footer className="av-feedback-compose">
            <textarea
                className="av-feedback-compose__input"
                rows={3}
                placeholder="Add a comment, image, or audio recording..."
                value={draft}
                disabled={disabled}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Add feedback for this spread"
            />
            <div className="av-feedback-compose__actions">
                <div className="av-feedback-compose__actions-left">
                    <button
                        type="button"
                        className="av-feedback-compose__icon-btn"
                        disabled={disabled || !allowExternalUploads}
                        onClick={() =>
                            onNotify?.(
                                allowExternalUploads
                                    ? 'Use the photo annotation tools to attach images to swap requests.'
                                    : 'External image uploads are disabled for this album.'
                            )
                        }
                        aria-label="Attach image"
                    >
                        <Paperclip size={18} />
                    </button>
                    <button
                        type="button"
                        className="av-feedback-compose__icon-btn"
                        disabled={disabled}
                        onClick={() => onNotify?.('Audio recording is coming soon.')}
                        aria-label="Record audio"
                    >
                        <Mic size={18} />
                    </button>
                </div>
                <button
                    type="button"
                    className="av-feedback-compose__icon-btn av-feedback-compose__icon-btn--send"
                    disabled={disabled || !draft.trim()}
                    onClick={() => void handleSend()}
                    aria-label="Send feedback"
                >
                    <Send size={18} />
                </button>
            </div>
        </footer>
    );
}

export default function AlbumPreviewFeedbackSidebar({
    albumId,
    spreadIndex,
    spreadOpts,
    businessName,
    clientPreview = false,
    commentsEnabled = true,
    prooferAccess = null,
    visibleSpreadFeed = [],
    editingPinId,
    editingPinMessage,
    onEditPinStart,
    onEditPinCancel,
    onEditPinMessageChange,
    onEditPinSave,
    onJumpToSpread,
    onRemoveSwap,
    onRemoveReplacement,
    onBlocked,
    onNotify,
    onCommentsChanged,
}) {
    const [tutorialDismissed, setTutorialDismissed] = useState(readTutorialDismissed);

    const dismissTutorial = useCallback(() => {
        writeTutorialDismissed();
        setTutorialDismissed(true);
    }, []);

    const hasFeed = visibleSpreadFeed.length > 0;
    const allowExternal = prooferAccess?.allowExternalUploads ?? false;

    return (
        <aside className="av-feedback-sidebar" aria-label="Feedback">
            <header className="av-feedback-sidebar__header">
                <h2 className="av-feedback-sidebar__title">Feedback</h2>
            </header>

            <div className="av-feedback-sidebar__body">
                {!tutorialDismissed && !hasFeed ? (
                    <FeedbackTutorial
                        onDismiss={dismissTutorial}
                        onVideoClick={() => onNotify?.('Tutorial video coming soon.')}
                    />
                ) : null}

                <div className="av-feedback-sidebar__feed">
                    {hasFeed ? (
                        <AlbumPreviewSpreadFeed
                            feed={visibleSpreadFeed}
                            albumId={albumId}
                            businessName={businessName}
                            spreadOpts={spreadOpts}
                            editingPinId={editingPinId}
                            editingPinMessage={editingPinMessage}
                            onEditPinStart={onEditPinStart}
                            onEditPinCancel={onEditPinCancel}
                            onEditPinMessageChange={onEditPinMessageChange}
                            onEditPinSave={onEditPinSave}
                            onJumpToSpread={onJumpToSpread}
                            onRemoveSwap={onRemoveSwap}
                            onRemoveReplacement={onRemoveReplacement}
                        />
                    ) : (
                        <p className="av-feedback-sidebar__empty">
                            No comments, swap requests, or photo changes on this spread yet.
                        </p>
                    )}
                </div>
            </div>

            <FeedbackCompose
                albumId={albumId}
                spreadIndex={spreadIndex}
                commentsEnabled={commentsEnabled}
                clientPreview={clientPreview}
                prooferAccess={prooferAccess}
                allowExternalUploads={allowExternal}
                onBlocked={onBlocked}
                onSaved={onCommentsChanged}
                onNotify={onNotify}
            />
        </aside>
    );
}
