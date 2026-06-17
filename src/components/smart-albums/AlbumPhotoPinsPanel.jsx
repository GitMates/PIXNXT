import React from 'react';
import {
    countUnseenPhotoPins,
    isPhotoPinUnseen,
    markPhotoPinsSeen,
    removePhotoPin,
} from './albumPhotoPins';
import { getSlotLabel } from './albumSwapMarks';
import ProofDoneButton from './ProofDoneButton';

function pinSlotLabel(pin, gridLayout, totalPages, album) {
    const whole = gridLayout === 'whole-spread' && pin.pageNum > 0;
    return getSlotLabel(pin.pageNum, pin.cellId ?? 0, whole, totalPages, album);
}

export default function AlbumPhotoPinsPanel({
    albumId,
    album = null,
    pins = [],
    gridLayout = 'two-page',
    totalPages = 0,
    variant = 'panel',
    onNavigateToPin,
    seenTick = 0,
}) {
    const isPanel = variant === 'panel';
    void seenTick;

    const unseenCount = countUnseenPhotoPins(albumId, pins);

    const handleOpenPin = (pin) => {
        onNavigateToPin?.(pin);
    };

    const handleCompletePin = (pin) => {
        markPhotoPinsSeen(albumId, [pin]);
    };

    const sortedPins = [...pins].sort(
        (a, b) =>
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    if (!sortedPins.length) {
        if (!isPanel) return null;
        return (
            <p className="ae-panel-text ae-panel-text--muted ae-swap-marks-empty">
                No comments yet. Use album preview — hover a photo and click Comment.
            </p>
        );
    }

    return (
        <div className={`ae-swap-marks ae-photo-pins-panel${isPanel ? ' ae-swap-marks--panel' : ''}`}>
            {isPanel && (
                <p
                    className={`ae-swap-marks-count${
                        unseenCount > 0 ? ' ae-swap-marks-count--unseen' : ''
                    }`}
                    role="status"
                >
                    {pins.length} comment{pins.length === 1 ? '' : 's'}
                    {unseenCount > 0 && (
                        <span className="ae-proof-new-pill">
                            {unseenCount} new
                        </span>
                    )}
                </p>
            )}
            <ul className="ae-swap-marks-list">
                {sortedPins.map((pin) => {
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
                            key={pin.id}
                            className={`ae-swap-marks-item ae-photo-pins-item${
                                unseen ? ' ae-proof-item--unseen' : ''
                            }`}
                        >
                            <div className="ae-proof-item-top-right">
                                <ProofDoneButton
                                    completed={!unseen}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCompletePin(pin);
                                    }}
                                    ariaLabel={doneAria}
                                />
                            </div>
                            <button
                                type="button"
                                className="ae-photo-pins-link"
                                onClick={() => handleOpenPin(pin)}
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
                })}
            </ul>
        </div>
    );
}
