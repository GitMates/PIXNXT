import React, { useMemo } from 'react';
import {
    isPhotoPinUnseen,
    markPhotoPinsSeen,
    removePhotoPin,
} from './albumPhotoPins';
import {
    getSlotLabel,
    isSwapMarkUnseen,
    markSwapMarksSeen,
    parseSlotKey,
    removeSwapMark,
    resolveSlotLabel,
} from './albumSwapMarks';
import { formatCommentDateTime } from '../../services/smartAlbumComments.service';
import { formatSpreadDisplayLabel } from './albumSpreadUtils';
import { buildSpreadFeedbackFeed } from './spreadFeedbackFeed';
import ProofDoneButton from './ProofDoneButton';

function pinSlotLabel(pin, gridLayout, totalPages, album) {
    const whole = gridLayout === 'whole-spread' && pin.pageNum > 0;
    return getSlotLabel(pin.pageNum, pin.cellId ?? 0, whole, totalPages, album);
}

export default function EditorSpreadFeedbackFeed({
    albumId,
    album = null,
    totalPages = 0,
    gridLayout = 'two-page',
    photographerMessages = [],
    photoPins = [],
    swapMarks = [],
    swapsEnabled = true,
    photographerName = 'Photographer',
    hasCovers = true,
    onNavigateToPin,
    onNavigateToSlotKey,
    seenTick = 0,
}) {
    void seenTick;

    const feed = useMemo(
        () =>
            buildSpreadFeedbackFeed({
                photographerMessages,
                photoPins,
                swapMarks,
                includeSwaps: swapsEnabled,
            }),
        [photographerMessages, photoPins, swapMarks, swapsEnabled]
    );

    const labelForSlotKey = (key, storedLabel) => {
        if (album && totalPages > 0) {
            const { pageNum, cellId } = parseSlotKey(key);
            const whole =
                (gridLayout === 'whole-spread' && pageNum > 0) ||
                /\b(Whole|Both)\b/i.test(storedLabel || '');
            return getSlotLabel(pageNum, cellId, whole, totalPages, album);
        }
        return storedLabel || resolveSlotLabel(key, gridLayout);
    };

    if (!feed.length) return null;

    return (
        <div className="ae-spread-feedback-feed ae-swap-marks ae-swap-marks--panel">
            <ul className="ae-swap-marks-list ae-spread-feedback-feed-list">
                {feed.map((item) => {
                    if (item.kind === 'photographer-message') {
                        const comment = item.comment;
                        const createdAtLabel = comment.created_at
                            ? formatCommentDateTime(comment.updated_at || comment.created_at)
                            : null;
                        const messageSpreadLabel = formatSpreadDisplayLabel(comment.spread_index, {
                            hasCovers,
                        });
                        return (
                            <li key={item.id} className="ae-spread-sent-message ae-spread-feedback-feed-item">
                                <p className="ae-spread-sent-message-author">
                                    {photographerName || comment.author_name}
                                    {' · '}
                                    {messageSpreadLabel}
                                </p>
                                <p className="ae-spread-sent-message-body">{comment.body}</p>
                                {createdAtLabel ? (
                                    <time
                                        className="ae-spread-sent-message-time"
                                        dateTime={comment.updated_at || comment.created_at}
                                    >
                                        {createdAtLabel}
                                    </time>
                                ) : null}
                            </li>
                        );
                    }

                    if (item.kind === 'photo-pin') {
                        const pin = item.pin;
                        const slot = pinSlotLabel(pin, gridLayout, totalPages, album);
                        const createdAtLabel = pin.createdAt
                            ? new Date(pin.createdAt).toLocaleString()
                            : null;
                        const unseen = isPhotoPinUnseen(albumId, pin);
                        const doneAria = unseen
                            ? `Mark comment on ${slot} complete`
                            : `Comment on ${slot} already complete`;
                        return (
                            <li
                                key={item.id}
                                className={`ae-swap-marks-item ae-photo-pins-item ae-spread-feedback-feed-item${
                                    unseen ? ' ae-proof-item--unseen' : ''
                                }`}
                            >
                                <div className="ae-proof-item-top-right">
                                    <ProofDoneButton
                                        completed={!unseen}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            markPhotoPinsSeen(albumId, [pin]);
                                        }}
                                        ariaLabel={doneAria}
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="ae-photo-pins-link"
                                    onClick={() => onNavigateToPin?.(pin)}
                                >
                                    <span className="ae-photo-pins-slot">
                                        {slot}
                                        {unseen && (
                                            <span className="ae-proof-new-badge">New</span>
                                        )}
                                    </span>
                                    <span className="ae-photo-pins-message">{pin.message}</span>
                                </button>
                                <div className="ae-photo-pins-footer">
                                    {createdAtLabel ? (
                                        <span className="ae-photo-pins-time">{createdAtLabel}</span>
                                    ) : (
                                        <span className="ae-photo-pins-time" aria-hidden />
                                    )}
                                    <div className="ae-proof-item-actions">
                                        <button
                                            type="button"
                                            className="ae-photo-pins-remove"
                                            onClick={() => removePhotoPin(albumId, pin.id)}
                                            aria-label={`Remove comment on ${slot}`}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </li>
                        );
                    }

                    const mark = item.mark;
                    const labelA = labelForSlotKey(mark.a, mark.labelA);
                    const labelB = labelForSlotKey(mark.b, mark.labelB);
                    const createdAtLabel = mark.createdAt
                        ? new Date(mark.createdAt).toLocaleString()
                        : null;
                    const unseen = isSwapMarkUnseen(albumId, mark);
                    const doneAria = unseen
                        ? `Mark swap request ${labelA} with ${labelB} complete`
                        : `Swap request ${labelA} with ${labelB} already complete`;

                    return (
                        <li
                            key={item.id}
                            className={`ae-swap-marks-item ae-swap-marks-card ae-spread-feedback-feed-item${
                                unseen ? ' ae-proof-item--unseen' : ''
                            }`}
                        >
                            <div className="ae-proof-item-top-right">
                                <ProofDoneButton
                                    completed={!unseen}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        markSwapMarksSeen(albumId, [mark]);
                                    }}
                                    ariaLabel={doneAria}
                                />
                            </div>
                            <div className="ae-swap-marks-body">
                                <span className="ae-swap-marks-header">
                                    Swap request
                                    {unseen && <span className="ae-proof-new-badge">New</span>}
                                </span>
                                <div
                                    className="ae-swap-marks-route"
                                    aria-label={`Swap ${labelA} with ${labelB}`}
                                >
                                    <button
                                        type="button"
                                        className="ae-swap-marks-slot-chip"
                                        onClick={() => onNavigateToSlotKey?.(mark.a)}
                                    >
                                        {labelA}
                                    </button>
                                    <span className="ae-swap-marks-route-arrow" aria-hidden>
                                        ↔
                                    </span>
                                    <button
                                        type="button"
                                        className="ae-swap-marks-slot-chip"
                                        onClick={() => onNavigateToSlotKey?.(mark.b)}
                                    >
                                        {labelB}
                                    </button>
                                </div>
                            </div>
                            <div className="ae-swap-marks-footer">
                                {createdAtLabel ? (
                                    <span className="ae-swap-marks-time">{createdAtLabel}</span>
                                ) : (
                                    <span className="ae-swap-marks-time" aria-hidden />
                                )}
                                <div className="ae-proof-item-actions">
                                    <button
                                        type="button"
                                        className="ae-swap-marks-remove"
                                        onClick={() => removeSwapMark(albumId, mark.id)}
                                        aria-label={`Remove swap request ${labelA} with ${labelB}`}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
