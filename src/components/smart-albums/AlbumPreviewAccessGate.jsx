import React, { useMemo, useState } from 'react';
import { getGuestProfile, saveGuestProfile } from '../../services/smartAlbumComments.service';

export default function AlbumPreviewAccessGate({
    albumId,
    access,
    onGranted,
    children,
    /** Logged-in album owner: skip private-token wall. Password is collected in the overlay. */
    isOwner = false,
}) {
    const [email, setEmail] = useState(() => getGuestProfile(albumId)?.email || '');
    const [error, setError] = useState('');
    const [granted, setGranted] = useState(false);

    const urlToken = useMemo(() => {
        try {
            return new URLSearchParams(window.location.search).get('token') || '';
        } catch {
            return '';
        }
    }, []);

    if (granted) return children;

    const accessLevel = access?.accessLevel || access?.privacyLevel || 'public';
    const requiresPassword =
        accessLevel === 'password' || access?.privacyLevel === 'password';
    const requiresPrivate =
        accessLevel === 'private' ||
        accessLevel === 'restricted' ||
        access?.privacyLevel === 'restricted';

    // Password is collected in the Your Details overlay on top of the album.
    if (requiresPassword) {
        return children;
    }

    if (requiresPrivate) {
        if (isOwner) return children;

        const expectedToken = access?.privateShareToken || '';
        if (expectedToken && urlToken === expectedToken) {
            return children;
        }

        return (
            <div className="av-page av-page--preview av-access-gate">
                <div className="av-access-gate__card av-access-gate__card--center">
                    <h1 className="av-access-gate__title">Private album link</h1>
                    <p className="av-access-gate__text">
                        This album requires the private share link from your photographer. Open the
                        full URL you received — the token in the link is required.
                    </p>
                </div>
            </div>
        );
    }

    if (access?.privacyLevel === 'restricted' && !requiresPrivate) {
        const whitelist = access?.whitelistedEmails || [];
        const handleEmailSubmit = (e) => {
            e.preventDefault();
            const normalized = email.trim().toLowerCase();
            if (!normalized) {
                setError('Enter your email address.');
                return;
            }
            if (whitelist.length && !whitelist.includes(normalized)) {
                setError('This email is not authorized to view this album.');
                return;
            }
            saveGuestProfile(albumId, {
                ...(getGuestProfile(albumId) || {}),
                email: normalized,
            });
            setGranted(true);
            onGranted?.();
            setError('');
        };

        return (
            <div className="av-page av-page--preview av-access-gate">
                <form onSubmit={handleEmailSubmit} className="av-access-gate__card">
                    <div>
                        <h1 className="av-access-gate__title">Verify your email</h1>
                        <p className="av-access-gate__text">
                            This album is restricted. Enter the email address your photographer shared
                            with you.
                        </p>
                    </div>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="av-access-gate__input"
                        autoFocus
                    />
                    {error ? <p className="av-access-gate__error">{error}</p> : null}
                    <button type="submit" className="av-access-gate__submit">
                        Continue
                    </button>
                </form>
            </div>
        );
    }

    return children;
}
