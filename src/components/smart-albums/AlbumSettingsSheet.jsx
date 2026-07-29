import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import AlbumProoferSettingsDrawerPanel from './AlbumProoferSettingsDrawerPanel';
import '../portal/portal.css';
import './AlbumProoferSettingsDrawer.css';

export default function AlbumSettingsSheet({
    isOpen,
    onClose,
    album,
    anchor,
    photographerId,
    onSaved,
    onPreview,
    onQuickEdit,
    onDuplicate,
    onDelete,
    onShareByEmail,
    onGetDirectLink,
    onGetQrCode,
    onShareWhatsApp,
}) {
    const popupRef = useRef(null);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    // Calculate position from anchor (3-dot button rect)
    const getPopupStyle = () => {
        const popupW = 320;
        const popupH = 540;
        const W = window.innerWidth;
        const H = window.innerHeight;

        if (!anchor) {
            // fallback: center of screen
            return {
                top: Math.max(60, (H - popupH) / 2),
                left: Math.max(8, (W - popupW) / 2),
                width: popupW,
            };
        }

        // Open to the left of the button (anchor.left = rect.right of 3-dot btn)
        let left = anchor.left - popupW;
        let top = anchor.top;

        // Clamp so it stays inside the viewport
        if (left < 8) left = 8;
        if (left + popupW > W - 8) left = W - popupW - 8;
        if (top + popupH > H - 8) top = Math.max(8, H - popupH - 8);

        return { top, left, width: popupW };
    };

    if (!isOpen) return null;

    return createPortal(
        <>
            {/* Transparent click-away backdrop — z-index below popup */}
            <div className="sa-settings-backdrop" onClick={onClose} aria-hidden />

            {/* Popup card — positioned near the 3-dot button */}
            <div
                className="theme-mono"
                style={{ position: 'fixed', zIndex: 9999, ...getPopupStyle() }}
            >
                <aside
                    ref={popupRef}
                    className="sa-album-settings-popup"
                    role="dialog"
                    aria-label="Album Settings"
                    onClick={(e) => e.stopPropagation()}
                >
                    <header className="sa-album-settings-drawer__header">
                        <div>
                            <h2 className="sa-album-settings-drawer__title">Album Settings</h2>
                            <p className="sa-album-settings-drawer__subtitle">
                                {album?.name || 'Album'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="sa-album-settings-drawer__close"
                            aria-label="Close settings"
                        >
                            <X size={18} strokeWidth={2} />
                        </button>
                    </header>
                    <div className="sa-album-settings-drawer__panel-wrap">
                        <AlbumProoferSettingsDrawerPanel
                            album={album}
                            photographerId={photographerId}
                            onAlbumUpdated={onSaved}
                            onClose={onClose}
                            onPreview={onPreview}
                            onQuickEdit={onQuickEdit}
                            onDuplicate={onDuplicate}
                            onDelete={onDelete}
                            onShareByEmail={onShareByEmail}
                            onGetDirectLink={onGetDirectLink}
                            onGetQrCode={onGetQrCode}
                            onShareWhatsApp={onShareWhatsApp}
                        />
                    </div>
                </aside>
            </div>
        </>,
        document.body
    );
}
