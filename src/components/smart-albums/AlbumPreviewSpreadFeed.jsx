import React from 'react';
import CommentAttachmentContent from './CommentAttachmentContent';
import { hasCommentAttachment, isCommentAudioAttachment } from './albumCommentAttachments';
import {
    formatCommentTime,
    formatFeedDateLabel,
    isCommentUnseen,
    isGuestCommentUnseen,
    smartAlbumCommentsService,
} from '../../services/smartAlbumComments.service';
import {
    isPhotoPinUnseen,
    markPhotoPinsSeen,
    removePhotoPin,
    updatePhotoPin,
} from './albumPhotoPins';
import {
    isSwapMarkUnseen,
    markSwapMarksSeen,
} from './albumSwapMarks';
import AlbumPreviewReplacementCard from './AlbumPreviewReplacementCard';
import SwapIcon from './SwapIcon';
import ProofDoneButton from './ProofDoneButton';

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

function BubbleInlineActions({ children }) {
    if (!children) return null;
    return <div className="av-chat-bubble-inline-actions">{children}</div>;
}

function ProofBubbleTopActions({ unseen, children }) {
    if (!children && !unseen) return null;
    return (
        <div className="av-chat-bubble-top-actions">
            {unseen ? <span className="av-chat-bubble-new">New</span> : null}
            {children}
        </div>
    );
}

