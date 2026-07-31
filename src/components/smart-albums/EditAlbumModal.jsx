import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, RefreshCw, Settings2, X } from 'lucide-react';
import DatePicker from '../ui/DatePicker/DatePicker';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import { smartAlbumProoferSettingsService } from '../../services/smartAlbumProoferSettings.service';
import { isAlbumClientApproved } from '../../services/albumProof.service';
import './EditAlbumModal.css';

function ModalToggle({ on, onChange, label, disabled = false }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!on)}
            className={`eam-toggle${on ? ' eam-toggle--on' : ''}${disabled ? ' eam-toggle--disabled' : ''}`}
        >
            <span className="eam-toggle__knob" aria-hidden />
        </button>
    );
}

function SettingRow({ title, description, control }) {
    return (
        <div className="eam-setting-row">
            <div className="eam-setting-row__text">
                <p className="eam-setting-row__title">{title}</p>
                {description ? <p className="eam-setting-row__desc">{description}</p> : null}
            </div>
            {control}
        </div>
    );
}

export default function EditAlbumModal({
    album,
    isOpen,
    onClose,
    onSave,
    onAlbumUpdated,
    photographerId,
    saving,
}) {
    const albumId = album?.id;
    const [name, setName] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [advancedLoading, setAdvancedLoading] = useState(false);

    const [allowComments, setAllowComments] = useState(true);
    const [allowExternal, setAllowExternal] = useState(false);
    const [allowVoice, setAllowVoice] = useState(true);
    const [allowSwaps, setAllowSwaps] = useState(true);
    const [requireVerification, setRequireVerification] = useState(false);
    const [approvalPin, setApprovalPin] = useState('');

    const feedbackLocked = isAlbumClientApproved(album, albumId);

    useEffect(() => {
        if (!album || !isOpen) return;
        setName(album.name || '');
        setEventDate(album.event_date ? album.event_date.slice(0, 10) : '');
        setShowAdvanced(false);
    }, [album, isOpen]);

    useEffect(() => {
        if (!isOpen || !photographerId || !albumId) return undefined;

        let cancelled = false;
        (async () => {
            try {
                setAdvancedLoading(true);
                const [defaults, proofer] = await Promise.all([
                    smartAlbumProoferSettingsService.loadPhotographerDefaults(photographerId),
                    smartAlbumProoferSettingsService.loadAlbumSettings(
                        photographerId,
                        albumId,
                        album
                    ),
                ]);
                if (cancelled) return;

                const locked = isAlbumClientApproved(album, albumId);
                setAllowExternal(locked ? false : Boolean(proofer.allowExternalUploads));
                setAllowVoice(locked ? false : proofer.allowVoiceRecordings !== false);
                const pin = proofer.approvalPin || '';
                setApprovalPin(pin);
                setRequireVerification(Boolean(pin) || Boolean(defaults.requireApprovalPin));
                setAllowComments(locked ? false : album?.comments_enabled !== false);
                setAllowSwaps(locked ? false : album?.messages_enabled !== false);
            } catch (err) {
                console.error(err);
            } finally {
                if (!cancelled) setAdvancedLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isOpen, photographerId, albumId, album]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    const persistAdvanced = useCallback(async () => {
        if (!photographerId || !albumId || feedbackLocked) return album;

        const nextPin = requireVerification
            ? approvalPin || smartAlbumProoferSettingsService.randomPin()
            : '';

        const prooferPatch = {
            allowExternalUploads: allowExternal,
            allowVoiceRecordings: allowVoice,
            approvalPin: nextPin,
        };

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

        return merged;
    }, [
        photographerId,
        albumId,
        album,
        feedbackLocked,
        requireVerification,
        approvalPin,
        allowExternal,
        allowVoice,
        allowComments,
        allowSwaps,
    ]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const details = {
            name: name.trim(),
            event_date: eventDate || null,
        };

        try {
            await onSave?.(details);
            if (showAdvanced) {
                const merged = await persistAdvanced();
                if (merged) onAlbumUpdated?.(merged);
            }
            onClose?.();
        } catch (err) {
            console.error(err);
        }
    };

    const handleRegeneratePin = () => {
        setApprovalPin(smartAlbumProoferSettingsService.randomPin());
        setRequireVerification(true);
    };

    if (!isOpen || !album) return null;

    return createPortal(
        <div className="eam-overlay" onClick={onClose} role="presentation">
            <div
                className={`eam-modal${showAdvanced ? ' eam-modal--advanced' : ''}`}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="eam-title"
            >
                <header className="eam-header">
                    <div>
                        <p className="eam-eyebrow">Album details</p>
                        <h2 id="eam-title" className="eam-title">
                            Edit album
                        </h2>
                    </div>
                    <button type="button" className="eam-close" onClick={onClose} aria-label="Close">
                        <X size={18} strokeWidth={2} />
                    </button>
                </header>

                <form className="eam-body" onSubmit={handleSubmit}>
                    <div className="eam-fields">
                        <div className="eam-field">
                            <label className="eam-label" htmlFor="eam-name">
                                Album name
                            </label>
                            <input
                                id="eam-name"
                                type="text"
                                className="eam-input"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="eam-field">
                            <span className="eam-label">Event date</span>
                            <DatePicker
                                value={eventDate}
                                onChange={setEventDate}
                                placeholder="MM/DD/YYYY"
                            />
                        </div>
                    </div>

                    <div className="eam-advanced">
                        <button
                            type="button"
                            className={`eam-advanced__toggle${showAdvanced ? ' eam-advanced__toggle--open' : ''}`}
                            onClick={() => setShowAdvanced((v) => !v)}
                            aria-expanded={showAdvanced}
                        >
                            <span className="eam-advanced__toggle-left">
                                <Settings2 size={16} strokeWidth={2} />
                                Advanced settings
                            </span>
                            <ChevronDown
                                size={16}
                                strokeWidth={2}
                                className="eam-advanced__chevron"
                                aria-hidden
                            />
                        </button>

                        {showAdvanced ? (
                            <div className="eam-advanced__panel">
                                {advancedLoading ? (
                                    <p className="eam-advanced__loading">Loading settings…</p>
                                ) : (
                                    <>
                                        <section className="eam-section">
                                            <h3 className="eam-section__label">Feedback</h3>
                                            {feedbackLocked ? (
                                                <p className="eam-setting-row__desc eam-setting-row__desc--lock">
                                                    Client approved this album — feedback controls are
                                                    locked.
                                                </p>
                                            ) : null}

                                            <SettingRow
                                                title="Allow comments"
                                                description="Clients can leave feedback on each spread"
                                                control={
                                                    <ModalToggle
                                                        on={allowComments}
                                                        disabled={feedbackLocked}
                                                        onChange={setAllowComments}
                                                        label="Allow comments"
                                                    />
                                                }
                                            />

                                            {allowComments ? (
                                                <div className="eam-nested">
                                                    <SettingRow
                                                        title="Image attachments"
                                                        description="Applies to both comments and swap requests"
                                                        control={
                                                            <ModalToggle
                                                                on={allowExternal}
                                                                disabled={feedbackLocked}
                                                                onChange={setAllowExternal}
                                                                label="Image attachments"
                                                            />
                                                        }
                                                    />
                                                    <SettingRow
                                                        title="Voice notes"
                                                        description="Clients can record voice messages"
                                                        control={
                                                            <ModalToggle
                                                                on={allowVoice}
                                                                disabled={feedbackLocked}
                                                                onChange={setAllowVoice}
                                                                label="Voice notes"
                                                            />
                                                        }
                                                    />
                                                </div>
                                            ) : null}

                                            <SettingRow
                                                title="Allow swap requests"
                                                description="Clients can ask for a photo to be replaced. Unlimited at launch."
                                                control={
                                                    <ModalToggle
                                                        on={allowSwaps}
                                                        disabled={feedbackLocked}
                                                        onChange={setAllowSwaps}
                                                        label="Allow swap requests"
                                                    />
                                                }
                                            />
                                        </section>

                                        <section className="eam-section">
                                            <h3 className="eam-section__label">
                                                Sign-off &amp; automation
                                            </h3>

                                            <SettingRow
                                                title="Approval PIN"
                                                description="Client enters this to sign off the final album"
                                                control={
                                                    <ModalToggle
                                                        on={requireVerification}
                                                        onChange={(next) => {
                                                            setRequireVerification(next);
                                                            if (next && !approvalPin) {
                                                                setApprovalPin(
                                                                    smartAlbumProoferSettingsService.randomPin()
                                                                );
                                                            }
                                                        }}
                                                        label="Approval PIN"
                                                    />
                                                }
                                            />

                                            {requireVerification ? (
                                                <div className="eam-pin">
                                                    <div className="eam-pin__digits" aria-label="Approval PIN">
                                                        {(approvalPin || '----')
                                                            .padEnd(4, '-')
                                                            .slice(0, 4)
                                                            .split('')
                                                            .map((digit, i) => (
                                                                <div key={i} className="eam-pin__digit">
                                                                    {digit}
                                                                </div>
                                                            ))}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="eam-pin__regen"
                                                        onClick={handleRegeneratePin}
                                                    >
                                                        <RefreshCw size={14} strokeWidth={2} />
                                                        Regenerate
                                                    </button>
                                                    <p className="eam-pin__hint">
                                                        A signature, not a key — separate from the
                                                        access PIN in Share.
                                                    </p>
                                                </div>
                                            ) : null}
                                        </section>
                                    </>
                                )}
                            </div>
                        ) : null}
                    </div>

                    <footer className="eam-footer">
                        <button type="button" className="eam-btn eam-btn--ghost" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="eam-btn eam-btn--primary"
                            disabled={saving || !name.trim()}
                        >
                            {saving ? (
                                'Saving…'
                            ) : (
                                <>
                                    <Check size={15} strokeWidth={2.5} aria-hidden />
                                    Save
                                </>
                            )}
                        </button>
                    </footer>
                </form>
            </div>
        </div>,
        document.body
    );
}
