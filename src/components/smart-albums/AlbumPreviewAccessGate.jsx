import React, { useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { getGuestProfile, saveGuestProfile } from '../../services/smartAlbumComments.service';

export default function AlbumPreviewAccessGate({
    albumId,
    access,
    onGranted,
    children,
}) {
    const [password, setPassword] = useState('');
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

    if (accessLevel === 'private') {
        const expectedToken = access?.privateShareToken || '';
        if (expectedToken && urlToken === expectedToken) {
            return children;
        }

        return (
            <div className="av-page av-page--preview flex items-center justify-center min-h-screen bg-[#f5f5f5] p-6">
                <div className="w-full max-w-md rounded-xl border border-[#e8eaed] bg-white p-8 shadow-sm space-y-4 text-center">
                    <h1 className="text-lg font-semibold text-[#222]">Private album link</h1>
                    <p className="text-sm text-[#888]">
                        This album requires the private share link from your photographer. Open the
                        full URL you received — the token in the link is required.
                    </p>
                </div>
            </div>
        );
    }

    if (accessLevel === 'password' || access?.privacyLevel === 'password') {
        const handlePasswordSubmit = (e) => {
            e.preventDefault();
            if (password === access.accessPassword) {
                setGranted(true);
                onGranted?.();
                setError('');
            } else {
                setError('Incorrect password. Please try again.');
            }
        };

        return (
            <div className="av-page av-page--preview flex items-center justify-center min-h-screen bg-[#f5f5f5] p-6">
                <form
                    onSubmit={handlePasswordSubmit}
                    className="w-full max-w-md rounded-xl border border-[#e8eaed] bg-white p-8 shadow-sm space-y-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-[#f3f4f6] p-2">
                            <Lock className="size-5 text-[#222]" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-[#222]">Password required</h1>
                            <p className="text-sm text-[#888]">Enter the album access password to continue.</p>
                        </div>
                    </div>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Album password"
                        className="w-full rounded-lg border border-[#e0e0e0] bg-[#fafafa] px-3 py-2.5 text-sm outline-none focus:border-[#9b59b6]"
                        autoFocus
                    />
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <button
                        type="submit"
                        className="w-full rounded-lg bg-[#222] py-2.5 text-sm font-semibold text-white hover:bg-[#333]"
                    >
                        View album
                    </button>
                </form>
            </div>
        );
    }

    if (access?.privacyLevel === 'restricted') {
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
            <div className="av-page av-page--preview flex items-center justify-center min-h-screen bg-[#f5f5f5] p-6">
                <form
                    onSubmit={handleEmailSubmit}
                    className="w-full max-w-md rounded-xl border border-[#e8eaed] bg-white p-8 shadow-sm space-y-4"
                >
                    <div>
                        <h1 className="text-lg font-semibold text-[#222]">Verify your email</h1>
                        <p className="text-sm text-[#888] mt-1">
                            This album is restricted. Enter the email address your photographer shared
                            with you.
                        </p>
                    </div>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-lg border border-[#e0e0e0] bg-[#fafafa] px-3 py-2.5 text-sm outline-none focus:border-[#9b59b6]"
                        autoFocus
                    />
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <button
                        type="submit"
                        className="w-full rounded-lg bg-[#222] py-2.5 text-sm font-semibold text-white hover:bg-[#333]"
                    >
                        Continue
                    </button>
                </form>
            </div>
        );
    }

    return children;
}