function ProofBubbleHeader({ title, titleClassName = '', unseen, doneButton }) {
    if (!title && !doneButton && !unseen) return null;
    return (
        <div className="av-chat-bubble-header">
            {title ? (
                <p className={`av-chat-bubble-sender${titleClassName ? ` ${titleClassName}` : ''}`}>
                    {title}
                </p>
            ) : (
                <span className="av-chat-bubble-header-spacer" aria-hidden />
            )}
            {doneButton || unseen ? (
                <ProofBubbleTopActions unseen={unseen}>{doneButton}</ProofBubbleTopActions>
            ) : null}
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

export default function AlbumPreviewSpreadFeed({
    feed = [],
    albumId,
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
    seenTick = 0,
}) {
    void seenTick;
    if (!feed.length) return null;

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
                    const outgoing = proofMode;

                    return (
                        <React.Fragment key={item.id}>
                            {dateDivider}
                            <ChatRow
                                outgoing={outgoing}
                                unseen={unseen && !proofMode}
                                actions={null}
                            >
                            {!outgoing ? (
                                <p className="av-chat-bubble-sender">
                                    {businessName || comment.author_name}
                                </p>
                            ) : null}
                            <div className="av-chat-bubble-text">{comment.body}</div>
                            <footer className="av-chat-bubble-foot">
                                {createdAtLabel ? (
                                    <time
                                        dateTime={comment.updated_at || comment.created_at}
                                    >
                                        {createdAtLabel}
                                    </time>
                                ) : null}
                                {unseen && !proofMode ? (
                                    <span className="av-chat-bubble-new">New</span>
                                ) : null}
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
                    const unseen = proofMode
                        ? isCommentUnseen(albumId, comment)
                        : false;
                    const outgoing = !proofMode;
                    const audioOnly =
                        isCommentAudioAttachment(comment) && !String(comment.body || '').trim();

                    return (
                        <React.Fragment key={item.id}>
                            {dateDivider}
                            <ChatRow
                                outgoing={outgoing}
                                unseen={unseen}
                                actions={null}
                                bubbleClassName={audioOnly ? 'av-chat-bubble--voice' : ''}
                            >
                                {!outgoing ? (
                                    <p className="av-chat-bubble-sender">
                                        {comment.author_name || 'Client'}
                                    </p>
                                ) : null}
                                {hasCommentAttachment(comment) ? (
                                    <CommentAttachmentContent comment={comment} />
                                ) : null}
                                {comment.body ? (
                                    <div className="av-chat-bubble-text">{comment.body}</div>
                                ) : null}
                                <footer className="av-chat-bubble-foot av-chat-bubble-foot--actions">
                                    {!proofMode ? (
                                        <BubbleInlineActions>
                                            <button
                                                type="button"
                                                className="av-chat-action av-chat-action--danger"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    void smartAlbumCommentsService.deleteClientComment(
                                                        {
                                                            albumId,
                                                            commentId: comment.id,
                                                        }
                                                    );
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </BubbleInlineActions>
                                    ) : null}
                                    {createdAtLabel ? (
                                        <time
                                            dateTime={comment.updated_at || comment.created_at}
                                        >
                                            {createdAtLabel}
                                        </time>
                                    ) : null}
                                    {unseen ? (
                                        <span className="av-chat-bubble-new">New</span>
                                    ) : null}
                                </footer>
                            </ChatRow>
                        </React.Fragment>
                    );
                }

                if (item.kind === 'photo-pin') {
                    const pin = item.pin;
                    const unseen = proofMode && isPhotoPinUnseen(albumId, pin);
                    const outgoing = !proofMode;
                    const navigatePin = () => {
                        if (proofMode && onNavigateToPin) onNavigateToPin(pin);
                        else onJumpToSpread?.(pin.spreadIndex);
                    };

                    if (editingPinId === pin.id && !proofMode) {
                        return (
                            <React.Fragment key={item.id}>
                                {dateDivider}
                                <div className="av-chat-row av-chat-row--out">
                                <article className="av-chat-bubble av-chat-bubble--out av-chat-bubble--edit">
                                    <textarea
                                        className="av-chat-compose-input av-chat-compose-input--inline"
                                        value={editingPinMessage}
                                        onChange={(e) => onEditPinMessageChange?.(e.target.value)}
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
                            <ChatRow
                                outgoing={outgoing}
                                unseen={unseen}
                                actions={null}
                            >
                            {proofMode ? (
                                <ProofBubbleHeader
                                    title="Photo comment"
                                    titleClassName={
                                        outgoing ? 'av-chat-bubble-sender--photo' : ''
                                    }
                                    unseen={unseen}
                                    doneButton={
                                        <ProofDoneButton
                                            completed={!unseen}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                markPhotoPinsSeen(albumId, [pin]);
                                            }}
                                            ariaLabel={
                                                unseen
                                                    ? 'Mark photo comment complete'
                                                    : 'Photo comment already complete'
                                            }
                                            className="av-chat-bubble-done"
                                        />
                                    }
                                />
                            ) : outgoing ? (
                                <p className="av-chat-bubble-sender av-chat-bubble-sender--photo">
                                    Photo comment
                                </p>
                            ) : null}
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
                                {!proofMode ? (
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
                                ) : null}
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
                const swapUnseen = proofMode && isSwapMarkUnseen(albumId, swapItem);
                const swapOutgoing = !proofMode;
                const navigateSwapA = () => {
                    if (proofMode && onNavigateToSlotKey) onNavigateToSlotKey(swapItem.a);
                    else onJumpToSpread?.(swapItem.spreadA);
                };
                const navigateSwapB = () => {
                    if (proofMode && onNavigateToSlotKey) onNavigateToSlotKey(swapItem.b);
                    else onJumpToSpread?.(swapItem.spreadB);
                };

                return (
                    <React.Fragment key={item.id}>
                        {dateDivider}
                        <ChatRow
                            outgoing={swapOutgoing}
                            unseen={swapUnseen}
                            actions={null}
                        >
                        <ProofBubbleHeader
                            title="Swap request"
                            titleClassName="av-chat-bubble-sender--swap"
                            unseen={proofMode ? swapUnseen : false}
                            doneButton={
                                proofMode ? (
                                    <ProofDoneButton
                                        completed={!swapUnseen}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            markSwapMarksSeen(albumId, [swapItem]);
                                        }}
                                        ariaLabel={
                                            swapUnseen
                                                ? 'Mark swap request complete'
                                                : 'Swap request already complete'
                                        }
                                        className="av-chat-bubble-done"
                                    />
                                ) : null
                            }
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
                            {!proofMode ? (
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
                            ) : null}
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
