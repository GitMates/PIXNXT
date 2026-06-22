import React from 'react';
import { formatCommentDateTime, isGuestCommentUnseen } from '../../services/smartAlbumComments.service';
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
import ProofDoneButton from './ProofDoneButton';

function shortenSpreadLabel(label) {
    const match = String(label || '').match(/Spread\s+\d+/i);
    return match ? match[0] : String(label || '').trim();
}

function BubbleInlineActions({ children }) {
    if (!children) return null;
    return <div className="av-chat-bubble-inline-actions">{children}</div>;
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
            {feed.map((item) => {
                if (item.kind === 'photographer-message') {
                    const comment = item.comment;
                    const createdAtLabel = formatCommentDateTime(
                        comment.updated_at || comment.created_at
                    );
                    const unseen = isGuestCommentUnseen(albumId, comment);
                    const outgoing = proofMode;

                    return (
                        <ChatRow
                            key={item.id}
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
                            <div key={item.id} className="av-chat-row av-chat-row--out">
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
                        );
                    }

                    return (
                        <ChatRow
                            key={item.id}
                            outgoing={outgoing}
                            unseen={unseen}
                            bubbleClassName={proofMode ? 'av-chat-bubble--with-done' : ''}
                            actions={null}
                        >
                            {proofMode ? (
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
                            ) : null}
                            {outgoing ? (
                                <p className="av-chat-bubble-sender av-chat-bubble-sender--photo">
                                    Photo comment
                                </p>
                            ) : !outgoing && proofMode ? (
                                <p className="av-chat-bubble-sender">Photo comment</p>
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
                                {unseen ? (
                                    <span className="av-chat-bubble-new">New</span>
                                ) : null}
                                {pin.createdAt ? (
                                    <time dateTime={pin.createdAt}>
                                        {formatCommentDateTime(pin.createdAt)}
                                    </time>
                                ) : null}
                            </footer>
                        </ChatRow>
                    );
                }

                if (item.kind === 'image-replacement') {
                    return (
                        <div key={item.id} className="av-chat-row av-chat-row--system">
                            <AlbumPreviewReplacementCard
                                albumId={albumId}
                                replacement={item.replacement}
                            />
                        </div>
                    );
                }

                const swapItem = item.mark;
                const createdAtLabel = formatCommentDateTime(swapItem.createdAt);
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
                    <ChatRow
                        key={item.id}
                        outgoing={swapOutgoing}
                        unseen={swapUnseen}
                        bubbleClassName={proofMode ? 'av-chat-bubble--with-done' : ''}
                        actions={null}
                    >
                        {proofMode ? (
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
                        ) : null}
                        <p className="av-chat-bubble-sender av-chat-bubble-sender--swap">
                            Swap request
                            {swapUnseen && !proofMode ? (
                                <span className="av-chat-bubble-new">New</span>
                            ) : null}
                        </p>
                        <div className="av-chat-swap-route">
                            <button
                                type="button"
                                className="av-chat-swap-chip"
                                onClick={navigateSwapA}
                            >
                                {shortenSpreadLabel(swapItem.labelA)}
                            </button>
                            <span className="av-chat-swap-arrow" aria-hidden>
                                ↔
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
                            {swapUnseen && proofMode ? (
                                <span className="av-chat-bubble-new">New</span>
                            ) : null}
                            {createdAtLabel ? (
                                <time dateTime={swapItem.createdAt}>{createdAtLabel}</time>
                            ) : null}
                        </footer>
                    </ChatRow>
                );
            })}
        </div>
    );
}
