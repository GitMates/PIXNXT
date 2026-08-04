import React, { useEffect, useMemo, useRef, useState } from 'react';
import CommentAttachmentContent from './CommentAttachmentContent';
import { getClientCommentBadgeLabel, hasCommentAttachment, isCommentAudioAttachment } from './albumCommentAttachments';
import {
    formatCommentTime,
    formatFeedDateLabel,
    getClientReviewerIdentity,
    getGuestProfile,
    isCommentUnseen,
    isGuestCommentUnseen,
    markCommentsSeen,
    smartAlbumCommentsService,
} from '../../services/smartAlbumComments.service';
import { formatRelativeTime } from '../../lib/relativeTime';
import {
    isPhotoPinUnseen,
    markPhotoPinsSeen,
    removePhotoPin,
    updatePhotoPin,
} from './albumPhotoPins';
import {
    getSlotThumbnail,
    isSwapMarkUnseen,
    markSwapMarksSeen,
    parseSlotKey,
} from './albumSwapMarks';
import {
    addProofReply,
    getAllProofRepliesForAlbum,
    makeProofReplyParentKey,
    PROOF_REPLIES_CHANGED_EVENT,
} from './albumProofReplies';
import {
    resolveSpreadThumbVisual,
    resolveSwapSlotSide,
    spreadThumbHasImage,
} from './albumSpreadThumbVisual';
import AlbumPreviewReplacementCard from './AlbumPreviewReplacementCard';
import OverviewLeatherCover from './OverviewLeatherCover';
import SwapIcon from './SwapIcon';
import { getSpreadContext, pageToSpreadIndex } from './albumSpreadUtils';
import './AlbumQuietProofFeed.css';

function resolveSwapEndpointSrc(albumId, slotKey, album, totalPages) {
    if (!albumId || !slotKey) return null;
    const { pageNum, cellId } = parseSlotKey(slotKey);
    return getSlotThumbnail(
        albumId,
        { pageNum, cellId },
        { album, totalPages, showSamples: false }
    );
}

function formatSwapEndpointLabel(label) {
    const raw = String(label || '').trim();
    if (!raw) return 'Spread';
    const spreadSide = raw.match(/Spread\s+(\d+)\s*·\s*(Left|Right|Both|Whole)/i);
    if (spreadSide) {
        return `Spread ${spreadSide[1]} · ${spreadSide[2]}`;
    }
    const spreadOnly = raw.match(/Spread\s+\d+/i);
    if (spreadOnly) return spreadOnly[0];
    return raw;
}

function SwapSpreadThumbFrame({ visual, album, side = null }) {
    if (!visual) {
        return <span className="quiet-proof-card__swap-shot-empty" />;
    }

    if (visual.showSpreadFull && visual.spreadSrc) {
        return (
            <span className="quiet-proof-card__swap-live quiet-proof-card__swap-live--full">
                <img src={visual.spreadSrc} alt="" draggable={false} />
            </span>
        );
    }

    if (visual.isCover || visual.isEndSpread) {
        const src = visual.coverSrc || visual.leftSrc || visual.rightSrc;
        if (src) {
            return (
                <span className="quiet-proof-card__swap-live quiet-proof-card__swap-live--full">
                    <img src={src} alt="" draggable={false} />
                </span>
            );
        }
        if (visual.useLeather) {
            return (
                <span className="quiet-proof-card__swap-live quiet-proof-card__swap-live--leather">
                    <OverviewLeatherCover album={album} showTitle={visual.isCover} />
                </span>
            );
        }
        return <span className="quiet-proof-card__swap-shot-empty" />;
    }

    return (
        <span className="quiet-proof-card__swap-live">
            <span
                className={`quiet-proof-card__swap-live-page${
                    side === 'left' ? ' quiet-proof-card__swap-live-page--active' : ''
                }${side === 'right' ? ' quiet-proof-card__swap-live-page--dim' : ''}`}
            >
                {visual.leftSrc ? (
                    <img src={visual.leftSrc} alt="" draggable={false} />
                ) : (
                    <span className="quiet-proof-card__swap-shot-empty" />
                )}
            </span>
            <span
                className={`quiet-proof-card__swap-live-page${
                    side === 'right' ? ' quiet-proof-card__swap-live-page--active' : ''
                }${side === 'left' ? ' quiet-proof-card__swap-live-page--dim' : ''}`}
            >
                {visual.rightSrc ? (
                    <img src={visual.rightSrc} alt="" draggable={false} />
                ) : (
                    <span className="quiet-proof-card__swap-shot-empty" />
                )}
            </span>
        </span>
    );
}

