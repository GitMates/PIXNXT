import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import {
    smartAlbumProoferSettingsService,
    getAlbumShareCopyUrl,
    getAlbumShareDisplayUrl,
} from '../../services/smartAlbumProoferSettings.service';
import './AlbumEditorSettings.css';
import AeSettingsSelect from './AeSettingsSelect';

const ACCESS_LEVEL_OPTIONS = [
    {
        value: 'public',
        label: 'Public',
        description: 'Anyone with the link can open the album',
    },
    {
        value: 'password',
        label: 'Password Protected',
        description: 'Clients must enter a password before viewing',
    },
    {
        value: 'private',
        label: 'Private (Link Only)',
        description: 'Hidden URL with a unique token — not publicly listed',
    },
];

function SettingsToggle({ on, onChange, label }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={label}
            onClick={onChange}
            className={`ae-settings-toggle ${on ? 'ae-settings-toggle--on' : 'ae-settings-toggle--off'}`}
        >
            <span className="ae-settings-toggle__knob" />
        </button>
    );
}

export default function AlbumEditorSettingsPanel({
    album,
    photographerId,
    onAlbumUpdated,
}) {
    const albumId = album?.id;
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [pinCopied, setPinCopied] = useState(false);
    const [notification, setNotification] = useState('');

    const [accessLevel, setAccessLevel] = useState('password');
    const [albumPassword, setAlbumPassword] = useState('');
    const [requireName, setRequireName] = useState(false);
    const [maxSwaps, setMaxSwaps] = useState(5);
    const [allowExternal, setAllowExternal] = useState(false);
    const [allowVoice, setAllowVoice] = useState(true);
    const [requireVerification, setRequireVerification] = useState(false);
    const [approvalPin, setApprovalPin] = useState('');
    const [sendReminders, setSendReminders] = useState(false);
    const [privateShareToken, setPrivateShareToken] = useState('');

    const [allowComments, setAllowComments] = useState(true);
    const [allowSwaps, setAllowSwaps] = useState(true);
    const [shareLink, setShareLink] = useState(true);

    const saveTimerRef = useRef(null);
    const skipSaveRef = useRef(true);
    const globalDefaultsRef = useRef(null);

    useEffect(() => {
        if (!photographerId || !albumId) {
            setLoading(false);
            return undefined;
        }

        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const [defaults, proofer] = await Promise.all([
                    smartAlbumProoferSettingsService.loadPhotographerDefaults(photographerId),
                    smartAlbumProoferSettingsService.loadAlbumSettings(
                        photographerId,
                        albumId,
                        album
                    ),
                ]);
                if (cancelled) return;

                globalDefaultsRef.current = defaults;
                setAccessLevel(proofer.accessLevel || 'password');
                setAlbumPassword(proofer.albumPassword || '');
                setRequireName(proofer.requireNameForComments);
                setMaxSwaps(proofer.maxFreeSwaps);
                setAllowExternal(proofer.allowExternalUploads);
                setAllowVoice(proofer.allowVoiceRecordings !== false);
                
                const pin = proofer.approvalPin || '';
                setApprovalPin(pin);
                setRequireVerification(Boolean(pin) || defaults.requireApprovalPin);
                
                setSendReminders(proofer.sendReminderEmails);
                setPrivateShareToken(proofer.privateShareToken || '');
                setAllowComments(album?.comments_enabled !== false);
                setAllowSwaps(album?.messages_enabled !== false);
                setShareLink(album?.share_link_enabled !== false);
                skipSaveRef.current = true;
            } catch (err) {
                console.error(err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [photographerId, albumId, album?.id]);

    useEffect(() => {
        if (loading || !album) return;
        setAllowComments(album.comments_enabled !== false);
        setAllowSwaps(album.messages_enabled !== false);
        setShareLink(album.share_link_enabled !== false);
    }, [
        loading,
        album?.comments_enabled,
        album?.messages_enabled,
        album?.share_link_enabled,
    ]);

    const persist = useCallback(async () => {
        if (!photographerId || !albumId) return;

        try {
            const nextPin = requireVerification
                ? approvalPin || smartAlbumProoferSettingsService.randomPin()
                : '';

            const prooferPatch = {
                accessLevel,
                albumPassword: accessLevel === 'password' ? albumPassword : '',
                privateShareToken:
                    accessLevel === 'private'
                        ? privateShareToken ||
                          smartAlbumProoferSettingsService.randomToken()
                        : privateShareToken,
                requireNameForComments: requireName,
                maxFreeSwaps: maxSwaps,
                allowExternalUploads: allowExternal,
                allowVoiceRecordings: allowVoice,
                approvalPin: nextPin,
                sendReminderEmails: sendReminders,
            };

            if (accessLevel === 'private' && !privateShareToken) {
                setPrivateShareToken(prooferPatch.privateShareToken);
            }
            if (requireVerification && !approvalPin) {
                setApprovalPin(nextPin);
            }

            const clientPatch = {
                comments_enabled: allowComments,
                messages_enabled: allowSwaps,
                share_link_enabled: shareLink,
            };

            await smartAlbumProoferSettingsService.saveAlbumSettings(
                photographerId,
                albumId,
                prooferPatch,
                { album, clientPatch }
            );

            await smartAlbumsService.updateAlbumClientSettings(
                photographerId,
                albumId,
                clientPatch
            );

            const refreshed = await smartAlbumsService.getAlbum(photographerId, albumId);
            const merged = refreshed || { ...album, ...clientPatch };

            await smartAlbumsService.syncAlbumPreviewProoferSettings(
                photographerId,
                albumId,
                merged
            );

            if (merged?.status === 'published') {
                await smartAlbumsService.syncAlbumPreviewData(photographerId, albumId);
            }

            onAlbumUpdated?.(merged);
        } catch (err) {
            console.error(err);
        }
    }, [
        photographerId,
        albumId,
        album,
        accessLevel,
        albumPassword,
        privateShareToken,
        requireName,
        maxSwaps,
        allowExternal,
        allowVoice,
        requireVerification,
        approvalPin,
        sendReminders,
        allowComments,
        allowSwaps,
        shareLink,
        onAlbumUpdated,
    ]);

    useEffect(() => {
        if (loading || skipSaveRef.current) {
            skipSaveRef.current = false;
            return undefined;
        }

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(() => {
            void persist();
        }, 700);

        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, [
        loading,
        accessLevel,
        albumPassword,
        requireName,
        maxSwaps,
        allowExternal,
        allowVoice,
        requireVerification,
        approvalPin,
        sendReminders,
        allowComments,
        allowSwaps,
        shareLink,
        persist,
    ]);

    const shareDisplayUrl = getAlbumShareDisplayUrl(album, {
        accessLevel,
        privateShareToken,
    });

    const nudgeDays = globalDefaultsRef.current?.nudgeDays ?? 5;

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(
                getAlbumShareCopyUrl(album, { accessLevel, privateShareToken })
            );
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCopyPin = async () => {
        try {
            await navigator.clipboard.writeText(approvalPin);
            setPinCopied(true);
            setNotification('Approval PIN has been copied');
            setTimeout(() => {
                setPinCopied(false);
                setNotification('');
            }, 2000);
        } catch (err) {
            console.error(err);
        }
    };

    const handleRegeneratePin = () => {
        const pin = smartAlbumProoferSettingsService.randomPin();
        setApprovalPin(pin);
    };

    if (loading) {
        return <p className="ae-settings-loading">Loading settings…</p>;
    }

    if (!photographerId || !albumId) {
        return (
            <p className="ae-settings-loading">
                Sign in to manage album settings.
            </p>
        );
    }

    return (
        <div className="ae-settings-panel">
            <div className="ae-settings-panel__scroll">
                <h2 className="ae-settings-panel__heading">Settings</h2>

                <section className="ae-settings-section">
                    <p className="ae-settings-section__label">Album Link &amp; Security</p>

                    <div className="ae-settings-field">
                        <label className="ae-settings-field__label" htmlFor="ae-live-share-link">
                            Live Share Link
                        </label>
                        <div className="ae-settings-inset">
                            <input
                                id="ae-live-share-link"
                                type="text"
                                value={shareDisplayUrl}
                                readOnly
                            />
                            <button
                                type="button"
                                className="ae-settings-copy-btn"
                                onClick={handleCopyLink}
                                aria-label="Copy link"
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className="ae-settings-field">
                        <label className="ae-settings-field__label" htmlFor="ae-access-level">
                            Access Level
                        </label>
                        <AeSettingsSelect
                            id="ae-access-level"
                            value={accessLevel}
                            onChange={setAccessLevel}
                            options={ACCESS_LEVEL_OPTIONS}
                        />
                        {accessLevel === 'password' && (
                            <div className="ae-settings-field ae-settings-field--password">
                                <input
                                    type="password"
                                    className="ae-settings-input"
                                    value={albumPassword}
                                    onChange={(e) => setAlbumPassword(e.target.value)}
                                    placeholder="Set album password"
                                />
                            </div>
                        )}
                        {accessLevel === 'private' && (
                            <p className="ae-settings-private-hint">
                                Generates a unique, randomized token link that cannot be guessed.
                                No password required, but this project stays hidden from public
                                search engines and your global portfolio.
                            </p>
                        )}
                    </div>
                </section>

                <section className="ae-settings-section">
                    <p className="ae-settings-section__label">Proofing &amp; Collaboration</p>

                    <div className="ae-settings-row">
                        <div className="ae-settings-row__text">
                            <p className="ae-settings-field__title">Require Name for Comments</p>
                            <p className="ae-settings-field__desc">
                                Identify who is leaving feedback
                            </p>
                        </div>
                        <SettingsToggle
                            on={requireName}
                            onChange={() => setRequireName((v) => !v)}
                            label="Require name"
                        />
                    </div>

                    <div className="ae-settings-field">
                        <label className="ae-settings-field__label" htmlFor="ae-max-swaps">
                            Max Allowed Free Swaps
                        </label>
                        <input
                            id="ae-max-swaps"
                            type="number"
                            min="0"
                            className="ae-settings-input ae-settings-input--compact"
                            value={maxSwaps}
                            onChange={(e) =>
                                setMaxSwaps(Math.max(0, parseInt(e.target.value, 10) || 0))
                            }
                        />
                    </div>

                    <div className="ae-settings-row">
                        <div className="ae-settings-row__text">
                            <p className="ae-settings-field__title">Allow External Image Uploads</p>
                            <p className="ae-settings-field__desc">
                                Clients can attach images in comments and swap requests
                            </p>
                        </div>
                        <SettingsToggle
                            on={allowExternal}
                            onChange={() => setAllowExternal((v) => !v)}
                            label="External uploads"
                        />
                    </div>

                    <div className="ae-settings-row">
                        <div className="ae-settings-row__text">
                            <p className="ae-settings-field__title">Allow Voice Recordings</p>
                            <p className="ae-settings-field__desc">
                                Clients can record and send voice messages in feedback
                            </p>
                        </div>
                        <SettingsToggle
                            on={allowVoice}
                            onChange={() => setAllowVoice((v) => !v)}
                            label="Voice recordings"
                        />
                    </div>

                    <div className="ae-settings-subsection">
                        <p className="ae-settings-subsection__label">Client preview</p>

                        <div className="ae-settings-row">
                            <div className="ae-settings-row__text">
                                <p className="ae-settings-field__title">Allow comments</p>
                                <p className="ae-settings-field__desc">
                                    Clients can leave feedback on each spread
                                </p>
                            </div>
                            <SettingsToggle
                                on={allowComments}
                                onChange={() => setAllowComments((v) => !v)}
                                label="Allow comments"
                            />
                        </div>

                        <div className="ae-settings-row">
                            <div className="ae-settings-row__text">
                                <p className="ae-settings-field__title">Allow swaps</p>
                                <p className="ae-settings-field__desc">
                                    Clients can place swap requests on photos
                                </p>
                            </div>
                            <SettingsToggle
                                on={allowSwaps}
                                onChange={() => setAllowSwaps((v) => !v)}
                                label="Allow swaps"
                            />
                        </div>

                        <div className="ae-settings-row">
                            <div className="ae-settings-row__text">
                                <p className="ae-settings-field__title">Client share link</p>
                                <p className="ae-settings-field__desc">
                                    Clients can open the album with your share link
                                </p>
                            </div>
                            <SettingsToggle
                                on={shareLink}
                                onChange={() => setShareLink((v) => !v)}
                                label="Client share link"
                            />
                        </div>
                    </div>
                </section>

                <section className="ae-settings-section">
                    <p className="ae-settings-section__label">Sign-Off &amp; Automation</p>

                    <div className="ae-settings-row">
                        <div className="ae-settings-row__text">
                            <p className="ae-settings-field__title">Approval PIN</p>
                            <p className="ae-settings-field__desc">
                                Require unique PIN for final album approval
                            </p>
                        </div>
                        <SettingsToggle
                            on={requireVerification}
                            onChange={() => {
                                setRequireVerification((v) => {
                                    const nextV = !v;
                                    if (nextV && !approvalPin) {
                                        setApprovalPin(smartAlbumProoferSettingsService.randomPin());
                                    }
                                    return nextV;
                                });
                            }}
                            label="Approval PIN"
                        />
                    </div>

                    {requireVerification && (
                        <div className="ae-settings-field">
                            <div className="ae-settings-pin-row">
                                <div className="ae-settings-pin-digits">
                                    {(approvalPin || '----').split('').map((digit, i) => (
                                        <div key={i} className="ae-settings-pin-digit">
                                            {digit}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    className="ae-settings-pin-copy"
                                    onClick={handleCopyPin}
                                    aria-label="Copy PIN"
                                >
                                    {pinCopied ? <Check size={16} /> : <Copy size={16} />}
                                </button>
                            </div>
                            <button
                                type="button"
                                className="ae-settings-regenerate"
                                onClick={handleRegeneratePin}
                            >
                                <RefreshCw size={14} />
                                Regenerate
                            </button>
                        </div>
                    )}

                    <div className="ae-settings-row">
                        <div className="ae-settings-row__text">
                            <p className="ae-settings-field__title">Send Reminder Emails</p>
                            <p className="ae-settings-field__desc">
                                Inheriting global rule: Emails automatically send after {nudgeDays}{' '}
                                days of inactivity.
                            </p>
                        </div>
                        <SettingsToggle
                            on={sendReminders}
                            onChange={() => setSendReminders((v) => !v)}
                            label="Reminders"
                        />
                    </div>
                </section>
            </div>

            {notification && <div className="ae-settings-toast">{notification}</div>}
        </div>
    );
}
