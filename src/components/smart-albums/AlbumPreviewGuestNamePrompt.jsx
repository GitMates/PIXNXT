import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, EyeOff } from 'lucide-react';
import { getGuestProfile, saveGuestProfile } from '../../services/smartAlbumComments.service';

export default function AlbumPreviewGuestNamePrompt({
    albumId,
    open,
    onClose,
    required = false,
    requirePassword = false,
    expectedPassword = '',
}) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        const profile = getGuestProfile(albumId);
        setName(profile?.name || '');
        setEmail(profile?.email || '');
        setPassword('');
        setShowPassword(false);
        setError('');
    }, [albumId, open]);

    if (!open) return null;

    const handleDismiss = () => {
        if (required) return;
        onClose?.();
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        const trimmedName = name.trim();
        const trimmedEmail = email.trim();
        if (!trimmedName || !trimmedEmail) return;

        if (requirePassword) {
            const expected = String(expectedPassword || '').trim();
            if (!expected) {
                setError('This album has no password set yet. Ask your photographer for access.');
                return;
            }
            if (password.trim() !== expected) {
                setError('Incorrect password. Please try again.');
                return;
            }
        }

        saveGuestProfile(albumId, {
            ...(getGuestProfile(albumId) || {}),
            name: trimmedName,
            email: trimmedEmail,
        });
        setError('');
        onClose?.(trimmedName);
    };

    const canSubmit =
        Boolean(name.trim() && email.trim()) &&
        (!requirePassword || Boolean(password.trim()));

    return createPortal(
        <div
            className="av-guest-name-backdrop"
            onClick={handleDismiss}
            role="presentation"
        >
            <form
                className="av-guest-name-modal"
                onClick={(e) => e.stopPropagation()}
                onSubmit={handleSubmit}
            >
                <h2 className="av-guest-name-modal__title">Your Details</h2>
                <p className="av-guest-name-modal__lead">
                    {requirePassword
                        ? 'This album requires your name, email, and password so the photographer knows who left feedback and can send reminders.'
                        : 'This album requires your name and email so the photographer knows who left feedback and can send reminders.'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                    <input
                        type="text"
                        className="av-guest-name-modal__input"
                        style={{ marginBottom: 0 }}
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            if (error) setError('');
                        }}
                        placeholder="Enter your name"
                        autoFocus
                        required
                        autoComplete="name"
                    />
                    <input
                        type="email"
                        className="av-guest-name-modal__input"
                        style={{ marginBottom: 0 }}
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            if (error) setError('');
                        }}
                        placeholder="Enter your email"
                        required
                        autoComplete="email"
                    />
                    {requirePassword ? (
                        <div className="av-guest-name-modal__password">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="av-guest-name-modal__input"
                                style={{ marginBottom: 0, paddingRight: 44 }}
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (error) setError('');
                                }}
                                placeholder="Enter password"
                                required
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="av-guest-name-modal__password-toggle"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => setShowPassword((prev) => !prev)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? (
                                    <EyeOff size={16} strokeWidth={2} aria-hidden />
                                ) : (
                                    <Eye size={16} strokeWidth={2} aria-hidden />
                                )}
                            </button>
                        </div>
                    ) : null}
                    {error ? (
                        <p className="text-sm text-red-600" style={{ margin: 0 }}>
                            {error}
                        </p>
                    ) : null}
                </div>
                <div className="av-guest-name-modal__actions">
                    {!required ? (
                        <button
                            type="button"
                            className="av-guest-name-modal__btn av-guest-name-modal__btn--ghost"
                            onClick={handleDismiss}
                        >
                            Cancel
                        </button>
                    ) : (
                        <span />
                    )}
                    <button
                        type="submit"
                        className="av-guest-name-modal__btn av-guest-name-modal__btn--primary"
                        disabled={!canSubmit}
                    >
                        Continue
                    </button>
                </div>
            </form>
        </div>,
        document.body
    );
}
