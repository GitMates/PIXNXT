import React, { useCallback, useEffect, useState } from 'react';
import { Download, Shield } from 'lucide-react';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import { smartAlbumProoferSettingsService } from '../../services/smartAlbumProoferSettings.service';
import './AlbumProoferSettingsDrawer.css';

const PRIVACY_OPTIONS = [
    { value: 'public', label: 'Public via link' },
    { value: 'password', label: 'Password Protected' },
    { value: 'private', label: 'Restricted to Specific Client Emails' },
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
}) {
    const albumId = album?.id;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [accessLevel, setAccessLevel] = useState('public');
    const [albumPassword, setAlbumPassword] = useState('');
    const [privateShareToken, setPrivateShareToken] = useState('');
    const [allowDownloads, setAllowDownloads] = useState(true);
    const [multiUserCollab, setMultiUserCollab] = useState(true);
    const [requireVerification, setRequireVerification] = useState(false);
    const [approvalPin, setApprovalPin] = useState('');
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
                setAllowDownloads(
                    raw.allow_downloads ?? raw.allowDownloads ?? defaults.allowDownloads ?? true
                );
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
                allowDownloads,
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
            onClose?.();
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
        onClose,
    ]);

    const revokeViewer = (email) => {
        setActiveViewers((prev) => prev.filter((item) => item !== email));
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
                            <Download size={16} strokeWidth={2} />
                        </span>
                        <div>
                            <h3 className="sa-album-settings-drawer__section-title">
                                Client Downloads &amp; Collaboration
                            </h3>
                            <p className="sa-album-settings-drawer__section-desc">
                                Manage client access and permissions
                            </p>
                        </div>
                    </div>
                    <CircleOption
                        checked={allowDownloads}
                        label="Allow clients to download individual spreads or full layouts for this album"
                        onClick={() => setAllowDownloads((v) => !v)}
                    />
                    <CircleOption
                        checked={multiUserCollab}
                        label="Allow multiple client accounts to comment simultaneously"
                        onClick={() => setMultiUserCollab((v) => !v)}
                    />
                    {activeViewers.length > 0 && (
                        <>
                            <p className="sa-album-settings-drawer__viewers-label">
                                Active Client Viewers
                            </p>
                            {activeViewers.map((email) => (
                                <div key={email} className="sa-album-settings-drawer__viewer-row">
                                    <span className="sa-album-settings-drawer__viewer-email">
                                        {email}
                                    </span>
                                    <button
                                        type="button"
                                        className="sa-album-settings-drawer__revoke"
                                        onClick={() => revokeViewer(email)}
                                    >
                                        Revoke Access
                                    </button>
                                </div>
                            ))}
                        </>
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
                        onClick={() => setRequireVerification((v) => !v)}
                    />
                </section>
            </div>
            <div className="sa-album-settings-drawer__footer">
                <button
                    type="button"
                    className="sa-album-settings-drawer__save"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? 'Saving…' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
}
