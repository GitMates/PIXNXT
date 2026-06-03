import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './AlbumSpreadSlotMenu.css';

export default function AlbumSpreadSlotMenu({
    open,
    anchorRect,
    slotLabel,
    hasPhoto,
    canSwap = true,
    swapHint = 'Any left or right photo',
    canRemoveSpread = false,
    canDeleteSpread = false,
    onReplace,
    onChooseFromCollection,
    onRemovePhotos,
    onDeleteSpread,
    onSwap,
    onClose,
}) {
    const menuRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        const onPointer = (e) => {
            if (menuRef.current?.contains(e.target)) return;
            onClose?.();
        };
        window.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onPointer);
        return () => {
            window.removeEventListener('keydown', onKey);
            document.removeEventListener('mousedown', onPointer);
        };
    }, [open, onClose]);

    if (!open || !anchorRect) return null;

    const menuWidth = 248;
    const pad = 12;
    let left = anchorRect.left + anchorRect.width / 2 - menuWidth / 2;
    let top = anchorRect.bottom + 8;
    left = Math.max(pad, Math.min(left, window.innerWidth - menuWidth - pad));
    if (top + 280 > window.innerHeight) {
        top = Math.max(pad, anchorRect.top - 8 - 260);
    }

    return createPortal(
        <div
            className="ab-slot-menu-backdrop"
            role="presentation"
            onClick={(e) => {
                e.stopPropagation();
                onClose?.();
            }}
        >
            <div
                ref={menuRef}
                className="ab-slot-menu"
                role="menu"
                aria-label="Photo options"
                style={{ left, top, width: menuWidth }}
                onClick={(e) => e.stopPropagation()}
            >
                <p className="ab-slot-menu-eyebrow">{slotLabel || 'Photo slot'}</p>
                <div className="ab-slot-menu-actions">
                    <button type="button" className="ab-slot-menu-item ab-slot-menu-item--primary" role="menuitem" onClick={onReplace}>
                        <span className="ab-slot-menu-icon" aria-hidden>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                        </span>
                        <span className="ab-slot-menu-text">
                            <strong>{hasPhoto ? 'Replace photo' : 'Add photo'}</strong>
                            <small>Upload from computer</small>
                        </span>
                    </button>

                    {onChooseFromCollection ? (
                        <button
                            type="button"
                            className="ab-slot-menu-item"
                            role="menuitem"
                            onClick={onChooseFromCollection}
                        >
                            <span className="ab-slot-menu-icon" aria-hidden>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <rect x="3" y="3" width="7" height="7" />
                                    <rect x="14" y="3" width="7" height="7" />
                                    <rect x="3" y="14" width="7" height="7" />
                                    <rect x="14" y="14" width="7" height="7" />
                                </svg>
                            </span>
                            <span className="ab-slot-menu-text">
                                <strong>Choose from collection</strong>
                                <small>Pick an uploaded photo</small>
                            </span>
                        </button>
                    ) : null}

                    {canSwap && hasPhoto ? (
                        <button type="button" className="ab-slot-menu-item" role="menuitem" onClick={onSwap}>
                            <span className="ab-slot-menu-icon" aria-hidden>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <polyline points="17 1 21 5 17 9" />
                                    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                                    <polyline points="7 23 3 19 7 15" />
                                    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                                </svg>
                            </span>
                            <span className="ab-slot-menu-text">
                                <strong>Swap with another photo</strong>
                                <small>{swapHint}</small>
                            </span>
                        </button>
                    ) : null}

                    {hasPhoto ? (
                        <button type="button" className="ab-slot-menu-item" role="menuitem" onClick={onRemovePhotos}>
                            <span className="ab-slot-menu-icon" aria-hidden>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <line x1="9" y1="9" x2="15" y2="15" />
                                    <line x1="15" y1="9" x2="9" y2="15" />
                                </svg>
                            </span>
                            <span className="ab-slot-menu-text">
                                <strong>Remove photos</strong>
                                <small>Clear this spread&apos;s images</small>
                            </span>
                        </button>
                    ) : null}

                    {canDeleteSpread ? (
                        <button
                            type="button"
                            className="ab-slot-menu-item ab-slot-menu-item--danger"
                            role="menuitem"
                            onClick={onDeleteSpread}
                        >
                            <span className="ab-slot-menu-icon" aria-hidden>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                            </span>
                            <span className="ab-slot-menu-text">
                                <strong>Delete spread</strong>
                                <small>Remove 2 pages from album</small>
                            </span>
                        </button>
                    ) : null}
                </div>
            </div>
        </div>,
        document.body
    );
}
