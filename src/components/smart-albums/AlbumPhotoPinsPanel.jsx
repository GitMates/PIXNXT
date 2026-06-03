import React from 'react';
import {
    countUnseenPhotoPins,
    isPhotoPinUnseen,
    markPhotoPinsSeen,
    removePhotoPin,
} from './albumPhotoPins';
import { getSlotLabel } from './albumSwapMarks';

function pinSlotLabel(pin, gridLayout) {
    if (pin.label) return pin.label;
    return getSlotLabel(pin.pageNum, pin.cellId ?? 0, gridLayout === 'whole-spread' && pin.pageNum > 0);
}

export default function AlbumPhotoPinsPanel({
    albumId,
    pins = [],
    gridLayout = 'two-page',
    variant = 'panel',
    onNavigateToPin,
    seenTick = 0,
}) {
    const isPanel = variant === 'panel';
    void seenTick;

    const unseenCount = countUnseenPhotoPins(albumId, pins);

    const handleOpenPin = (pin) => {
        markPhotoPinsSeen(albumId, [pin]);
        onNavigateToPin?.(pin);
    };

    if (!pins.length) {
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
                {pins.map((pin) => {
                    const slot = pinSlotLabel(pin, gridLayout);
                    const createdAtLabel = pin.createdAt
                        ? new Date(pin.createdAt).toLocaleString()
                        : null;
                    const unseen = isPhotoPinUnseen(albumId, pin);
                    return (
                        <li
                            key={pin.id}
                            className={`ae-swap-marks-item ae-photo-pins-item${
                                unseen ? ' ae-proof-item--unseen' : ''
                            }`}
                        >
                            <button
                                type="button"
                                className="ae-photo-pins-link"
                                onClick={() => handleOpenPin(pin)}
                            >
                                <span className="ae-photo-pins-item-body">
                                    <span className="ae-photo-pins-slot">
                                        {slot}
                                        {unseen && (
                                            <span className="ae-proof-new-badge">New</span>
                                        )}
                                    </span>
                                    <span className="ae-photo-pins-message">{pin.message}</span>
                                    {createdAtLabel && (
                                        <span className="ae-photo-pins-time">{createdAtLabel}</span>
                                    )}
                                </span>
                            </button>
                            <button
                                type="button"
                                className="ae-swap-marks-remove"
                                onClick={() => removePhotoPin(albumId, pin.id)}
                                aria-label={`Remove comment on ${slot}`}
                            >
                                Remove
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
