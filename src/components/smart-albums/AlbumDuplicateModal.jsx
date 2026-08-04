import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Copy, X } from 'lucide-react';
import './AlbumDuplicateModal.css';

export default function AlbumDuplicateModal({
    album,
    isOpen,
    onClose,
    onConfirm,
    busy = false,
}) {
    useEffect(() => {
        if (!isOpen) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape' && !busy) onClose?.();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, busy, onClose]);

    if (!isOpen || !album) return null;

    return createPortal(
        <div
            className="adm-overlay"
            onClick={() => {
                if (!busy) onClose?.();
            }}
        >
            <div
                className="adm-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="adm-title"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="adm-header">
                    <div>
                        <p className="adm-eyebrow">Duplicate album</p>
                        <h2 id="adm-title" className="adm-title">
                            {album.name || 'Album'}
                        </h2>
                    </div>
                    <button
                        type="button"
                        className="adm-close"
                        onClick={onClose}
                        disabled={busy}
                        aria-label="Close"
                    >
                        <X size={18} strokeWidth={2} />
                    </button>
                </header>

                <div className="adm-body">
                    <p className="adm-lead">
                        Create a copy of this album? Images will be duplicated into a new album that
                        starts as a <strong>Draft</strong>.
                    </p>

                    <ul className="adm-notes">
                        <li>Only album images are copied — client feedback is not.</li>
                        <li>The new album name will be “{album.name || 'Album'} (Copy)”.</li>
                    </ul>
                </div>

                <footer className="adm-footer">
                    <button
                        type="button"
                        className="adm-btn adm-btn--ghost"
                        onClick={onClose}
                        disabled={busy}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="adm-btn adm-btn--primary"
                        onClick={onConfirm}
                        disabled={busy}
                    >
                        {busy ? (
                            'Duplicating…'
                        ) : (
                            <>
                                <Copy size={15} strokeWidth={2.25} aria-hidden />
                                Duplicate
                            </>
                        )}
                    </button>
                </footer>
            </div>
        </div>,
        document.body
    );
}
