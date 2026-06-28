import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getGuestProfile, saveGuestProfile } from '../../services/smartAlbumComments.service';

export default function AlbumPreviewGuestNamePrompt({ albumId, open, onClose }) {
    const [name, setName] = useState('');

    useEffect(() => {
        if (!open) return;
        setName(getGuestProfile(albumId)?.name || '');
    }, [albumId, open]);

    if (!open) return null;

    const handleSubmit = (event) => {
        event.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        saveGuestProfile(albumId, {
            ...(getGuestProfile(albumId) || {}),
            name: trimmed,
        });
        onClose?.(trimmed);
    };

    return createPortal(
        <div
            className="av-guest-name-backdrop"
            onClick={onClose}
            role="presentation"
        >
            <form
                className="av-guest-name-modal"
                onClick={(e) => e.stopPropagation()}
                onSubmit={handleSubmit}
            >
                <h2 className="av-guest-name-modal__title">Your name</h2>
                <p className="av-guest-name-modal__lead">
                    This album requires your name so the photographer knows who left feedback.
                </p>
                <input
                    type="text"
                    className="av-guest-name-modal__input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    autoFocus
                />
                <div className="av-guest-name-modal__actions">
                    <button type="button" className="av-guest-name-modal__btn av-guest-name-modal__btn--ghost" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="av-guest-name-modal__btn av-guest-name-modal__btn--primary"
                        disabled={!name.trim()}
                    >
                        Continue
                    </button>
                </div>
            </form>
        </div>,
        document.body
    );
}