function shortenSpreadLabel(label) {
    const match = String(label || '').match(/Spread\s+\d+/i);
    return match ? match[0] : String(label || '').trim();
}

function calendarDateKey(isoOrMs) {
    if (isoOrMs == null || isoOrMs === '') return '';
    const d = new Date(isoOrMs);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function QuietProofReplyCompose({ onSend, onCancel, disabled = false }) {
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSend = async () => {
        const body = draft.trim();
        if (!body || sending || disabled) return;
        setSending(true);
        try {
            await onSend?.(body);
            setDraft('');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="quiet-proof-card__reply-compose">
            <textarea
                ref={inputRef}
                className="quiet-proof-card__reply-input"
                rows={2}
                placeholder="Write a reply…"
                value={draft}
                disabled={disabled || sending}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        onCancel?.();
                        return;
                    }
                    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
                    e.preventDefault();
                    void handleSend();
                }}
                aria-label="Reply message"
            />
            <div className="quiet-proof-card__reply-compose-actions">
                <button
                    type="button"
                    className="quiet-proof-card__btn"
                    onClick={onCancel}
                    disabled={sending}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="quiet-proof-card__reply-send"
                    disabled={disabled || sending || !draft.trim()}
                    onClick={() => void handleSend()}
                >
                    {sending ? 'Sending…' : 'Send'}
                </button>
            </div>
        </div>
    );
}

/** Quiet-style proof comment card (photographer Comment panel). */
function QuietProofCard({
    authorName,
    createdAt,
    badge = null,
    children,
    replies = [],
    replyOpen = false,
    unseen = false,
    showMarkDone = true,
    onMarkDone,
    onReply,
    onReplyCancel,
    onReplySend,
    onNavigate,
}) {
    const timeLabel = formatRelativeTime(createdAt) || formatCommentTime(createdAt);
    const name = String(authorName || 'Client').trim() || 'Client';

    return (
        <article
            className={`quiet-proof-card${unseen ? ' quiet-proof-card--unseen' : ''}${
                onNavigate ? ' quiet-proof-card--nav' : ''
            }`}
        >
            <header className="quiet-proof-card__head">
                <div className="quiet-proof-card__title-row">
                    <div className="quiet-proof-card__name-wrap">
                        <span className="quiet-proof-card__name">{name}</span>
                        {badge ? (
                                    <span
                                        className={`quiet-proof-card__badge${
                                            badge === 'Photographer'
                                                ? ' quiet-proof-card__badge--photographer'
                                                : ''
                                        }`}
                                    >
                                        {badge}
                                    </span>
                        ) : null}
                    </div>
                    {timeLabel ? (
                        <time className="quiet-proof-card__time" dateTime={createdAt || undefined}>
                            {timeLabel}
                        </time>
                    ) : null}
                </div>
            </header>

            <div
                className={`quiet-proof-card__body${onNavigate ? ' quiet-proof-card__body--clickable' : ''}`}
                role={onNavigate ? 'button' : undefined}
                tabIndex={onNavigate ? 0 : undefined}
                onClick={onNavigate}
                onKeyDown={
                    onNavigate
                        ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  onNavigate();
                              }
                          }
                        : undefined
                }
            >
                {children}
            </div>

            {replies.length > 0 ? (
                <div className="quiet-proof-card__replies">
                    {replies.map((reply) => {
                        const replyTime =
                            formatRelativeTime(reply.createdAt) ||
                            formatCommentTime(reply.createdAt);
                        return (
                            <div key={reply.id} className="quiet-proof-card__reply">
                                <div className="quiet-proof-card__reply-head">
                                    <span className="quiet-proof-card__reply-name">
                                        {reply.authorName || 'Photographer'}
                                    </span>
                                    <span
                                        className={`quiet-proof-card__badge${
                                            reply.authorType === 'client'
                                                ? ''
                                                : ' quiet-proof-card__badge--photographer'
                                        }`}
                                    >
                                        {reply.authorType === 'client'
                                            ? 'Photo'
                                            : 'Photographer'}
                                    </span>
                                    {replyTime ? (
                                        <time
                                            className="quiet-proof-card__reply-time"
                                            dateTime={reply.createdAt || undefined}
                                        >
                                            {replyTime}
                                        </time>
                                    ) : null}
                                </div>
                                <p className="quiet-proof-card__text">{reply.body}</p>
                            </div>
                        );
                    })}
                </div>
            ) : null}

            {replyOpen ? (
                <QuietProofReplyCompose onSend={onReplySend} onCancel={onReplyCancel} />
            ) : (
                <div className="quiet-proof-card__actions">
                    <button type="button" className="quiet-proof-card__btn" onClick={onReply}>
                        Reply
                    </button>
                    {showMarkDone ? (
                        <button
                            type="button"
                            className={`quiet-proof-card__btn${
                                !unseen ? ' quiet-proof-card__btn--done' : ''
                            }`}
                            onClick={onMarkDone}
                            disabled={!unseen}
                        >
                            {unseen ? 'Mark done' : 'Done'}
                        </button>
                    ) : null}
                </div>
            )}
        </article>
    );
}

