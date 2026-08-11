import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import { smartAlbumProoferSettingsService } from '../../services/smartAlbumProoferSettings.service';
import { isAlbumClientApproved } from '../../services/albumProof.service';
import './AlbumEditorSettings.css';

function SettingsToggle({ on, onChange, label, disabled = false }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={label}
            disabled={disabled}
            onClick={onChange}
            className={`ae-settings-toggle ${on ? 'ae-settings-toggle--on' : 'ae-settings-toggle--off'}${
                disabled ? ' ae-settings-toggle--disabled' : ''
            }`}
        >
            <span className="ae-settings-toggle__knob" aria-hidden="true" />
        </button>
    );
}

function SettingRow({ title, description, control }) {
    return (
        <div className="ae-settings-row">
            <div className="ae-settings-row__text">
                <p className="ae-settings-field__title">{title}</p>
                {description ? <p className="ae-settings-field__desc">{description}</p> : null}
            </div>
            {control}
        </div>
    );
}

export default function AlbumEditorSettingsPanel({
    album,
    photographerId,
    onAlbumUpdated,
}) {
    const albumId = album?.id;
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState('');

    const [maxSwaps, setMaxSwaps] = useState(5);
    const [allowExternal, setAllowExternal] = useState(false);
    const [allowVoice, setAllowVoice] = useState(true);
    const [requireVerification, setRequireVerification] = useState(false);
    const [approvalPin, setApprovalPin] = useState('');
    const [pinCopied, setPinCopied] = useState(false);
    const [sendReminders, setSendReminders] = useState(false);

    const [allowComments, setAllowComments] = useState(true);
    const feedbackLocked = isAlbumClientApproved(album, albumId);

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
                const locked = isAlbumClientApproved(album, albumId);
                setMaxSwaps(proofer.maxFreeSwaps);
                setAllowExternal(locked ? false : proofer.allowExternalUploads);
                setAllowVoice(locked ? false : proofer.allowVoiceRecordings !== false);

                const pin = proofer.approvalPin || '';
                setApprovalPin(pin);
                setRequireVerification(Boolean(pin) || defaults.requireApprovalPin);

                setSendReminders(proofer.sendReminderEmails);
                setAllowComments(locked ? false : album?.comments_enabled !== false);
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
    }, [photographerId, albumId, album?.id, album?.client_approved_at]);

    useEffect(() => {
        if (loading || !album) return;
        if (isAlbumClientApproved(album, albumId)) {
            setAllowComments(false);
            setAllowExternal(false);
            setAllowVoice(false);
            return;
        }
        setAllowComments(album.comments_enabled !== false);
    }, [
        loading,
        album,
        albumId,
        album?.comments_enabled,
        album?.client_approved_at,
    ]);

    const persist = useCallback(async () => {
        if (!photographerId || !albumId) return;
        if (isAlbumClientApproved(album, albumId)) return;

        try {
            const nextPin = requireVerification
                ? approvalPin || smartAlbumProoferSettingsService.randomPin()
                : '';

            const prooferPatch = {
                requireNameForComments: true,
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
                messages_enabled: true,
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
        maxSwaps,
        allowExternal,
        allowVoice,
        requireVerification,
        approvalPin,
        sendReminders,
        allowComments,
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
        maxSwaps,
        allowExternal,
        allowVoice,
        requireVerification,
        approvalPin,
        sendReminders,
        allowComments,
        persist,
    ]);

    const nudgeDays = globalDefaultsRef.current?.nudgeDays ?? 5;

    const handleCopyPin = async () => {
        if (!approvalPin) return;
        try {
            await navigator.clipboard.writeText(approvalPin);
            setPinCopied(true);
            setNotification('Approval PIN copied');
            window.setTimeout(() => {
                setPinCopied(false);
                setNotification('');
            }, 2000);
        } catch (err) {
            console.error(err);
            setNotification('Could not copy PIN');
            window.setTimeout(() => setNotification(''), 2000);
        }
    };

    const handleRegeneratePin = () => {
        const pin = smartAlbumProoferSettingsService.randomPin();
        setApprovalPin(pin);
        setPinCopied(false);
        setNotification('Approval PIN regenerated');
        window.setTimeout(() => setNotification(''), 2000);
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
                {/* Heading removed per design — kept element out to save vertical space */}

                <section className="ae-settings-section">
                    <p className="ae-settings-section__label">Feedback</p>
                    {feedbackLocked ? (
                        <p className="ae-settings-field__desc" style={{ marginBottom: 16 }}>
                            Client approved this album — comments, swaps, voice notes, and image
                            attachments are turned off.
                        </p>
                    ) : null}

                    <SettingRow
                        title="Allow comments"
                        description="Clients can leave feedback on each spread"
                        control={
                            <SettingsToggle
                                on={allowComments}
                                disabled={feedbackLocked}
                                onChange={() => setAllowComments((v) => !v)}
                                label="Allow comments"
                            />
                        }
                    />

                    {allowComments ? (
                        <div className="ae-settings-nested">
                            <SettingRow
                                title="Image attachments"
                                description="Applies to both comments and swap requests"
                                control={
                                    <SettingsToggle
                                        on={allowExternal}
                                        disabled={feedbackLocked}
                                        onChange={() => setAllowExternal((v) => !v)}
                                        label="Image attachments"
                                    />
                                }
                            />
                            <SettingRow
                                title="Voice notes"
                                description="Clients can record voice messages"
                                control={
                                    <SettingsToggle
                                        on={allowVoice}
                                        disabled={feedbackLocked}
                                        onChange={() => setAllowVoice((v) => !v)}
                                        label="Voice notes"
                                    />
                                }
                            />
                        </div>
                    ) : null}

                </section>

                <section className="ae-settings-section">
                    <p className="ae-settings-section__label">Sign-Off &amp; Automation</p>

                    <SettingRow
                        title="Approval PIN"
                        description="Client enters this to sign off the final album"
                        control={
                            <SettingsToggle
                                on={requireVerification}
                                onChange={() => {
                                    setRequireVerification((v) => {
                                        const nextV = !v;
                                        if (nextV && !approvalPin) {
                                            setApprovalPin(
                                                smartAlbumProoferSettingsService.randomPin()
                                            );
                                        }
                                        return nextV;
                                    });
                                }}
                                label="Approval PIN"
                            />
                        }
                    />

                    {requireVerification ? (
                        <div className="ae-settings-pin-block">
                            <div className="ae-settings-pin-row">
                                <div className="ae-settings-pin-digits" aria-label="Approval PIN">
                                    {(approvalPin || '----').split('').map((digit, i) => (
                                        <div key={i} className="ae-settings-pin-digit type-pin">
                                            {digit}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    className={`ae-settings-pin-copy${pinCopied ? ' ae-settings-pin-copy--done' : ''}`}
                                    onClick={handleCopyPin}
                                    disabled={!approvalPin}
                                    aria-label={pinCopied ? 'PIN copied' : 'Copy approval PIN'}
                                    title={pinCopied ? 'Copied' : 'Copy PIN'}
                                >
                                    {pinCopied ? <Check size={16} strokeWidth={2} /> : <Copy size={16} strokeWidth={2} />}
                                </button>
                            </div>
                            <button
                                type="button"
                                className="ae-settings-regenerate"
                                onClick={handleRegeneratePin}
                            >
                                Regenerate
                            </button>
                        </div>
                    ) : null}

                    <SettingRow
                        title="Reminder emails"
                        description={`Studio default: sends after ${nudgeDays} days of no activity`}
                        control={
                            <SettingsToggle
                                on={sendReminders}
                                onChange={() => setSendReminders((v) => !v)}
                                label="Reminder emails"
                            />
                        }
                    />
                </section>
            </div>

            {notification ? <div className="ae-settings-toast">{notification}</div> : null}
        </div>
    );
}
