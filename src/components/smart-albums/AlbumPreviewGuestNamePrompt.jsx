import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getGuestProfile, saveGuestProfile } from '../../services/smartAlbumComments.service';

export default function AlbumPreviewGuestNamePrompt({ albumId, open, onClose }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    useEffect(() => {
        if (!open) return;
        const profile = getGuestProfile(albumId);
        setName(profile?.name || '');
        setEmail(profile?.email || '');
    }, [albumId, open]);

    if (!open) return null;

    const handleSubmit = (event) => {
        event.preventDefault();
        const trimmedName = name.trim();
        const trimmedEmail = email.trim();
        if (!trimmedName) return;
        saveGuestProfile(albumId, {
            ...(getGuestProfile(albumId) || {}),
            name: trimmedName,
            email: trimmedEmail,
        });
        onClose?.(trimmedName);
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
                <h2 className="av-guest-name-modal__title">Your Details</h2>
                <p className="av-guest-name-modal__lead">
                    This album requires your name and email so the photographer knows who left feedback and can send reminders.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                    <input
                        type="text"
                        className="av-guest-name-modal__input"
                        style={{ marginBottom: 0 }}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name"
                        autoFocus
                    />
                    <input
                        type="email"
                        className="av-guest-name-modal__input"
                        style={{ marginBottom: 0 }}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                    />
                </div>
                <div className="av-guest-name-modal__actions">
                    <button type="button" className="av-guest-name-modal__btn av-guest-name-modal__btn--ghost" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="av-guest-name-modal__btn av-guest-name-modal__btn--primary"
                        disabled={!name.trim() || !email.trim()}
                    >
                        Continue
                    </button>
                </div>
            </form>
        </div>,
        document.body
    );
}
