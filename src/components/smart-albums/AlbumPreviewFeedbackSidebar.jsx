import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mic, Paperclip, Play, Send, X } from 'lucide-react';
import AlbumPreviewSpreadFeed from './AlbumPreviewSpreadFeed';
import {
    getGuestProfile,
    saveGuestProfile,
    smartAlbumCommentsService,
} from '../../services/smartAlbumComments.service';
import { notifyClientFeedbackEvent, albumHadClientFeedbackBefore } from './albumClientFeedbackNotify';
import { prepareCommentAttachmentFromFile } from './albumCommentAttachments';
import { canClientAttachImage, canClientLeaveFeedback, canClientRecordVoice } from './albumProoferPreview';
import { useFeedbackVoiceRecorder } from './useFeedbackVoiceRecorder';
import VoiceMessagePlayer from './VoiceMessagePlayer';
import VoiceRecordingBar from './VoiceRecordingBar';
import './AlbumPreviewFeedbackSidebar.css';

const QUICK_STEPS = [
    'Click on any area of the photo to place an annotation',
    'Leave a comment or describe what needs to be changed',
    'Attach images or audio recordings for clarity',
    'Submit and photographer will see your feedback pinned to the exact location',
];

function getTutorialDismissKey(albumId) {
    return albumId
        ? `pixnxt_album_feedback_tutorial_dismissed_${albumId}`
        : 'pixnxt_album_feedback_tutorial_dismissed';
}

function readTutorialDismissed(albumId) {
    try {
        return localStorage.getItem(getTutorialDismissKey(albumId)) === '1';
    } catch {
        return false;
    }
}

function writeTutorialDismissed(albumId) {
    try {
        localStorage.setItem(getTutorialDismissKey(albumId), '1');
    } catch {
        /* ignore */
    }
}

