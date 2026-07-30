import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ban } from 'lucide-react';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import {
    smartAlbumProoferSettingsService,
    getAlbumShareCopyUrl,
    getAlbumShareDisplayUrl,
} from '../../services/smartAlbumProoferSettings.service';
import AeSettingsSelect from './AeSettingsSelect';
import './AlbumEditorSettings.css';
import './AlbumSharePublishMenu.css';

const ACCESS_OPTIONS = [
    {
        value: 'public',
        label: 'Anyone with the link',
        description: 'Anyone holding this URL can view and leave feedback.',
    },
    {
        value: 'password',
        label: 'Password protected',
        description: 'Clients must enter a password before viewing.',
    },
];

function ShareToggle({ on, onChange, label }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={label}
            onClick={onChange}
            className={`ae-share-toggle ${on ? 'ae-share-toggle--on' : 'ae-share-toggle--off'}`}
        >
            <span className="ae-share-toggle__knob" />
        </button>
    );
}

function getPublishMode(album) {
    if (album?.status !== 'published') return 'draft';
    if (album?.share_link_enabled === false) return 'paused';
    return 'live';
}

export default function AlbumSharePublishMenu({
    open,
    onOpenChange,
    album,
    photographerId,
    onAlbumUpdated,
    showToast,
}) {
    const albumId = album?.id;
    const rootRef = useRef(null);
    const saveTimerRef = useRef(null);
    const skipSaveRef = useRef(true);
    const loadedAlbumIdRef = useRef(null);

    const mode = getPublishMode(album);

    const [ready, setReady] = useState(false);
    const [busy, setBusy] = useState(false);
    const [copied, setCopied] = useState(false);
    const [pauseConfirm, setPauseConfirm] = useState(false);

    const [accessLevel, setAccessLevel] = useState('public');
    const [albumPassword, setAlbumPassword] = useState('');
    const [privateShareToken, setPrivateShareToken] = useState('');
    const [requireName, setRequireName] = useState(true);
    const [allowVoice, setAllowVoice] = useState(true);
    const [allowExternal, setAllowExternal] = useState(false);
    const [allowSwaps, setAllowSwaps] = useState(true);
    const [maxSwaps, setMaxSwaps] = useState(1000);

    useEffect(() => {
        if (!open) {
            setPauseConfirm(false);
            return undefined;
        }
        if (!photographerId || !albumId) {
            setReady(true);
            return undefined;
        }

        // Keep showing the last settings while reopening the same album — no Loading flash.
        const alreadyLoaded = loadedAlbumIdRef.current === albumId;
        if (!alreadyLoaded) setReady(false);

        let cancelled = false;
        (async () => {
            try {
                const proofer = await smartAlbumProoferSettingsService.loadAlbumSettings(
                    photographerId,
                    albumId,
                    album
                );
                if (cancelled) return;

                const level =
                    proofer.accessLevel === 'password' || proofer.accessLevel === 'private'
                        ? proofer.accessLevel
                        : 'public';
                setAccessLevel(level === 'private' ? 'public' : level);
                setAlbumPassword(proofer.albumPassword || '');
                setPrivateShareToken(proofer.privateShareToken || '');
                setRequireName(proofer.requireNameForComments !== false);
                setAllowVoice(proofer.allowVoiceRecordings !== false);
                setAllowExternal(Boolean(proofer.allowExternalUploads));
                setAllowSwaps(album?.messages_enabled !== false);
                setMaxSwaps(proofer.maxFreeSwaps ?? 1000);
                loadedAlbumIdRef.current = albumId;
                skipSaveRef.current = true;
            } catch (err) {
                console.error(err);
            } finally {
                if (!cancelled) setReady(true);
            }
        })();

        return () => {
            cancelled = true;
        };
        // Intentionally omit `album` — album updates after pause/publish must not re-trigger Loading.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, photographerId, albumId]);

    useEffect(() => {
        if (!open) return undefined;
        const onPointer = (e) => {
            if (e.target.closest?.('.ae-share-wrap')) return;
            onOpenChange(false);
            setPauseConfirm(false);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') {
                if (pauseConfirm) setPauseConfirm(false);
                else onOpenChange(false);
            }
        };
        document.addEventListener('mousedown', onPointer);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onPointer);
            document.removeEventListener('keydown', onKey);
        };
    }, [open, onOpenChange, pauseConfirm]);

    const persistSettings = useCallback(async () => {
        if (!photographerId || !albumId) return;
        try {
            const prooferPatch = {
                accessLevel,
                albumPassword: accessLevel === 'password' ? albumPassword : '',
                privateShareToken,
                requireNameForComments: requireName,
                maxFreeSwaps: maxSwaps,
                allowExternalUploads: allowExternal,
                allowVoiceRecordings: allowVoice,
            };
            const clientPatch = {
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
            onAlbumUpdated?.(merged);
        } catch (err) {
            console.error(err);
            showToast?.('Could not save share settings.', { variant: 'error', duration: 3500 });
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
        allowSwaps,
        onAlbumUpdated,
        showToast,
    ]);

    useEffect(() => {
        if (!open || !ready || skipSaveRef.current) {
            skipSaveRef.current = false;
            return undefined;
        }
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(() => {
            void persistSettings();
        }, 600);
        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, [
        open,
        ready,
        accessLevel,
        albumPassword,
        requireName,
        allowVoice,
        allowExternal,
        allowSwaps,
        maxSwaps,
        persistSettings,
    ]);

    const shareDisplayUrl = useMemo(
        () => getAlbumShareDisplayUrl(album, { accessLevel, privateShareToken }),
        [album, accessLevel, privateShareToken]
    );

    const accessHint =
        ACCESS_OPTIONS.find((o) => o.value === accessLevel)?.description ||
        'Anyone holding this URL can view and leave feedback.';

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(
                getAlbumShareCopyUrl(album, { accessLevel, privateShareToken })
            );
            setCopied(true);
            showToast?.('Link copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error(err);
            showToast?.('Could not copy link.', { variant: 'error', duration: 3500 });
        }
    };

    const handlePublishAndCopy = async () => {
        if (!photographerId || !albumId || busy) return;
        setBusy(true);
        try {
            await persistSettings();
            const updated = await smartAlbumsService.updateAlbumClientSettings(
                photographerId,
                albumId,
                { status: 'published', share_link_enabled: true }
            );
            onAlbumUpdated?.(updated);
            await navigator.clipboard.writeText(
                getAlbumShareCopyUrl(updated || album, { accessLevel, privateShareToken })
            );
            setCopied(true);
            showToast?.('Album published — link copied.', {
                variant: 'success',
                duration: 3500,
            });
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error(err);
            showToast?.('Could not publish album.', { variant: 'error', duration: 4000 });
        } finally {
            setBusy(false);
        }
    };

    const handlePause = async () => {
        if (!photographerId || !albumId || busy) return;
        setBusy(true);
        try {
            const updated = await smartAlbumsService.updateAlbumClientSettings(
                photographerId,
                albumId,
                { share_link_enabled: false }
            );
            onAlbumUpdated?.(updated);
            setPauseConfirm(false);
            showToast?.('Client access paused.', { duration: 3500 });
        } catch (err) {
            console.error(err);
            showToast?.('Could not pause access.', { variant: 'error', duration: 4000 });
        } finally {
            setBusy(false);
        }
    };

    const handleResume = async () => {
        if (!photographerId || !albumId || busy) return;
        setBusy(true);
        try {
            const updated = await smartAlbumsService.updateAlbumClientSettings(
                photographerId,
                albumId,
                { share_link_enabled: true, status: 'published' }
            );
            onAlbumUpdated?.(updated);
            showToast?.('Client access resumed.', { variant: 'success', duration: 3500 });
        } catch (err) {
            console.error(err);
            showToast?.('Could not resume access.', { variant: 'error', duration: 4000 });
        } finally {
            setBusy(false);
        }
    };

    if (!open) return null;

    const clientName = album?.name || 'Your client';
    // Never blank the panel for a reload — only the first open of an album can show Loading.
    const showLoading = !ready && loadedAlbumIdRef.current !== albumId;

    return (
        <div className="ae-share-panel-wrap" ref={rootRef}>
            <div
                className={`ae-share-panel${pauseConfirm ? ' ae-share-panel--confirm' : ''}`}
                role="dialog"
                aria-label="Share and publish"
            >
                {pauseConfirm ? (
                    <div className="ae-share-pause-confirm">
                        <p className="ae-share-section-label">Pause client access</p>
                        <div className="ae-share-pause-warn">
                            <p>
                                {clientName} may already be reviewing this album. Pausing locks them
                                out immediately — the link will show &ldquo;temporarily
                                unavailable&rdquo; with no explanation.
                            </p>
                        </div>
                        <p className="ae-share-pause-keep">
                            Comments and swap requests are kept. The same link works again when you
                            resume.
                        </p>
                        <div className="ae-share-pause-actions">
                            <button
                                type="button"
                                className="ae-share-btn ae-share-btn--ghost"
                                onClick={() => setPauseConfirm(false)}
                                disabled={busy}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="ae-share-btn ae-share-btn--danger"
                                onClick={() => void handlePause()}
                                disabled={busy}
                            >
                                Pause access
                            </button>
                        </div>
                    </div>
                ) : showLoading ? (
                    <p className="ae-share-loading">Loading…</p>
                ) : mode === 'draft' ? (
                    <>
                        <div className="ae-share-draft-hero">
                            <div className="ae-share-draft-icon" aria-hidden>
                                <Ban size={22} strokeWidth={1.75} />
                            </div>
                            <p className="ae-share-draft-title">
                                This album is a <strong>Draft</strong>.
                            </p>
                            <p className="ae-share-draft-sub">Your client has never seen it.</p>
                        </div>

                        <div className="ae-share-divider" />

                        <p className="ae-share-section-label">Who should be able to open it</p>
                        <AeSettingsSelect
                            id="ae-share-access-draft"
                            value={accessLevel}
                            onChange={setAccessLevel}
                            options={ACCESS_OPTIONS}
                        />
                        {accessLevel === 'password' ? (
                            <input
                                type="password"
                                className="ae-share-input"
                                value={albumPassword}
                                onChange={(e) => setAlbumPassword(e.target.value)}
                                placeholder="Set album password"
                            />
                        ) : null}

                        <button
                            type="button"
                            className="ae-share-btn ae-share-btn--primary"
                            onClick={() => void handlePublishAndCopy()}
                            disabled={busy}
                        >
                            Publish &amp; copy link
                        </button>
                        <p className="ae-share-footnote">
                            Publishing creates the client link. Nothing is sent automatically.
                        </p>

                        <div className="ae-share-divider" />

                        <ShareToggleRow
                            title="Require name"
                            desc="Identify who is leaving feedback"
                            on={requireName}
                            onChange={() => setRequireName((v) => !v)}
                        />
                        <ShareToggleRow
                            title="Voice notes"
                            desc="Clients can record voice messages"
                            on={allowVoice}
                            onChange={() => setAllowVoice((v) => !v)}
                        />
                        <ShareToggleRow
                            title="Image attachments"
                            desc="Clients can attach reference images"
                            on={allowExternal}
                            onChange={() => setAllowExternal((v) => !v)}
                        />
                        <ShareToggleRow
                            title="Allow swaps"
                            desc="Clients can place swap requests on photos"
                            on={allowSwaps}
                            onChange={() => setAllowSwaps((v) => !v)}
                        />
                        {allowSwaps ? (
                            <div className="ae-share-nested">
                                <div className="ae-share-nested__row">
                                    <span className="ae-share-nested__label">Free swaps included</span>
                                    <input
                                        type="number"
                                        min="0"
                                        className="ae-share-swaps-input"
                                        value={maxSwaps}
                                        onChange={(e) =>
                                            setMaxSwaps(
                                                Math.max(0, parseInt(e.target.value, 10) || 0)
                                            )
                                        }
                                    />
                                </div>
                            </div>
                        ) : null}
                    </>
                ) : mode === 'paused' ? (
                    <>
                        <p className="ae-share-section-label">Client link</p>
                        <div className="ae-share-link-row">
                            <input type="text" readOnly value={shareDisplayUrl} />
                            <button
                                type="button"
                                className="ae-share-copy-inline"
                                onClick={() => void handleCopyLink()}
                            >
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                        <div className="ae-share-paused-banner">
                            Access is paused. Anyone opening this link sees &ldquo;This album is
                            temporarily unavailable.&rdquo;
                        </div>
                        <button
                            type="button"
                            className="ae-share-btn ae-share-btn--primary"
                            onClick={() => void handleResume()}
                            disabled={busy}
                        >
                            Resume client access
                        </button>
                    </>
                ) : (
                    <>
                        <p className="ae-share-section-label">Client link</p>
                        <div className="ae-share-link-row">
                            <input type="text" readOnly value={shareDisplayUrl} />
                            <button
                                type="button"
                                className="ae-share-copy-inline"
                                onClick={() => void handleCopyLink()}
                            >
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                        <button
                            type="button"
                            className="ae-share-btn ae-share-btn--primary"
                            onClick={() => void handleCopyLink()}
                        >
                            {copied ? 'Copied' : 'Copy link'}
                        </button>

                        <p className="ae-share-section-label ae-share-section-label--spaced">
                            Who can open it
                        </p>
                        <AeSettingsSelect
                            id="ae-share-access-live"
                            value={accessLevel}
                            onChange={setAccessLevel}
                            options={ACCESS_OPTIONS}
                        />
                        <p className="ae-share-hint">{accessHint}</p>
                        {accessLevel === 'password' ? (
                            <input
                                type="password"
                                className="ae-share-input"
                                value={albumPassword}
                                onChange={(e) => setAlbumPassword(e.target.value)}
                                placeholder="Set album password"
                            />
                        ) : null}

                        <button
                            type="button"
                            className="ae-share-btn ae-share-btn--outline"
                            onClick={() => setPauseConfirm(true)}
                        >
                            Pause client access…
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

function ShareToggleRow({ title, desc, on, onChange }) {
    return (
        <div className="ae-share-row">
            <div className="ae-share-row__text">
                <p className="ae-share-row__title">{title}</p>
                <p className="ae-share-row__desc">{desc}</p>
            </div>
            <ShareToggle on={on} onChange={onChange} label={title} />
        </div>
    );
}

export function AlbumPublishStatusBadge({ album, onPublish, publishBusy }) {
    const mode = getPublishMode(album);

    if (mode === 'draft') {
        return (
            <div className="ae-publish-status">
                <div className="ae-publish-seg" role="group" aria-label="Publish status">
                    <span className="ae-publish-seg__btn ae-publish-seg__btn--active">Draft</span>
                    <button
                        type="button"
                        className="ae-publish-seg__btn"
                        disabled={publishBusy}
                        onClick={onPublish}
                    >
                        Published
                    </button>
                </div>
                <span className="ae-publish-status__hint">Client cannot open this album.</span>
            </div>
        );
    }

    if (mode === 'paused') {
        return (
            <div className="ae-publish-status">
                <span className="ae-publish-badge ae-publish-badge--paused">
                    <span className="ae-publish-badge__dot" aria-hidden />
                    Paused
                </span>
                <span className="ae-publish-status__hint">Client cannot open this album.</span>
            </div>
        );
    }

    return (
        <div className="ae-publish-status">
            <span className="ae-publish-badge ae-publish-badge--live">
                <span className="ae-publish-badge__dot" aria-hidden />
                Published
            </span>
        </div>
    );
}
