import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Download, Shield, Eye, Edit2, Copy, Trash2, Link, Settings, RefreshCw, Check } from 'lucide-react';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import { smartAlbumProoferSettingsService } from '../../services/smartAlbumProoferSettings.service';
import './AlbumProoferSettingsDrawer.css';

const PRIVACY_OPTIONS = [
    { value: 'public', label: 'Public via link' },
    { value: 'password', label: 'Password Protected' },
];

const DEFAULT_VIEWERS = ['client@example.com', 'collaborator@example.com'];

function CircleOption({ checked, label, onClick }) {
    return (
        <button
            type="button"
            className={`sa-album-settings-drawer__option${checked ? ' sa-album-settings-drawer__option--on' : ''}`}
            onClick={onClick}
        >
            <span className="sa-album-settings-drawer__option-radio" aria-hidden />
            <span className="sa-album-settings-drawer__option-text">{label}</span>
        </button>
    );
}

export default function AlbumProoferSettingsDrawerPanel({
    album,
    photographerId,
    onAlbumUpdated,
    onClose,
    onPreview,
    onQuickEdit,
    onDuplicate,
    onDelete,
    onGetDirectLink,
}) {
    const albumId = album?.id;
    const saveTimerRef = useRef(null);
    const skipSaveRef = useRef(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [accessLevel, setAccessLevel] = useState('public');
    const [albumPassword, setAlbumPassword] = useState('');
    const [privateShareToken, setPrivateShareToken] = useState('');
    const [allowDownloads, setAllowDownloads] = useState(false);
    const [multiUserCollab, setMultiUserCollab] = useState(true);
    const [requireVerification, setRequireVerification] = useState(false);
    const [approvalPin, setApprovalPin] = useState('');
    const [pinCopied, setPinCopied] = useState(false);
    const [activeViewers, setActiveViewers] = useState(DEFAULT_VIEWERS);

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

                const raw = album?.proofer_settings || {};
                setAccessLevel(proofer.accessLevel || 'public');
                setAlbumPassword(proofer.albumPassword || '');
                setPrivateShareToken(proofer.privateShareToken || '');
                setAllowDownloads(false);
                setMultiUserCollab(
                    raw.multi_user_collaboration ??
                        raw.multiUserCollaboration ??
                        defaults.multiUserCollaboration ??
                        true
                );
                const pin = proofer.approvalPin || '';
                setApprovalPin(pin);
                setRequireVerification(Boolean(pin) || defaults.requireApprovalPin);
                const viewers = raw.active_viewers ?? raw.activeViewers;
                setActiveViewers(
                    Array.isArray(viewers) && viewers.length ? viewers : [...DEFAULT_VIEWERS]
                );
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
    }, [photographerId, albumId, album]);

    const handleSave = useCallback(async () => {
        if (!photographerId || !albumId) return;

        setSaving(true);
        try {
            const nextPin = requireVerification
                ? approvalPin || smartAlbumProoferSettingsService.randomPin()
                : '';

            const prooferPatch = {
                accessLevel,
                albumPassword: accessLevel === 'password' ? albumPassword : '',
                privateShareToken:
                    accessLevel === 'private'
                        ? privateShareToken || smartAlbumProoferSettingsService.randomToken()
                        : privateShareToken,
                approvalPin: nextPin,
                allowDownloads: false,
                multiUserCollaboration: multiUserCollab,
                activeViewers,
            };

            if (accessLevel === 'private' && !privateShareToken) {
                setPrivateShareToken(prooferPatch.privateShareToken);
            }
            if (requireVerification && !approvalPin) {
                setApprovalPin(nextPin);
            }

            await smartAlbumProoferSettingsService.saveAlbumSettings(
                photographerId,
                albumId,
                prooferPatch,
                { album }
            );

            const refreshed = await smartAlbumsService.getAlbum(photographerId, albumId);
            if (refreshed) {
                await smartAlbumsService.syncAlbumPreviewProoferSettings(
                    photographerId,
                    albumId,
                    refreshed
                );
                onAlbumUpdated?.(refreshed);
            }
        } catch (err) {
            console.error(err);
            alert('Could not save album settings. Please try again.');
        } finally {
            setSaving(false);
        }
    }, [
        photographerId,
        albumId,
        album,
        accessLevel,
        albumPassword,
        privateShareToken,
        allowDownloads,
        multiUserCollab,
        requireVerification,
        approvalPin,
        activeViewers,
        onAlbumUpdated,
    ]);

    useEffect(() => {
        if (!photographerId || !albumId || loading || skipSaveRef.current) {
            skipSaveRef.current = false;
            return undefined;
        }

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(() => {
            void handleSave();
        }, 700);

        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, [
        accessLevel,
        albumPassword,
        privateShareToken,
        allowDownloads,
        multiUserCollab,
        requireVerification,
        approvalPin,
        activeViewers,
        photographerId,
        albumId,
        loading,
        handleSave,
    ]);

    const revokeViewer = (email) => {
        setActiveViewers((prev) => prev.filter((item) => item !== email));
    };

    const handleCopyPin = async () => {
        try {
            await navigator.clipboard.writeText(approvalPin);
            setPinCopied(true);
            setTimeout(() => setPinCopied(false), 2000);
        } catch (err) {
            console.error(err);
        }
    };

    const handleRegeneratePin = () => {
        const pin = smartAlbumProoferSettingsService.randomPin();
        setApprovalPin(pin);
    };

    if (loading) {
        return <p className="sa-album-settings-drawer__loading">Loading settings…</p>;
    }

    if (!photographerId || !albumId) {
        return (
            <p className="sa-album-settings-drawer__loading">
                Sign in to manage album settings.
            </p>
        );
    }

    return (
        <div className="sa-album-settings-drawer__panel">
            <div className="sa-album-settings-drawer__scroll">
                <section className="sa-album-settings-drawer__section">
                    <div className="sa-album-settings-drawer__section-head">
                        <span className="sa-album-settings-drawer__section-icon">
                            <Shield size={16} strokeWidth={2} />
                        </span>
                        <div>
                            <h3 className="sa-album-settings-drawer__section-title">
                                Project Access &amp; Security
                            </h3>
                            <p className="sa-album-settings-drawer__section-desc">
                                Control who can access this album
                            </p>
                        </div>
                    </div>
                    <label className="sa-album-settings-drawer__field-label" htmlFor="album-privacy">
                        Privacy Level
                    </label>
                    <div className="sa-album-settings-drawer__select-wrap">
                        <select
                            id="album-privacy"
                            className="sa-album-settings-drawer__select"
                            value={accessLevel}
                            onChange={(e) => setAccessLevel(e.target.value)}
                        >
                            {PRIVACY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    {accessLevel === 'password' && (
                        <input
                            type="password"
                            className="sa-album-settings-drawer__select"
                            style={{ marginTop: 10 }}
                            value={albumPassword}
                            onChange={(e) => setAlbumPassword(e.target.value)}
                            placeholder="Album password"
                        />
                    )}
                </section>


                <section className="sa-album-settings-drawer__section">
                    <div className="sa-album-settings-drawer__section-head">
                        <span className="sa-album-settings-drawer__section-icon">
                            <Shield size={16} strokeWidth={2} />
                        </span>
                        <div>
                            <h3 className="sa-album-settings-drawer__section-title">
                                Approval &amp; Digital Verification
                            </h3>
                            <p className="sa-album-settings-drawer__section-desc">
                                Set up secure approval requirements
                            </p>
                        </div>
                    </div>
                    <CircleOption
                        checked={requireVerification}
                        label="Require unique PIN or digital signature for final album approval"
                        onClick={() => {
                            setRequireVerification((v) => {
                                const nextV = !v;
                                if (nextV && !approvalPin) {
                                    setApprovalPin(smartAlbumProoferSettingsService.randomPin());
                                }
                                return nextV;
                            });
                        }}
                    />
                    
                    {requireVerification && (
                        <div className="sa-album-settings-drawer__pin-container">
                            <div className="sa-album-settings-drawer__pin-row">
                                <div className="sa-album-settings-drawer__pin-digits">
                                    {(approvalPin || '----').split('').map((digit, i) => (
                                        <div key={i} className="sa-album-settings-drawer__pin-digit">
                                            {digit}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    className="sa-album-settings-drawer__pin-copy"
                                    onClick={handleCopyPin}
                                    aria-label="Copy PIN"
                                >
                                    {pinCopied ? <Check size={16} /> : <Copy size={16} />}
                                </button>
                            </div>
                            <button
                                type="button"
                                className="sa-album-settings-drawer__regenerate"
                                onClick={handleRegeneratePin}
                            >
                                <RefreshCw size={14} />
                                Regenerate
                            </button>
                        </div>
                    )}
                </section>

                <section className="sa-album-settings-drawer__section">
                    <div className="sa-album-settings-drawer__section-head">
                        <span className="sa-album-settings-drawer__section-icon">
                            <Settings size={16} strokeWidth={2} />
                        </span>
                        <div>
                            <h3 className="sa-album-settings-drawer__section-title">
                                Album Actions
                            </h3>
                            <p className="sa-album-settings-drawer__section-desc">
                                Quick actions to manage or share this album
                            </p>
                        </div>
                    </div>
                    <div className="sa-album-settings-drawer__actions-list">
                        <button type="button" className="sa-album-settings-drawer__action-btn" onClick={onPreview}>
                            <Eye size={16} /> Preview Album
                        </button>
                        <button
                            type="button"
                            className="sa-album-settings-drawer__action-btn"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onQuickEdit?.();
                            }}
                        >
                            <Edit2 size={16} /> Quick Edit Details
                        </button>
                        <button
                            type="button"
                            className="sa-album-settings-drawer__action-btn"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDuplicate?.();
                            }}
                        >
                            <Copy size={16} /> Duplicate Album
                        </button>
                        <button type="button" className="sa-album-settings-drawer__action-btn" onClick={onGetDirectLink}>
                            <Link size={16} /> Get Direct Link
                        </button>
                        <button type="button" className="sa-album-settings-drawer__action-btn sa-album-settings-drawer__action-btn--danger" onClick={onDelete}>
                            <Trash2 size={16} /> Delete Album
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