function VideoPopup({ onClose }) {
    const videoRef = useRef(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return undefined;
        video.loop = true;
        const playPromise = video.play();
        if (playPromise?.catch) playPromise.catch(() => {});
        return () => {
            video.pause();
        };
    }, []);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            video.play().catch(() => {});
        } else {
            video.pause();
        }
    };

    return createPortal(
        <div
            className="avp-video-popup-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Tutorial video"
            onClick={onClose}
        >
            <div className="avp-video-popup" onClick={(e) => e.stopPropagation()}>
                <button
                    type="button"
                    className="avp-video-popup__close"
                    onClick={onClose}
                    aria-label="Close video"
                >
                    <X size={20} />
                </button>
                <video
                    ref={videoRef}
                    className="avp-video-popup__video"
                    src="/albumguide.mp4"
                    playsInline
                    loop
                    preload="auto"
                    onClick={togglePlay}
                    onEnded={(e) => {
                        e.currentTarget.currentTime = 0;
                        e.currentTarget.play().catch(() => {});
                    }}
                />
            </div>
        </div>,
        document.body
    );
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
    photographerId = null,
    spreadIndex,
    spreadLabel = 'Spread',
    commentsEnabled,
    clientPreview,
    prooferAccess,
    onBlocked,
    onSaved,
    onNotify,
}) {
    const [draft, setDraft] = useState('');
    const [saving, setSaving] = useState(false);
    const [pendingAttachment, setPendingAttachment] = useState(null);
    const [preparingAttachment, setPreparingAttachment] = useState(false);
    const fileInputRef = useRef(null);

    const {
        recording,
        preparing: preparingVoice,
        elapsedLabel,
        levels: voiceLevels,
        toggleRecording,
        cancelRecording,
    } = useFeedbackVoiceRecorder({
        onError: onNotify,
        onRecordingReady: setPendingAttachment,
    });

    useEffect(() => {
        setDraft('');
        setPendingAttachment(null);
        setPreparingAttachment(false);
        cancelRecording();
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [spreadIndex, cancelRecording]);

    const resolveGuest = useCallback(() => {
        const profile = getGuestProfile(albumId);
        return {
            name: profile?.name?.trim() || 'Guest',
            email: profile?.email?.trim() || null,
        };
    }, [albumId]);

    const canAttachImage = canClientAttachImage(prooferAccess, { clientPreview });
    const canRecordVoice = canClientRecordVoice(prooferAccess, { clientPreview });

    const ensureCanLeaveFeedback = useCallback(() => {
        if (!clientPreview || !prooferAccess || !albumId) return true;
        const guard = canClientLeaveFeedback(albumId, prooferAccess, 'comment');
        if (!guard.ok) {
            onBlocked?.(guard.message, guard.code);
            return false;
        }
        return true;
    }, [clientPreview, prooferAccess, albumId, onBlocked]);

    useEffect(() => {
        if (canAttachImage && canRecordVoice) return;
        if (!canAttachImage && pendingAttachment?.type === 'image') {
            setPendingAttachment(null);
        }
        if (!canRecordVoice) {
            if (pendingAttachment?.type === 'audio') {
                setPendingAttachment(null);
            }
            cancelRecording();
        }
    }, [canAttachImage, canRecordVoice, pendingAttachment, cancelRecording]);

    const composePlaceholder = useMemo(() => {
        if (canAttachImage && canRecordVoice) {
            return 'Add a comment, image, or audio recording...';
        }
        if (canAttachImage) {
            return 'Add a comment or attach an image...';
        }
        if (canRecordVoice) {
            return 'Add a comment or record a voice message...';
        }
        return 'Add a comment...';
    }, [canAttachImage, canRecordVoice]);

    const handlePickAttachment = useCallback(() => {
        if (!commentsEnabled || saving || preparingAttachment || recording || preparingVoice) return;
        if (!canAttachImage) {
            onNotify?.('Image uploads are disabled for this album.');
            return;
        }
        if (!ensureCanLeaveFeedback()) return;
        fileInputRef.current?.click();
    }, [
        commentsEnabled,
        saving,
        preparingAttachment,
        recording,
        preparingVoice,
        canAttachImage,
        onNotify,
        ensureCanLeaveFeedback,
    ]);

    const handleAttachmentSelected = useCallback(
        async (event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            if (!ensureCanLeaveFeedback()) return;

            setPreparingAttachment(true);
            try {
                const prepared = await prepareCommentAttachmentFromFile(file);
                setPendingAttachment(prepared);
            } catch (err) {
                console.error(err);
                onNotify?.(err?.message || 'Could not attach image. Please try another file.');
            } finally {
                setPreparingAttachment(false);
            }
        },
        [onNotify, ensureCanLeaveFeedback]
    );

    const handleSend = useCallback(async () => {
        const body = draft.trim();
        if ((!body && !pendingAttachment) || !albumId || spreadIndex == null || saving) return;
        if (!commentsEnabled) return;

        if (pendingAttachment?.type === 'image' && !canAttachImage) {
            onNotify?.('Image uploads are disabled for this album.');
            return;
        }
        if (pendingAttachment?.type === 'audio' && !canRecordVoice) {
            onNotify?.('Voice recordings are disabled for this album.');
            return;
        }

        if (!ensureCanLeaveFeedback()) return;

        const guest = resolveGuest();
        const hadFeedbackBefore = albumHadClientFeedbackBefore(albumId);

        setSaving(true);
        try {
            await smartAlbumCommentsService.saveClientComment({
                albumId,
                spreadIndex,
                body,
                authorName: guest.name,
                authorEmail: guest.email,
                attachmentUrl: pendingAttachment?.url || null,
                attachmentName: pendingAttachment?.name || null,
                attachmentType: pendingAttachment?.type || null,
            });
            if (guest.name) {
                saveGuestProfile(albumId, {
                    ...getGuestProfile(albumId),
                    name: guest.name,
                    email: guest.email,
                });
            }
            setDraft('');
            setPendingAttachment(null);
            notifyClientFeedbackEvent(albumId, {
                photographerId,
                hadFeedbackBefore,
                eventType: 'comment',
                eventLabel: spreadLabel,
                eventDetail: body || pendingAttachment?.name || 'Attachment',
                comments: [{ spread_index: spreadIndex, body, author_name: guest.name }],
            });
            onSaved?.();
        } catch (err) {
            console.error(err);
            onNotify?.(
                err?.message || 'Could not save comment. Please try again.'
            );
        } finally {
            setSaving(false);
        }
    }, [
        draft,
        pendingAttachment,
        albumId,
        spreadIndex,
        saving,
        commentsEnabled,
        resolveGuest,
        ensureCanLeaveFeedback,
        onSaved,
        onNotify,
        photographerId,
        spreadLabel,
        canAttachImage,
        canRecordVoice,
    ]);

    const handleKeyDown = (event) => {
        if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
        event.preventDefault();
        void handleSend();
    };

    const disabled =
        !commentsEnabled || saving || preparingAttachment || recording || preparingVoice;
    const canSend = Boolean(draft.trim() || pendingAttachment);
    const hasInlineAttachment = Boolean(pendingAttachment);
    const showCompactInput = hasInlineAttachment || recording;

    return (
        <footer className="av-feedback-compose">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="av-feedback-compose__file-input"
                tabIndex={-1}
                aria-hidden
                onChange={(event) => void handleAttachmentSelected(event)}
            />
            <div
                className={`av-feedback-compose__input-shell${
                    recording ? ' av-feedback-compose__input-shell--recording' : ''
                }${hasInlineAttachment ? ' av-feedback-compose__input-shell--has-attachment' : ''}`}
            >
                {recording ? (
                    <div className="av-feedback-compose__recording-wrap">
                        <VoiceRecordingBar
                            elapsedLabel={elapsedLabel}
                            levels={voiceLevels}
                            onCancel={() => cancelRecording()}
                            onAccept={() => toggleRecording()}
                        />
                    </div>
                ) : null}
                {pendingAttachment ? (
                    <div className="av-feedback-compose__inline-attachment">
                        {pendingAttachment.type === 'audio' ? (
                            <VoiceMessagePlayer
                                src={pendingAttachment.url}
                                className="av-voice-player--compose"
                                onRemove={() => setPendingAttachment(null)}
                                removeLabel="Remove voice message"
                                ariaLabel="Voice message preview"
                            />
                        ) : (
                            <div className="av-feedback-compose__inline-image-wrap">
                                <img
                                    src={pendingAttachment.url}
                                    alt={pendingAttachment.name || 'Attached image'}
                                    className="av-feedback-compose__inline-image"
                                />
                                <button
                                    type="button"
                                    className="av-feedback-compose__inline-image-remove"
                                    onClick={() => setPendingAttachment(null)}
                                    aria-label="Remove attached image"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                ) : null}
                {!recording ? (
                    <textarea
                        className={`av-feedback-compose__input${
                            showCompactInput ? ' av-feedback-compose__input--compact' : ''
                        }`}
                        rows={showCompactInput ? 2 : 3}
                        placeholder={composePlaceholder}
                        value={draft}
                        disabled={disabled}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={handleKeyDown}
                        aria-label="Add feedback for this spread"
                    />
                ) : null}
                {!recording ? (
                <div className="av-feedback-compose__actions">
                    <div className="av-feedback-compose__actions-left">
                        {canAttachImage ? (
                            <button
                                type="button"
                                className="av-feedback-compose__icon-btn"
                                disabled={disabled}
                                onClick={handlePickAttachment}
                                aria-label="Attach image from computer"
                            >
                                <Paperclip size={18} />
                            </button>
                        ) : null}
                        {canRecordVoice ? (
                            <button
                                type="button"
                                className="av-feedback-compose__icon-btn"
                                disabled={disabled}
                                onClick={() => {
                                    if (!canRecordVoice) {
                                        onNotify?.('Voice recordings are disabled for this album.');
                                        return;
                                    }
                                    if (!ensureCanLeaveFeedback()) return;
                                    toggleRecording();
                                }}
                                aria-label="Record voice message"
                                aria-pressed={false}
                            >
                                <Mic size={18} />
                            </button>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        className="av-feedback-compose__icon-btn av-feedback-compose__icon-btn--send"
                        disabled={disabled || !canSend}
                        onClick={() => void handleSend()}
                        aria-label="Send feedback"
                    >
                        <Send size={18} />
                    </button>
                </div>
                ) : null}
            </div>
        </footer>
    );
}

export default function AlbumPreviewFeedbackSidebar({
    albumId,
    album = null,
    totalPages = 0,
    photoRevision = 0,
    photographerId = null,
    spreadIndex,
    spreadLabel = 'Spread',
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
    onNavigateToPin = null,
    onNavigateToSlotKey = null,
    onNavigateToSwapMark = null,
    onRemoveSwap,
    onRemoveReplacement,
    onNewVersion = null,
    onRestoreReplacement = null,
    onBlocked,
    onNotify,
    onCommentsChanged,
    photoPins = [],
    imageReplacements = [],
}) {
    const [tutorialDismissed, setTutorialDismissed] = useState(() => readTutorialDismissed(albumId));
    const [videoOpen, setVideoOpen] = useState(false);

    const dismissTutorial = useCallback(() => {
        writeTutorialDismissed(albumId);
        setTutorialDismissed(true);
    }, [albumId]);

    const openVideo = useCallback(() => setVideoOpen(true), []);
    const closeVideo = useCallback(() => setVideoOpen(false), []);

    const hasFeed = visibleSpreadFeed.length > 0;

    return (
        <aside className="av-feedback-sidebar" aria-label="Feedback">
            <header className="av-feedback-sidebar__header">
                <div className="av-feedback-sidebar__header-row">
                    <h2 className="av-feedback-sidebar__title">Comment</h2>
                    <span className="av-feedback-sidebar__spread">{spreadLabel}</span>
                </div>
            </header>

            <div className="av-feedback-sidebar__body">
                {videoOpen && <VideoPopup onClose={closeVideo} />}

                {!tutorialDismissed && !hasFeed ? (
                    <FeedbackTutorial
                        onDismiss={dismissTutorial}
                        onVideoClick={openVideo}
                    />
                ) : null}

                <div className="av-feedback-sidebar__feed">
                    {hasFeed ? (
                        <AlbumPreviewSpreadFeed
                            feed={visibleSpreadFeed}
                            albumId={albumId}
                            album={album}
                            totalPages={totalPages}
                            photoRevision={photoRevision}
                            businessName={businessName}
                            spreadOpts={spreadOpts}
                            photoPins={photoPins}
                            imageReplacements={imageReplacements}
                            proofMode
                            clientViewer={clientPreview}
                            editingPinId={editingPinId}
                            editingPinMessage={editingPinMessage}
                            onEditPinStart={onEditPinStart}
                            onEditPinCancel={onEditPinCancel}
                            onEditPinMessageChange={onEditPinMessageChange}
                            onEditPinSave={onEditPinSave}
                            onJumpToSpread={onJumpToSpread}
                            onNavigateToPin={onNavigateToPin}
                            onNavigateToSlotKey={onNavigateToSlotKey}
                            onNavigateToSwapMark={onNavigateToSwapMark}
                            onRemoveSwap={onRemoveSwap}
                            onRemoveReplacement={onRemoveReplacement}
                            onNewVersion={onNewVersion}
                            onRestoreReplacement={onRestoreReplacement}
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
                photographerId={photographerId}
                spreadIndex={spreadIndex}
                spreadLabel={spreadLabel}
                commentsEnabled={commentsEnabled}
                clientPreview={clientPreview}
                prooferAccess={prooferAccess}
                onBlocked={onBlocked}
                onSaved={onCommentsChanged}
                onNotify={onNotify}
            />
        </aside>
    );
}
