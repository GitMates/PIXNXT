import React from 'react';
import {
    formatCommentDateTime,
    isGuestCommentUnseen,
} from '../../services/smartAlbumComments.service';
import { formatSpreadDisplayLabel } from './albumSpreadUtils';
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
        <>
            {feed.map((item) => {
                if (item.kind === 'photographer-message') {
                    const comment = item.comment;
                    const createdAtLabel = comment.created_at
                        ? formatCommentDateTime(comment.updated_at || comment.created_at)
                        : null;
                    const messageSpreadLabel = formatSpreadDisplayLabel(
                        comment.spread_index,
                        spreadOpts
                    );
                    const unseen = isGuestCommentUnseen(albumId, comment);
                    return (
                        <article
                            key={item.id}
                            className={`av-preview-sidebar-comment av-preview-sidebar-comment--photographer${
                                unseen ? ' av-preview-sidebar-comment--unseen' : ''
                            }`}
                        >
                            <p className="av-preview-sidebar-comment-author">
                                {businessName || comment.author_name}
                                {' · '}
                                {messageSpreadLabel}
                                {unseen ? (
                                    <span className="av-preview-sidebar-comment-new">New</span>
                                ) : null}
                            </p>
                            <div className="av-preview-sidebar-comment-body">{comment.body}</div>
                            {createdAtLabel ? (
                                <time
                                    className="av-preview-sidebar-comment-time"
                                    dateTime={comment.updated_at || comment.created_at}
                                >
                                    {createdAtLabel}
                                </time>
                            ) : null}
                        </article>
                    );
                }

                if (item.kind === 'photo-pin') {
                    const pin = item.pin;
                    const unseen = proofMode && isPhotoPinUnseen(albumId, pin);
                    const navigatePin = () => {
                        if (proofMode && onNavigateToPin) onNavigateToPin(pin);
                        else onJumpToSpread?.(pin.spreadIndex);
                    };
                    return (
                        <article
                            key={item.id}
                            className={`av-preview-sidebar-comment av-preview-sidebar-comment--pin${
                                unseen ? ' av-preview-sidebar-comment--unseen' : ''
                            }`}
                        >
                            {proofMode && (
                                <div className="ae-proof-item-top-right">
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
                                    />
                                </div>
                            )}
                            {editingPinId === pin.id && !proofMode ? (
                                <div className="av-preview-sidebar-comment-edit">
                                    <p className="av-preview-sidebar-comment-author">Photo comment</p>
                                    <textarea
                                        className="av-preview-sidebar-comment-input"
                                        value={editingPinMessage}
                                        onChange={(e) => onEditPinMessageChange?.(e.target.value)}
                                    />
                                    <div className="av-preview-sidebar-comment-actions">
                                        <button
                                            type="button"
                                            className="av-preview-sidebar-comment-action"
                                            onClick={onEditPinCancel}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="av-preview-sidebar-comment-action av-preview-sidebar-comment-action--primary"
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
                                </div>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        className="av-preview-sidebar-comment-link"
                                        onClick={navigatePin}
                                    >
                                        <p className="av-preview-sidebar-comment-author">
                                            Photo comment
                                            {unseen ? (
                                                <span className="av-preview-sidebar-comment-new">
                                                    New
                                                </span>
                                            ) : null}
                                        </p>
                                    </button>
                                    <div
                                        className="av-preview-sidebar-comment-body"
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
                                    <div className="av-preview-sidebar-comment-actions">
                                        {!proofMode ? (
                                            <button
                                                type="button"
                                                className="av-preview-sidebar-comment-action"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEditPinStart?.(pin);
                                                }}
                                            >
                                                Edit
                                            </button>
                                        ) : null}
                                        <button
                                            type="button"
                                            className="av-preview-sidebar-comment-delete"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removePhotoPin(albumId, pin.id);
                                            }}
                                        >
                                            {proofMode ? 'Remove' : 'Delete'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </article>
                    );
                }

                if (item.kind === 'image-replacement') {
                    return (
                        <AlbumPreviewReplacementCard
                            key={item.id}
                            albumId={albumId}
                            replacement={item.replacement}
                            onRemove={onRemoveReplacement}
                        />
                    );
                }

                const swapItem = item.mark;
                const createdAtLabel = swapItem.createdAt
                    ? formatCommentDateTime(swapItem.createdAt)
                    : null;
                const swapUnseen = proofMode && isSwapMarkUnseen(albumId, swapItem);
                const navigateSwapA = () => {
                    if (proofMode && onNavigateToSlotKey) onNavigateToSlotKey(swapItem.a);
                    else onJumpToSpread?.(swapItem.spreadA);
                };
                const navigateSwapB = () => {
                    if (proofMode && onNavigateToSlotKey) onNavigateToSlotKey(swapItem.b);
                    else onJumpToSpread?.(swapItem.spreadB);
                };
                return (
                    <article
                        key={item.id}
                        className={`av-preview-sidebar-comment av-preview-sidebar-comment--swap${
                            swapUnseen ? ' av-preview-sidebar-comment--unseen' : ''
                        }`}
                    >
                        {proofMode && (
                            <div className="ae-proof-item-top-right">
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
                                />
                            </div>
                        )}
                        <p className="av-preview-sidebar-comment-author">
                            Swap request
                            {swapUnseen ? (
                                <span className="av-preview-sidebar-comment-new">New</span>
                            ) : null}
                        </p>
                        <div className="av-preview-sidebar-swap-route">
                            <button
                                type="button"
                                className="av-preview-sidebar-swap-chip"
                                onClick={navigateSwapA}
                            >
                                {swapItem.labelA}
                            </button>
                            <span className="av-preview-sidebar-swap-arrow" aria-hidden>
                                ↔
                            </span>
                            <button
                                type="button"
                                className="av-preview-sidebar-swap-chip"
                                onClick={navigateSwapB}
                            >
                                {swapItem.labelB}
                            </button>
                        </div>
                        <div className="av-preview-sidebar-swap-footer">
                            {createdAtLabel ? (
                                <span className="av-preview-sidebar-swap-time">{createdAtLabel}</span>
                            ) : (
                                <span className="av-preview-sidebar-swap-time" aria-hidden />
                            )}
                            <button
                                type="button"
                                className="av-preview-sidebar-swap-remove"
                                onClick={() => onRemoveSwap?.(swapItem.id)}
                            >
                                Remove
                            </button>
                        </div>
                    </article>
                );
            })}
        </>
    );
}
