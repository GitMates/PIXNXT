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
    canAddSpreadBefore = false,
    canAddSpreadAfter = false,
    pageCountBusy = false,
    onAddSpreadBefore,
    onAddSpreadAfter,
    onCoverText,
    hasCoverText = false,
    onRemovePhotos,
    onRemoveSpread,
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
                    {canAddSpreadAfter && onAddSpreadAfter ? (
                        <button
                            type="button"
                            className="ab-slot-menu-item ab-slot-menu-item--primary"
                            role="menuitem"
                            disabled={pageCountBusy}
                            onClick={onAddSpreadAfter}
                        >
                            <span className="ab-slot-menu-icon" aria-hidden>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                            </span>
                            <span className="ab-slot-menu-text">
                                <strong>Add spread</strong>
                                <small>After this spread</small>
                            </span>
                        </button>
                    ) : null}

                    {canAddSpreadBefore && onAddSpreadBefore ? (
                        <button
                            type="button"
                            className="ab-slot-menu-item"
                            role="menuitem"
                            disabled={pageCountBusy}
                            onClick={onAddSpreadBefore}
                        >
                            <span className="ab-slot-menu-icon" aria-hidden>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                            </span>
                            <span className="ab-slot-menu-text">
                                <strong>Add spread</strong>
                                <small>Before this spread</small>
                            </span>
                        </button>
                    ) : null}

                    {onCoverText ? (
                        <button
                            type="button"
                            className="ab-slot-menu-item"
                            role="menuitem"
                            onClick={onCoverText}
                        >
                            <span className="ab-slot-menu-icon" aria-hidden>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <path d="M4 7V4h16v3" />
                                    <path d="M9 20h6" />
                                    <path d="M12 4v16" />
                                </svg>
                            </span>
                            <span className="ab-slot-menu-text">
                                <strong>{hasCoverText ? 'Edit text message' : 'Add text message'}</strong>
                                <small>Title or note on front cover</small>
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

                    {canRemoveSpread && onRemoveSpread ? (
                        <button
                            type="button"
                            className="ab-slot-menu-item ab-slot-menu-item--danger"
                            role="menuitem"
                            disabled={pageCountBusy}
                            onClick={onRemoveSpread}
                        >
                            <span className="ab-slot-menu-icon" aria-hidden>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <line x1="8" y1="12" x2="16" y2="12" />
                                </svg>
                            </span>
                            <span className="ab-slot-menu-text">
                                <strong>Remove spread</strong>
                                <small>Delete this spread from the album</small>
                            </span>
                        </button>
                    ) : null}
                </div>
            </div>
        </div>,
        document.body
    );
}
