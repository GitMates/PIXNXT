import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import AlbumProoferSettingsDrawerPanel from './AlbumProoferSettingsDrawerPanel';
import '../portal/portal.css';
import './AlbumProoferSettingsDrawer.css';

export default function AlbumSettingsSheet({
    isOpen,
    onClose,
    album,
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
    if (!isOpen) return null;

    return createPortal(
        <div className="theme-mono">
            <div className="sa-album-settings-backdrop" onClick={onClose} aria-hidden />
            <aside className="sa-album-settings-drawer" role="dialog" aria-label="Album Settings">
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
        </div>,
        document.body
    );
}
