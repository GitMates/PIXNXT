import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ban, Copy, Mail } from 'lucide-react';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import {
    smartAlbumProoferSettingsService,
    getAlbumShareCopyUrl,
    getAlbumShareDisplayUrl,
} from '../../services/smartAlbumProoferSettings.service';
import { buildGmailComposeUrl } from '../../lib/gmailComposeUrl';
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

const SHARE_CHANNELS = [
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'email', label: 'Email' },
    { id: 'copy', label: 'Copy link' },
];

function getPublishMode(album) {
    if (album?.status !== 'published') return 'draft';
    if (album?.share_link_enabled === false) return 'paused';
    return 'live';
}

function firstNameFromAlbum(album) {
    const raw = String(album?.client_name || album?.name || '').trim();
    if (!raw) return 'there';
    const first = raw.split(/[\s\-–—xX]+/)[0];
    return first || 'there';
}

function buildDefaultShareMessage(album, displayUrl) {
    const name = firstNameFromAlbum(album);
    return `Hi ${name} — your album proof is ready to review.\n${displayUrl}`;
}

function WhatsAppIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
    );
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
    const messageTouchedRef = useRef(false);

    const mode = getPublishMode(album);

    const [ready, setReady] = useState(false);
    const [busy, setBusy] = useState(false);
    const [copied, setCopied] = useState(false);
    const [pauseConfirm, setPauseConfirm] = useState(false);
    const [shareChannel, setShareChannel] = useState('whatsapp');
    const [shareMessage, setShareMessage] = useState('');

    const [accessLevel, setAccessLevel] = useState('public');
    const [albumPassword, setAlbumPassword] = useState('');
    const [privateShareToken, setPrivateShareToken] = useState('');

    const shareDisplayUrl = useMemo(
        () => getAlbumShareDisplayUrl(album, { accessLevel, privateShareToken }),
        [album, accessLevel, privateShareToken]
    );
    const shareCopyUrl = useMemo(
        () => getAlbumShareCopyUrl(album, { accessLevel, privateShareToken }),
        [album, accessLevel, privateShareToken]
    );

    useEffect(() => {
        if (!open) {
            setPauseConfirm(false);
            return undefined;
        }
        if (!photographerId || !albumId) {
            setReady(true);
            return undefined;
        }

        const alreadyLoaded = loadedAlbumIdRef.current === albumId;
        if (!alreadyLoaded) {
            setReady(false);
            messageTouchedRef.current = false;
            setShareChannel('whatsapp');
        }

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
                const nextLevel = level === 'private' ? 'public' : level;
                setAccessLevel(nextLevel);
                setAlbumPassword(proofer.albumPassword || '');
                setPrivateShareToken(proofer.privateShareToken || '');

                if (!messageTouchedRef.current) {
                    const url = getAlbumShareDisplayUrl(album, {
                        accessLevel: nextLevel,
                        privateShareToken: proofer.privateShareToken || '',
                    });
                    setShareMessage(buildDefaultShareMessage(album, url));
                }

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, photographerId, albumId]);

    useEffect(() => {
        if (!open || messageTouchedRef.current || !shareDisplayUrl) return;
        setShareMessage(buildDefaultShareMessage(album, shareDisplayUrl));
    }, [open, album, shareDisplayUrl]);

    useEffect(() => {
        if (!open) return undefined;
        const onPointer = (e) => {
            if (e.target.closest?.('.ae-share-wrap')) return;
            if (e.target.closest?.('.ae-settings-select-options')) return;
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
            };

            await smartAlbumProoferSettingsService.saveAlbumSettings(
                photographerId,
                albumId,
                prooferPatch,
                { album }
            );
            const refreshed = await smartAlbumsService.getAlbum(photographerId, albumId);
            const merged = refreshed || album;
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
    }, [open, ready, accessLevel, albumPassword, persistSettings]);

    const accessHint =
        ACCESS_OPTIONS.find((o) => o.value === accessLevel)?.description ||
        'Anyone holding this URL can view and leave feedback.';

    const channelHint =
        shareChannel === 'whatsapp'
            ? 'Opens WhatsApp with this message ready to send. You send it — nothing goes out automatically.'
            : shareChannel === 'email'
              ? 'Opens your email with this message ready to send. You send it — nothing goes out automatically.'
              : 'Copies the client link to your clipboard.';

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareCopyUrl);
            setCopied(true);
            showToast?.('Link copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error(err);
            showToast?.('Could not copy link.', { variant: 'error', duration: 3500 });
        }
    };

    const runShareChannel = (channelId) => {
        const text =
            (shareMessage || '').trim() || buildDefaultShareMessage(album, shareDisplayUrl);
        if (channelId === 'whatsapp') {
            window.open(
                `https://wa.me/?text=${encodeURIComponent(text)}`,
                '_blank',
                'noopener,noreferrer'
            );
            return;
        }
        if (channelId === 'email') {
            window.open(
                buildGmailComposeUrl(text, {
                    subject: `${album?.name || 'Album'} proof`,
                }),
                '_blank',
                'noopener,noreferrer'
            );
            return;
        }
        void handleCopyLink();
    };

    const handlePublishAndShare = async () => {
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
            showToast?.('Album published. Choose how to send the link.', {
                variant: 'success',
                duration: 3500,
            });
            // Stay open — mode flips to live and shows the published Share panel.
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
    const showLoading = !ready && loadedAlbumIdRef.current !== albumId;

    const liveShareBody = (
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

            <div className="ae-share-divider" />

            <p className="ae-share-section-label">Who can open it</p>
            <AeSettingsSelect
                id="ae-share-access-live"
                value={accessLevel}
                onChange={setAccessLevel}
                options={ACCESS_OPTIONS}
            />
            <p className="ae-share-hint ae-share-hint--serif">{accessHint}</p>
            {accessLevel === 'password' ? (
                <input
                    type="password"
                    className="ae-share-input"
                    value={albumPassword}
                    onChange={(e) => setAlbumPassword(e.target.value)}
                    placeholder="Set album password"
                />
            ) : null}

            <div className="ae-share-divider" />

            <p className="ae-share-section-label">Send to client</p>
            <div className="ae-share-channels" role="tablist" aria-label="Share method">
                {SHARE_CHANNELS.map((channel) => {
                    const active = shareChannel === channel.id;
                    return (
                        <button
                            key={channel.id}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            className={`ae-share-channel${
                                active ? ' ae-share-channel--active' : ''
                            }${active && channel.id === 'whatsapp' ? ' ae-share-channel--wa' : ''}`}
                            onClick={() => {
                                if (shareChannel === channel.id) {
                                    runShareChannel(channel.id);
                                    return;
                                }
                                setShareChannel(channel.id);
                            }}
                        >
                            <span className="ae-share-channel__icon" aria-hidden>
                                {channel.id === 'whatsapp' ? (
                                    <WhatsAppIcon />
                                ) : channel.id === 'email' ? (
                                    <Mail size={15} strokeWidth={2} />
                                ) : (
                                    <Copy size={15} strokeWidth={2} />
                                )}
                            </span>
                            <span>{channel.label}</span>
                        </button>
                    );
                })}
            </div>

            <textarea
                className="ae-share-message"
                value={shareMessage}
                onChange={(e) => {
                    messageTouchedRef.current = true;
                    setShareMessage(e.target.value);
                }}
                rows={4}
                aria-label="Share message"
            />
            <p className="ae-share-hint ae-share-hint--serif">{channelHint}</p>

            <button
                type="button"
                className="ae-share-btn ae-share-btn--outline"
                onClick={() => setPauseConfirm(true)}
            >
                Pause client access…
            </button>
        </>
    );

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
                            onClick={() => void handlePublishAndShare()}
                            disabled={busy}
                        >
                            Publish &amp; share…
                        </button>
                        <p className="ae-share-footnote">
                            Publishing creates the client link. Nothing is sent until you choose a
                            channel.
                        </p>
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
                    liveShareBody
                )}
            </div>
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