function BubbleInlineActions({ children }) {
    if (!children) return null;
    return <div className="av-chat-bubble-inline-actions">{children}</div>;
}

function ProofBubbleHeader({ title, titleClassName = '' }) {
    if (!title) return null;
    return (
        <div className="av-chat-bubble-header">
            <p className={`av-chat-bubble-sender${titleClassName ? ` ${titleClassName}` : ''}`}>
                {title}
            </p>
        </div>
    );
}

function ChatRow({
    outgoing,
    children,
    actions,
    className = '',
    unseen = false,
    bubbleClassName = '',
}) {
    return (
        <div
            className={`av-chat-row${outgoing ? ' av-chat-row--out' : ' av-chat-row--in'}${
                className ? ` ${className}` : ''
            }`}
        >
            <article
                className={`av-chat-bubble${outgoing ? ' av-chat-bubble--out' : ' av-chat-bubble--in'}${
                    unseen ? ' av-chat-bubble--unseen' : ''
                }${bubbleClassName ? ` ${bubbleClassName}` : ''}`}
            >
                {children}
            </article>
            {actions ? <div className="av-chat-row-actions">{actions}</div> : null}
        </div>
    );
}

function QuietProofFeed({
    feed,
    albumId,
    album = null,
    totalPages = 0,
    photoRevision = 0,
    businessName,
    clientViewer = false,
    onNavigateToPin,
    onNavigateToSlotKey,
    onRemoveSwap,
    onJumpToSpread,
}) {
    void photoRevision;
    const clientName =
        getClientReviewerIdentity(albumId).name ||
        getGuestProfile(albumId)?.name ||
        'Client';
    const [replyTargetId, setReplyTargetId] = useState(null);
    const [repliesByParent, setRepliesByParent] = useState(() =>
        getAllProofRepliesForAlbum(albumId)
    );

    useEffect(() => {
        setRepliesByParent(getAllProofRepliesForAlbum(albumId));
        setReplyTargetId(null);
    }, [albumId]);

    useEffect(() => {
        if (!albumId) return undefined;
        const onChanged = (e) => {
            if (e.detail?.albumId && e.detail.albumId !== albumId) return;
            setRepliesByParent(getAllProofRepliesForAlbum(albumId));
        };
        window.addEventListener(PROOF_REPLIES_CHANGED_EVENT, onChanged);
        return () => window.removeEventListener(PROOF_REPLIES_CHANGED_EVENT, onChanged);
    }, [albumId]);

    const pinOrdinalById = useMemo(() => {
        const map = new Map();
        let n = 0;
        feed.forEach((item) => {
            if (item.kind === 'photo-pin' && item.pin?.id) {
                n += 1;
                map.set(item.pin.id, n);
            }
        });
        return map;
    }, [feed]);

    const handleReplySend = async (item, body) => {
        const entityId =
            item.pin?.id ||
            item.mark?.id ||
            item.comment?.id ||
            item.id;
        const parentKey = makeProofReplyParentKey(item.kind, entityId);
        if (!parentKey) return;

        const guest = getGuestProfile(albumId);
        const authorName = clientViewer
            ? guest?.name?.trim() || clientName || 'Guest'
            : businessName || 'Photographer';
        const authorType = clientViewer ? 'client' : 'photographer';

        addProofReply(albumId, parentKey, {
            body,
            authorName,
            authorType,
        });

        if (
            (item.kind === 'client-message' || item.kind === 'photographer-message') &&
            item.comment?.id
        ) {
            try {
                if (clientViewer) {
                    await smartAlbumCommentsService.saveClientReply({
                        albumId,
                        spreadIndex: item.comment.spread_index,
                        parentId: item.comment.id,
                        body,
                        authorName,
                        authorEmail: guest?.email?.trim() || null,
                    });
                } else {
                    await smartAlbumCommentsService.savePhotographerReply({
                        albumId,
                        spreadIndex: item.comment.spread_index,
                        parentId: item.comment.id,
                        body,
                        authorName,
                    });
                }
            } catch (e) {
                console.warn('Could not sync comment reply', e);
            }
        }

        setReplyTargetId(null);
    };

    const replyPropsFor = (item) => {
        const entityId =
            item.pin?.id ||
            item.mark?.id ||
            item.comment?.id ||
            item.id;
        const parentKey = makeProofReplyParentKey(item.kind, entityId);
        return {
            replies: repliesByParent[parentKey] || [],
            replyOpen: replyTargetId === item.id,
            onReply: () => setReplyTargetId(item.id),
            onReplyCancel: () => setReplyTargetId(null),
            onReplySend: (body) => handleReplySend(item, body),
        };
    };

    return (
        <div className="quiet-proof-feed">
            {feed.map((item) => {
                if (item.kind === 'photographer-message') {
                    const comment = item.comment;
                    return (
                        <QuietProofCard
                            key={item.id}
                            authorName={businessName || comment.author_name || 'You'}
                            createdAt={comment.updated_at || comment.created_at}
                            badge="Photographer"
                            unseen={false}
                            showMarkDone={false}
                            {...replyPropsFor(item)}
                        >
                            <p className="quiet-proof-card__text">{comment.body}</p>
                        </QuietProofCard>
                    );
                }

                if (item.kind === 'client-message') {
                    const comment = item.comment;
                    const unseen = isCommentUnseen(albumId, comment);
                    const audioOnly =
                        isCommentAudioAttachment(comment) && !String(comment.body || '').trim();
                    return (
                        <QuietProofCard
                            key={item.id}
                            authorName={comment.author_name || clientName}
                            createdAt={comment.updated_at || comment.created_at}
                            badge={getClientCommentBadgeLabel(comment)}
                            unseen={unseen}
                            showMarkDone={!clientViewer}
                            onMarkDone={() => markCommentsSeen(albumId, [comment])}
                            {...replyPropsFor(item)}
                        >
                            {hasCommentAttachment(comment) ? (
                                <div className="quiet-proof-card__media">
                                    <CommentAttachmentContent
                                        comment={comment}
                                        className="quiet-proof-card__attachment"
                                    />
                                </div>
                            ) : null}
                            {comment.body ? (
                                <p className="quiet-proof-card__text">{comment.body}</p>
                            ) : audioOnly ? null : null}
                        </QuietProofCard>
                    );
                }

                if (item.kind === 'photo-pin') {
                    const pin = item.pin;
                    const unseen = isPhotoPinUnseen(albumId, pin);
                    const ordinal = pinOrdinalById.get(pin.id) || 1;
                    const navigatePin = () => {
                        if (onNavigateToPin) onNavigateToPin(pin);
                        else onJumpToSpread?.(pin.spreadIndex);
                    };
                    return (
                        <QuietProofCard
                            key={item.id}
                            authorName={pin.authorName || pin.author_name || clientName}
                            createdAt={pin.createdAt}
                            badge={`Pin ${ordinal}`}
                            unseen={unseen}
                            showMarkDone={!clientViewer}
                            onMarkDone={() => markPhotoPinsSeen(albumId, [pin])}
                            onNavigate={navigatePin}
                            {...replyPropsFor(item)}
                        >
                            <p className="quiet-proof-card__text">{pin.message}</p>
                        </QuietProofCard>
                    );
                }

                if (item.kind === 'image-replacement-stack') {
                    return (
                        <div key={item.id} className="quiet-proof-feed__system">
                            <AlbumPreviewReplacementCard
                                albumId={albumId}
                                replacements={item.replacements}
                            />
                        </div>
                    );
                }

                if (item.kind === 'image-replacement') {
                    return (
                        <div key={item.id} className="quiet-proof-feed__system">
                            <AlbumPreviewReplacementCard
                                albumId={albumId}
                                replacement={item.replacement}
                            />
                        </div>
                    );
                }

                const swapItem = item.mark;
                const swapUnseen = isSwapMarkUnseen(albumId, swapItem);
                const labelA = formatSwapEndpointLabel(swapItem.labelA);
                const labelB = formatSwapEndpointLabel(swapItem.labelB);
                const spreadOpts = getSpreadContext(album, totalPages);
                const spreadA =
                    Number.isFinite(swapItem.spreadA)
                        ? swapItem.spreadA
                        : pageToSpreadIndex(parseSlotKey(swapItem.a).pageNum, {
                              ...spreadOpts,
                              totalPages,
                          });
                const spreadB =
                    Number.isFinite(swapItem.spreadB)
                        ? swapItem.spreadB
                        : pageToSpreadIndex(parseSlotKey(swapItem.b).pageNum, {
                              ...spreadOpts,
                              totalPages,
                          });
                const visualA =
                    album && totalPages > 0
                        ? resolveSpreadThumbVisual(album, spreadA, totalPages)
                        : null;
                const visualB =
                    album && totalPages > 0
                        ? resolveSpreadThumbVisual(album, spreadB, totalPages)
                        : null;
                const sideA = resolveSwapSlotSide(swapItem.a, album, totalPages);
                const sideB = resolveSwapSlotSide(swapItem.b, album, totalPages);
                const slotSrcA = resolveSwapEndpointSrc(
                    albumId,
                    swapItem.a,
                    album,
                    totalPages
                );
                const slotSrcB = resolveSwapEndpointSrc(
                    albumId,
                    swapItem.b,
                    album,
                    totalPages
                );
                const useLiveA = spreadThumbHasImage(visualA);
                const useLiveB = spreadThumbHasImage(visualB);
                const goA = () => {
                    if (onNavigateToSlotKey) onNavigateToSlotKey(swapItem.a);
                    else onJumpToSpread?.(spreadA);
                };
                const goB = () => {
                    if (onNavigateToSlotKey) onNavigateToSlotKey(swapItem.b);
                    else onJumpToSpread?.(spreadB);
                };
                return (
                    <QuietProofCard
                        key={item.id}
                        authorName={swapItem.authorName || clientName}
                        createdAt={swapItem.createdAt}
                        badge="Swap"
                        unseen={swapUnseen}
                        showMarkDone={!clientViewer}
                        onMarkDone={() => markSwapMarksSeen(albumId, [swapItem])}
                        {...replyPropsFor(item)}
                    >
                        {useLiveA || useLiveB || slotSrcA || slotSrcB ? (
                            <div
                                className="quiet-proof-card__swap-pair"
                                aria-label={`Swap ${labelA} with ${labelB}`}
                            >
                                <button
                                    type="button"
                                    className="quiet-proof-card__swap-shot"
                                    onClick={goA}
                                >
                                    <span className="quiet-proof-card__swap-shot-frame">
                                        {useLiveA ? (
                                            <SwapSpreadThumbFrame
                                                visual={visualA}
                                                album={album}
                                                side={sideA}
                                            />
                                        ) : slotSrcA ? (
                                            <img src={slotSrcA} alt="" draggable={false} />
                                        ) : (
                                            <span className="quiet-proof-card__swap-shot-empty" />
                                        )}
                                    </span>
                                    <span className="quiet-proof-card__swap-shot-label">{labelA}</span>
                                </button>
                                <span className="quiet-proof-card__swap-pair-arrow" aria-hidden>
                                    <SwapIcon size={14} />
                                </span>
                                <button
                                    type="button"
                                    className="quiet-proof-card__swap-shot"
                                    onClick={goB}
                                >
                                    <span className="quiet-proof-card__swap-shot-frame">
                                        {useLiveB ? (
                                            <SwapSpreadThumbFrame
                                                visual={visualB}
                                                album={album}
                                                side={sideB}
                                            />
                                        ) : slotSrcB ? (
                                            <img src={slotSrcB} alt="" draggable={false} />
                                        ) : (
                                            <span className="quiet-proof-card__swap-shot-empty" />
                                        )}
                                    </span>
                                    <span className="quiet-proof-card__swap-shot-label">{labelB}</span>
                                </button>
                            </div>
                        ) : (
                            <div
                                className="quiet-proof-card__swap"
                                aria-label={`Swap ${labelA} with ${labelB}`}
                            >
                                <button
                                    type="button"
                                    className="quiet-proof-card__swap-chip"
                                    onClick={goA}
                                >
                                    {labelA}
                                </button>
                                <span className="quiet-proof-card__swap-arrow" aria-hidden>
                                    <SwapIcon size={14} />
                                </span>
                                <button
                                    type="button"
                                    className="quiet-proof-card__swap-chip"
                                    onClick={goB}
                                >
                                    {labelB}
                                </button>
                            </div>
                        )}
                    </QuietProofCard>
                );
            })}
        </div>
    );
}

