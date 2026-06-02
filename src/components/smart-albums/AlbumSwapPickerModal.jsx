import React from 'react';
import { createPortal } from 'react-dom';
import {
    enumerateAlbumPhotoSlots,
    getLockedSlotKeys,
    getSlotThumbnail,
    makeSlotKey,
    slotsMatch,
} from './albumSwapMarks';
import './AlbumSwapMarks.css';

export default function AlbumSwapPickerModal({
    open,
    album,
    albumId,
    totalPages,
    originSlot,
    swapMarks = [],
    showSamples = false,
    onSelect,
    onClose,
}) {
    if (!open || !originSlot) return null;

    const gridLayout = album?.grid_layout || 'two-page';
    const slots = enumerateAlbumPhotoSlots(totalPages, gridLayout);
    const lockedKeys = getLockedSlotKeys(swapMarks);

    return createPortal(
        <div className="ab-swap-modal-backdrop" onClick={onClose} role="presentation">
            <div
                className="ab-swap-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Choose photo to swap with"
                onClick={(e) => e.stopPropagation()}
            >
                <button type="button" className="ab-swap-modal-close" onClick={onClose} aria-label="Close">
                    ×
                </button>
                <h3 className="ab-swap-modal-title">Mark swap</h3>
                <p className="ab-swap-modal-lead">
                    Choose the other photo position. Once confirmed, both spots are locked as a swap
                    request — your photographer will review before anything moves.
                </p>
                <p className="ab-swap-modal-origin">
                    From <strong>{originSlot.label || `Page ${originSlot.pageNum + 1}`}</strong>
                </p>
                <div className="ab-swap-modal-grid">
                    {slots.map((slot) => {
                        const slotKey = makeSlotKey(slot.pageNum, slot.cellId);
                        const thumb = getSlotThumbnail(albumId, slot, {
                            showSamples,
                            album,
                            totalPages,
                        });
                        const isOrigin = slotsMatch(slot, originSlot);
                        const isLocked = lockedKeys.has(slotKey);
                        const disabled = isOrigin || isLocked;

                        return (
                            <button
                                key={slotKey}
                                type="button"
                                className={`ab-swap-modal-item${isOrigin ? ' ab-swap-modal-item--origin' : ''}${
                                    isLocked ? ' ab-swap-modal-item--locked' : ''
                                }`}
                                disabled={disabled}
                                onClick={() => onSelect?.(slot)}
                            >
                                <span className="ab-swap-modal-item-thumb">
                                    {thumb ? (
                                        <img src={thumb} alt="" draggable={false} />
                                    ) : (
                                        <span className="ab-swap-modal-item-empty">Empty</span>
                                    )}
                                    {isLocked && (
                                        <span className="ab-swap-modal-item-badge">Locked</span>
                                    )}
                                    {isOrigin && (
                                        <span className="ab-swap-modal-item-badge">Selected</span>
                                    )}
                                </span>
                                <span className="ab-swap-modal-item-label">{slot.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>,
        document.body
    );
}
