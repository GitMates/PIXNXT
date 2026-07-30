import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import { smartAlbumProoferSettingsService } from '../../services/smartAlbumProoferSettings.service';
import './AlbumEditorSettings.css';

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
    const [pinCopied, setPinCopied] = useState(false);
    const [notification, setNotification] = useState('');

    const [requireName, setRequireName] = useState(false);
    const [maxSwaps, setMaxSwaps] = useState(5);
    const [allowExternal, setAllowExternal] = useState(false);
    const [allowVoice, setAllowVoice] = useState(true);
    const [requireVerification, setRequireVerification] = useState(false);
    const [approvalPin, setApprovalPin] = useState('');
    const [sendReminders, setSendReminders] = useState(false);

    const [allowComments, setAllowComments] = useState(true);
    const [allowSwaps, setAllowSwaps] = useState(true);

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
                setRequireName(proofer.requireNameForComments);
                setMaxSwaps(proofer.maxFreeSwaps);
                setAllowExternal(proofer.allowExternalUploads);
                setAllowVoice(proofer.allowVoiceRecordings !== false);

                const pin = proofer.approvalPin || '';
                setApprovalPin(pin);
                setRequireVerification(Boolean(pin) || defaults.requireApprovalPin);

                setSendReminders(proofer.sendReminderEmails);
                setAllowComments(album?.comments_enabled !== false);
                setAllowSwaps(album?.messages_enabled !== false);
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
    }, [loading, album?.comments_enabled, album?.messages_enabled]);

    const persist = useCallback(async () => {
        if (!photographerId || !albumId) return;

        try {
            const nextPin = requireVerification
                ? approvalPin || smartAlbumProoferSettingsService.randomPin()
                : '';

            const prooferPatch = {
                requireNameForComments: requireName,
                maxFreeSwaps: maxSwaps,
                allowExternalUploads: allowExternal,
                allowVoiceRecordings: allowVoice,
                approvalPin: nextPin,
                sendReminderEmails: sendReminders,
            };

            if (requireVerification && !approvalPin) {
                setApprovalPin(nextPin);
            }

            const clientPatch = {
                comments_enabled: allowComments,
                messages_enabled: allowSwaps,
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

            await smartAlbumsService.syncAlbumPreviewData(photographerId, albumId);

            onAlbumUpdated?.(merged);
        } catch (err) {
            console.error(err);
        }
    }, [
        photographerId,
        albumId,
        album,
        requireName,
        maxSwaps,
        allowExternal,
        allowVoice,
        requireVerification,
        approvalPin,
        sendReminders,
        allowComments,
        allowSwaps,
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
        requireName,
        maxSwaps,
        allowExternal,
        allowVoice,
        requireVerification,
        approvalPin,
        sendReminders,
        allowComments,
        allowSwaps,
        persist,
    ]);

    const nudgeDays = globalDefaultsRef.current?.nudgeDays ?? 5;

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
                    <p className="ae-settings-section__label">Feedback</p>

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

                    {allowComments ? (
                        <div className="ae-settings-nested">
                            <div className="ae-settings-row">
                                <div className="ae-settings-row__text">
                                    <p className="ae-settings-field__title">Require name</p>
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
                            <div className="ae-settings-row">
                                <div className="ae-settings-row__text">
                                    <p className="ae-settings-field__title">Voice notes</p>
                                    <p className="ae-settings-field__desc">
                                        Clients can record voice messages
                                    </p>
                                </div>
                                <SettingsToggle
                                    on={allowVoice}
                                    onChange={() => setAllowVoice((v) => !v)}
                                    label="Voice notes"
                                />
                            </div>
                            <div className="ae-settings-row">
                                <div className="ae-settings-row__text">
                                    <p className="ae-settings-field__title">Image attachments</p>
                                    <p className="ae-settings-field__desc">
                                        Clients can attach reference images
                                    </p>
                                </div>
                                <SettingsToggle
                                    on={allowExternal}
                                    onChange={() => setAllowExternal((v) => !v)}
                                    label="Image attachments"
                                />
                            </div>
                        </div>
                    ) : null}

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

                    {allowSwaps ? (
                        <div className="ae-settings-nested">
                            <div className="ae-settings-nested__row">
                                <span className="ae-settings-nested__label">Free swaps included</span>
                                <input
                                    id="ae-max-swaps"
                                    type="number"
                                    min="0"
                                    className="ae-settings-swaps-input"
                                    value={maxSwaps}
                                    onChange={(e) =>
                                        setMaxSwaps(Math.max(0, parseInt(e.target.value, 10) || 0))
                                    }
                                />
                            </div>
                        </div>
                    ) : null}
                </section>

                <section className="ae-settings-section">
                    <p className="ae-settings-section__label">Sign-Off &amp; Automation</p>

                    <div className="ae-settings-row">
                        <div className="ae-settings-row__text">
                            <p className="ae-settings-field__title">Approval PIN</p>
                            <p className="ae-settings-field__desc">
                                Client enters this to sign off the final album
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
                            <p className="ae-settings-field__desc ae-settings-pin-footnote">
                                A signature, not a key. Separate from the access PIN in Share.
                            </p>
                        </div>
                    )}

                    <div className="ae-settings-row">
                        <div className="ae-settings-row__text">
                            <p className="ae-settings-field__title">Reminder emails</p>
                            <p className="ae-settings-field__desc">
                                Inheriting global rule: sends after {nudgeDays} days of inactivity
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