export default function AlbumPreviewSpreadFeed({
    feed = [],
    albumId,
    album = null,
    totalPages = 0,
    photoRevision = 0,
    businessName = '',
    spreadOpts = {},
    editingPinId = null,
    editingPinMessage = '',
    onEditPinStart,
    onEditPinCancel,
    onEditPinMessageChange,
    onEditPinSave,
    onJumpToSpread,
    onNavigateToPin,
    onNavigateToSlotKey,
    onRemoveSwap,
    onRemoveReplacement,
    proofMode = false,
    clientViewer = false,
    seenTick = 0,
}) {
    void seenTick;
    void spreadOpts;
    void onRemoveReplacement;
    if (!feed.length) return null;

    if (proofMode) {
        return (
            <QuietProofFeed
                feed={feed}
                albumId={albumId}
                album={album}
                totalPages={totalPages}
                photoRevision={photoRevision}
                businessName={businessName}
                clientViewer={clientViewer}
                onNavigateToPin={onNavigateToPin}
                onNavigateToSlotKey={onNavigateToSlotKey}
                onRemoveSwap={onRemoveSwap}
                onJumpToSpread={onJumpToSpread}
            />
        );
    }

    return (
        <div className="av-preview-sidebar-feed av-chat-feed">
            {feed.map((item, index) => {
                const sortTs = item.sortAt;
                const dateKey = calendarDateKey(sortTs);
                const prevDateKey =
                    index > 0 ? calendarDateKey(feed[index - 1].sortAt) : '';
                const dateDivider =
                    dateKey && dateKey !== prevDateKey ? (
                        <div
                            key={`feed-date-${dateKey}-${index}`}
                            className="av-chat-feed-date"
                            role="separator"
                            aria-label={formatFeedDateLabel(sortTs)}
                        >
                            <span>{formatFeedDateLabel(sortTs)}</span>
                        </div>
                    ) : null;

                if (item.kind === 'photographer-message') {
                    const comment = item.comment;
                    const createdAtLabel = formatCommentTime(
                        comment.updated_at || comment.created_at
                    );
                    const unseen = isGuestCommentUnseen(albumId, comment);

                    return (
                        <React.Fragment key={item.id}>
                            {dateDivider}
                            <ChatRow outgoing={false} unseen={unseen} actions={null}>
                                <p className="av-chat-bubble-sender">
                                    {businessName || comment.author_name}
                                </p>
                                <div className="av-chat-bubble-text">{comment.body}</div>
                                <footer className="av-chat-bubble-foot">
                                    {createdAtLabel ? (
                                        <time dateTime={comment.updated_at || comment.created_at}>
                                            {createdAtLabel}
                                        </time>
                                    ) : null}
                                    {unseen ? <span className="av-chat-bubble-new">New</span> : null}
                                </footer>
                            </ChatRow>
                        </React.Fragment>
                    );
                }

                if (item.kind === 'client-message') {
                    const comment = item.comment;
                    const createdAtLabel = formatCommentTime(
                        comment.updated_at || comment.created_at
                    );
                    const audioOnly =
                        isCommentAudioAttachment(comment) && !String(comment.body || '').trim();

                    return (
                        <React.Fragment key={item.id}>
                            {dateDivider}
                            <ChatRow
                                outgoing
                                unseen={false}
                                actions={null}
                                bubbleClassName={audioOnly ? 'av-chat-bubble--voice' : ''}
                            >
                                {hasCommentAttachment(comment) ? (
                                    <CommentAttachmentContent comment={comment} />
                                ) : null}
                                {comment.body ? (
                                    <div className="av-chat-bubble-text">{comment.body}</div>
                                ) : null}
                                <footer className="av-chat-bubble-foot av-chat-bubble-foot--actions">
                                    <BubbleInlineActions>
                                        <button
                                            type="button"
                                            className="av-chat-action av-chat-action--danger"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                void smartAlbumCommentsService.deleteClientComment({
                                                    albumId,
                                                    commentId: comment.id,
                                                });
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </BubbleInlineActions>
                                    {createdAtLabel ? (
                                        <time dateTime={comment.updated_at || comment.created_at}>
                                            {createdAtLabel}
                                        </time>
                                    ) : null}
                                </footer>
                            </ChatRow>
                        </React.Fragment>
                    );
                }

                if (item.kind === 'photo-pin') {
                    const pin = item.pin;
                    const navigatePin = () => onJumpToSpread?.(pin.spreadIndex);

                    if (editingPinId === pin.id) {
                        return (
                            <React.Fragment key={item.id}>
                                {dateDivider}
                                <div className="av-chat-row av-chat-row--out">
                                    <article className="av-chat-bubble av-chat-bubble--out av-chat-bubble--edit">
                                        <textarea
                                            className="av-chat-compose-input av-chat-compose-input--inline"
                                            value={editingPinMessage}
                                            onChange={(e) =>
                                                onEditPinMessageChange?.(e.target.value)
                                            }
                                        />
                                        <div className="av-chat-row-actions av-chat-row-actions--inline">
                                            <button
                                                type="button"
                                                className="av-chat-action"
                                                onClick={onEditPinCancel}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                className="av-chat-action av-chat-action--primary"
                                                onClick={() => {
                                                    const updated = updatePhotoPin(albumId, pin.id, {
                                                        message: editingPinMessage,
                                                    });
                                                    if (updated) onEditPinSave?.();
                                                }}
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </article>
                                </div>
                            </React.Fragment>
                        );
                    }

                    return (
                        <React.Fragment key={item.id}>
                            {dateDivider}
                            <ChatRow outgoing actions={null}>
                                <p className="av-chat-bubble-sender av-chat-bubble-sender--photo">
                                    Photo comment
                                </p>
                                <div
                                    className="av-chat-bubble-text av-chat-bubble-text--clickable"
                                    role="button"
                                    tabIndex={0}
                                    onClick={navigatePin}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            navigatePin();
                                        }
                                    }}
                                >
                                    {pin.message}
                                </div>
                                <footer className="av-chat-bubble-foot av-chat-bubble-foot--actions">
                                    <BubbleInlineActions>
                                        <button
                                            type="button"
                                            className="av-chat-action"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEditPinStart?.(pin);
                                            }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            className="av-chat-action av-chat-action--danger"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removePhotoPin(albumId, pin.id);
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </BubbleInlineActions>
                                    {pin.createdAt ? (
                                        <time dateTime={pin.createdAt}>
                                            {formatCommentTime(pin.createdAt)}
                                        </time>
                                    ) : null}
                                </footer>
                            </ChatRow>
                        </React.Fragment>
                    );
                }

                if (item.kind === 'image-replacement-stack') {
                    return (
                        <React.Fragment key={item.id}>
                            {dateDivider}
                            <div className="av-chat-row av-chat-row--system">
                                <AlbumPreviewReplacementCard
                                    albumId={albumId}
                                    replacements={item.replacements}
                                />
                            </div>
                        </React.Fragment>
                    );
                }

                if (item.kind === 'image-replacement') {
                    return (
                        <React.Fragment key={item.id}>
                            {dateDivider}
                            <div className="av-chat-row av-chat-row--system">
                                <AlbumPreviewReplacementCard
                                    albumId={albumId}
                                    replacement={item.replacement}
                                />
                            </div>
                        </React.Fragment>
                    );
                }

                const swapItem = item.mark;
                const createdAtLabel = formatCommentTime(swapItem.createdAt);
                const navigateSwapA = () => onJumpToSpread?.(swapItem.spreadA);
                const navigateSwapB = () => onJumpToSpread?.(swapItem.spreadB);

                return (
                    <React.Fragment key={item.id}>
                        {dateDivider}
                        <ChatRow outgoing actions={null}>
                            <ProofBubbleHeader
                                title="Swap request"
                                titleClassName="av-chat-bubble-sender--swap"
                            />
                            <div className="av-chat-swap-route">
                                <button
                                    type="button"
                                    className="av-chat-swap-chip"
                                    onClick={navigateSwapA}
                                >
                                    {shortenSpreadLabel(swapItem.labelA)}
                                </button>
                                <span className="av-chat-swap-arrow" aria-hidden>
                                    <SwapIcon className="av-chat-swap-arrow-icon" size={12} />
                                </span>
                                <button
                                    type="button"
                                    className="av-chat-swap-chip"
                                    onClick={navigateSwapB}
                                >
                                    {shortenSpreadLabel(swapItem.labelB)}
                                </button>
                            </div>
                            <footer className="av-chat-bubble-foot av-chat-bubble-foot--actions">
                                <BubbleInlineActions>
                                    <button
                                        type="button"
                                        className="av-chat-action av-chat-action--danger"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveSwap?.(swapItem.id);
                                        }}
                                    >
                                        Delete
                                    </button>
                                </BubbleInlineActions>
                                {createdAtLabel ? (
                                    <time dateTime={swapItem.createdAt}>{createdAtLabel}</time>
                                ) : null}
                            </footer>
                        </ChatRow>
                    </React.Fragment>
                );
            })}
        </div>
    );
}
