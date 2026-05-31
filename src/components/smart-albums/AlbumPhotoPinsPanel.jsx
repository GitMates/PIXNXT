import React from 'react';
import { removePhotoPin } from './albumPhotoPins';
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
}) {
    const isPanel = variant === 'panel';

    if (!pins.length) {
        if (!isPanel) return null;
        return (
            <p className="ae-panel-text ae-panel-text--muted ae-swap-marks-empty">
                No pins yet. Turn on Pin mode, then click anywhere on a photo to add a note.
            </p>
        );
    }

    return (
        <div className={`ae-swap-marks ae-photo-pins-panel${isPanel ? ' ae-swap-marks--panel' : ''}`}>
            {isPanel && (
                <p className="ae-swap-marks-count" role="status">
                    {pins.length} pin{pins.length === 1 ? '' : 's'}
                </p>
            )}
            <ul className="ae-swap-marks-list">
                {pins.map((pin) => {
                    const slot = pinSlotLabel(pin, gridLayout);
                    return (
                        <li key={pin.id} className="ae-swap-marks-item ae-photo-pins-item">
                            <span className="ae-photo-pins-item-body">
                                <span className="ae-photo-pins-slot">{slot}</span>
                                <span className="ae-photo-pins-message">{pin.message}</span>
                            </span>
                            <button
                                type="button"
                                className="ae-swap-marks-remove"
                                onClick={() => removePhotoPin(albumId, pin.id)}
                                aria-label={`Remove pin on ${slot}`}
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
