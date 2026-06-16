import React, { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    enumerateAlbumPhotoSlots,
    getLockedSlotKeys,
    getSwapPickerDockSide,
    getSwapTargetThumbnail,
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
    bookAnchorRef = null,
    onSelect,
    onClose,
}) {
    const [panelStyle, setPanelStyle] = useState(null);

    const gridLayout = album?.grid_layout || 'two-page';
    const slots = enumerateAlbumPhotoSlots(totalPages, gridLayout);
    const lockedKeys = getLockedSlotKeys(swapMarks);
    const dockSide = getSwapPickerDockSide(originSlot);

    useLayoutEffect(() => {
        if (!open || !originSlot) {
            setPanelStyle(null);
            return undefined;
        }

        const updatePosition = () => {
            const bookEl = bookAnchorRef?.current;
            if (!bookEl) {
                setPanelStyle(null);
                return;
            }

            const rect = bookEl.getBoundingClientRect();
            if (!rect.width || !rect.height) return;

            const panelWidth = Math.min(460, Math.max(240, rect.width * 0.46));
            const centerY = rect.top + rect.height / 2;
            const maxHeight = Math.min(rect.height * 0.88, 560);

            if (dockSide === 'left') {
                setPanelStyle({
                    left: rect.left,
                    top: centerY,
                    width: panelWidth,
                    maxHeight,
                    transform: 'translateY(-50%)',
                });
                return;
            }

            setPanelStyle({
                left: rect.left + rect.width - panelWidth,
                top: centerY,
                width: panelWidth,
                maxHeight,
                transform: 'translateY(-50%)',
            });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [open, originSlot, bookAnchorRef, dockSide]);

    if (!open || !originSlot) return null;

    const dockRight = dockSide === 'right';
    const dockLeft = dockSide === 'left';
    const useBookAnchor = Boolean(panelStyle);

    return createPortal(
        <div
            className={`ab-swap-modal-backdrop${
                useBookAnchor
                    ? ' ab-swap-modal-backdrop--book-anchor'
                    : dockRight
                      ? ' ab-swap-modal-backdrop--dock-right'
                      : dockLeft
                        ? ' ab-swap-modal-backdrop--dock-left'
                        : ''
            }`}
            onClick={onClose}
            role="presentation"
        >
            <div
                className={`ab-swap-modal${
                    useBookAnchor ? ' ab-swap-modal--book-anchor' : ''
                }`}
                style={useBookAnchor ? panelStyle : undefined}
                role="dialog"
                aria-modal="true"
                aria-label="Choose photo to swap with"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="ab-swap-modal-grid">
                    {slots.map((slot) => {
                        const slotKey = makeSlotKey(slot.pageNum, slot.cellId);
                        const thumb = getSwapTargetThumbnail(albumId, slot, {
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
                                className={`ab-swap-modal-item${slot.whole ? ' ab-swap-modal-item--whole' : ''}${
                                    isOrigin ? ' ab-swap-modal-item--origin' : ''
                                }${isLocked ? ' ab-swap-modal-item--locked' : ''}`}
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
