import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    enumerateSwapExecuteCandidates,
    getSwapPickerDockSide,
    getSwapTargetThumbnail,
    isWholeGridSwapSlot,
} from './albumSwapMarks';
import './AlbumSwapMarks.css';

export default function AlbumSwapExecuteModal({
    open,
    album,
    albumId,
    totalPages,
    originSlot,
    showSamples = false,
    onSwap,
    onClose,
}) {
    const gridLayout = album?.grid_layout || 'two-page';
    const dockSide = getSwapPickerDockSide(originSlot);
    const dockRight = dockSide === 'right';
    const dockLeft = dockSide === 'left';

    const isWholeOrigin = useMemo(
        () =>
            Boolean(
                originSlot &&
                    albumId &&
                    isWholeGridSwapSlot(albumId, originSlot, totalPages, gridLayout, album)
            ),
        [originSlot, albumId, album, totalPages, gridLayout]
    );

    const candidates = useMemo(() => {
        if (!open || !originSlot || !albumId) return [];
        return enumerateSwapExecuteCandidates(albumId, originSlot, totalPages, gridLayout, album);
    }, [open, originSlot, albumId, album, totalPages, gridLayout]);

    if (!open || !originSlot) return null;

    const leadCopy = isWholeOrigin ? (
        <>
            Choose another <strong>whole spread</strong> to swap with{' '}
            <strong>{originSlot.label || 'this spread'}</strong>. Photos trade places instantly.
        </>
    ) : originSlot.pageNum === 0 ? (
        <>
            Choose another <strong>cover</strong> to swap with{' '}
            <strong>{originSlot.label || 'this slot'}</strong>. Photos trade places instantly.
        </>
    ) : (
        <>
            Choose any <strong>left or right photo</strong> in the album to swap with{' '}
            <strong>{originSlot.label || 'this slot'}</strong>. Photos trade places instantly.
        </>
    );

    return createPortal(
        <div
            className={`ab-swap-modal-backdrop${
                dockRight ? ' ab-swap-modal-backdrop--dock-right' : dockLeft ? ' ab-swap-modal-backdrop--dock-left' : ''
            }`}
            onClick={onClose}
            role="presentation"
        >
            <div
                className="ab-swap-modal ab-swap-modal--execute"
                role="dialog"
                aria-modal="true"
                aria-label="Swap photos between spreads"
                onClick={(e) => e.stopPropagation()}
            >
                <button type="button" className="ab-swap-modal-close" onClick={onClose} aria-label="Close">
                    ×
                </button>
                <h3 className="ab-swap-modal-title">Swap photos</h3>
                <p className="ab-swap-modal-lead">{leadCopy}</p>
                {candidates.length === 0 ? (
                    <p className="ab-swap-modal-empty">No other matching slots in this album.</p>
                ) : (
                    <div className="ab-swap-modal-grid">
                        {candidates.map((slot) => {
                            const thumb = getSwapTargetThumbnail(albumId, slot, {
                                showSamples,
                                album,
                                totalPages,
                            });
                            return (
                                <button
                                    key={`${slot.pageNum}:${slot.cellId}`}
                                    type="button"
                                    className="ab-swap-modal-item"
                                    onClick={() => onSwap?.(slot)}
                                >
                                    <span className="ab-swap-modal-item-thumb">
                                        {thumb ? (
                                            <img src={thumb} alt="" draggable={false} />
                                        ) : (
                                            <span className="ab-swap-modal-item-empty">Empty</span>
                                        )}
                                    </span>
                                    <span className="ab-swap-modal-item-label">{slot.label}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
