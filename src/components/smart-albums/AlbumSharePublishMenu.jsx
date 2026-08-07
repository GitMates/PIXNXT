import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ban, Copy, Eye, EyeOff, Mail } from 'lucide-react';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import { galleryService } from '../../services/gallery.service';
import {
    smartAlbumProoferSettingsService,
    getAlbumShareCopyUrl,
    getAlbumShareDisplayUrl,
    notifyAlbumProoferSettingsChanged,
} from '../../services/smartAlbumProoferSettings.service';
import { countClientRootComments, getClientReviewerIdentity, smartAlbumCommentsService } from '../../services/smartAlbumComments.service';
import { mergeAlbumProofTimestamps } from './albumProofStatus';
import { buildGmailComposeUrl } from '../../lib/gmailComposeUrl';
import { readSharePausedAt, writeSharePausedAt } from '../../lib/albumSharePause';
import { formatRelativeTime } from '../../lib/relativeTime';
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

const DRAFT_ACCESS_OPTIONS = [
    {
        value: 'public',
        label: 'Anyone with the link',
        description: 'No PIN. Easiest for the client.',
    },
    {
        value: 'password',
        label: 'Link + PIN',
        description: 'A 4-digit code, sent in the same message.',
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

function clientDisplayFirstName(identity) {
    const raw = String(identity?.name || '').trim();
    if (!raw) return 'client';
    const first = raw.split(/\s+/)[0];
    return first || 'client';
}

function formatShareRelativeTime(dateStr) {
    return formatRelativeTime(dateStr, { style: 'long' }).replace(/^Just now$/, 'just now');
}

function getPauseClientCopy(album, identity = null) {
    const resolved =
        identity ||
        (album?.id
            ? getClientReviewerIdentity(album.id)
            : { name: '', commentCount: 0, openedAt: null });
    const displayName = clientDisplayFirstName(resolved);
    const summaryCount = Number(album?.__proofSummary?.clientCommentCount) || 0;
    const localCount = album?.id ? countClientRootComments(album.id) : 0;
    const commentCount = Math.max(
        Number(resolved.commentCount) || 0,
        summaryCount,
        localCount
    );
    const openedAt =
        album?.client_commenting_started_at ||
        resolved.openedAt ||
        album?.client_last_activity_at ||
        album?.__proofSummary?.latestClientActivityAt ||
        null;
    const openedRel = formatShareRelativeTime(openedAt);

    if (openedRel && commentCount > 0) {
        return {
            lead: `${displayName} opened this album ${openedRel} and left ${commentCount} comment${
                commentCount === 1 ? '' : 's'
            }.`,
            rest: ' Pausing locks them out immediately — the link will show “temporarily unavailable” with no explanation.',
            keep: 'Their comments and swap requests are kept. The same link works again when you resume.',
        };
    }

    if (openedRel) {
        return {
            lead: `${displayName} opened this album ${openedRel}.`,
            rest: ' Pausing locks them out immediately — the link will show “temporarily unavailable” with no explanation.',
            keep: 'Their comments and swap requests are kept. The same link works again when you resume.',
        };
    }

    if (commentCount > 0) {
        return {
            lead: `${displayName} left ${commentCount} comment${commentCount === 1 ? '' : 's'} on this album.`,
            rest: ' Pausing locks them out immediately — the link will show “temporarily unavailable” with no explanation.',
            keep: 'Their comments and swap requests are kept. The same link works again when you resume.',
        };
    }

    return {
        lead: `${displayName} may already be reviewing this album.`,
        rest: ' Pausing locks them out immediately — the link will show “temporarily unavailable” with no explanation.',
        keep: 'Comments and swap requests are kept. The same link works again when you resume.',
    };
}

function buildDefaultShareMessage(album, displayUrl, { pin = '', maxFreeSwaps = 5 } = {}) {
    const name = firstNameFromAlbum(album);
    const lines = [`Hi ${name} — your album proof is ready to review.`, '', String(displayUrl || '').trim()];

    const pinText = String(pin || '').trim();
    if (pinText) {
        lines.push(`Access PIN: ${pinText}`);
    }

    lines.push('');
    const swaps = Number(maxFreeSwaps);
    if (Number.isFinite(swaps) && swaps > 0) {
        lines.push(
            `Tap any spread to comment or ask for a photo swap.`
        );
    } else {
        lines.push('Tap any spread to comment or ask for a photo swap.');
    }

    return lines.join('\n');
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
    const dirtyRef = useRef(false);
    const loadedAlbumIdRef = useRef(null);
    const messageTouchedRef = useRef(false);
    const accessLevelRef = useRef('public');
    const albumPasswordRef = useRef('');
    const privateShareTokenRef = useRef('');

    const mode = getPublishMode(album);

    const [ready, setReady] = useState(false);
    const [busy, setBusy] = useState(false);
    const [copied, setCopied] = useState(false);
    const [pauseConfirm, setPauseConfirm] = useState(false);
    const [shareChannel, setShareChannel] = useState('whatsapp');
    const [shareMessage, setShareMessage] = useState('');
    const [maxFreeSwaps, setMaxFreeSwaps] = useState(5);
    const [clientIdentity, setClientIdentity] = useState({
        name: '',
        commentCount: 0,
        openedAt: null,
    });
    const messageRef = useRef(null);

    const [accessLevel, setAccessLevel] = useState('public');
    const [albumPassword, setAlbumPassword] = useState('');
    const [showAlbumPassword, setShowAlbumPassword] = useState(false);
    const [privateShareToken, setPrivateShareToken] = useState('');
    const [photographerProfile, setPhotographerProfile] = useState(null);

    accessLevelRef.current = accessLevel;
    albumPasswordRef.current = albumPassword;
    privateShareTokenRef.current = privateShareToken;

    const shareDisplayUrl = useMemo(
        () =>
            getAlbumShareDisplayUrl(
                album,
                { accessLevel, privateShareToken },
                photographerProfile
            ),
        [album, accessLevel, privateShareToken, photographerProfile]
    );
    const shareCopyUrl = useMemo(
        () =>
            getAlbumShareCopyUrl(
                album,
                { accessLevel, privateShareToken },
                photographerProfile
            ),
        [album, accessLevel, privateShareToken, photographerProfile]
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
        let profileForShare = null;
        (async () => {
            try {
                // Always read from DB/cache — do not trust a possibly stale album prop.
                const [proofer, comments, profile] = await Promise.all([
                    smartAlbumProoferSettingsService.loadAlbumSettings(
                        photographerId,
                        albumId,
                        null
                    ),
                    smartAlbumCommentsService.listAlbumComments(albumId).catch(() => []),
                    galleryService.getPhotographerProfile(photographerId).catch(() => null),
                ]);
                if (cancelled) return;

                profileForShare = profile || null;
                setPhotographerProfile(profileForShare);
                setClientIdentity(getClientReviewerIdentity(albumId, comments));

                const level =
                    proofer.accessLevel === 'password' || proofer.accessLevel === 'private'
                        ? proofer.accessLevel
                        : 'public';
                const nextLevel = level === 'private' ? 'public' : level;
                setAccessLevel(nextLevel);
                setAlbumPassword(proofer.albumPassword || '');
                setPrivateShareToken(proofer.privateShareToken || '');
                setMaxFreeSwaps(
                    Number.isFinite(Number(proofer.maxFreeSwaps))
                        ? Number(proofer.maxFreeSwaps)
                        : 5
                );

                if (!messageTouchedRef.current) {
                    const url = getAlbumShareDisplayUrl(
                        album,
                        {
                            accessLevel: nextLevel,
                            privateShareToken: proofer.privateShareToken || '',
                        },
                        profileForShare
                    );
                    const pin =
                        nextLevel === 'password' ? String(proofer.albumPassword || '').trim() : '';
                    setShareMessage(
                        buildDefaultShareMessage(album, url, {
                            pin,
                            maxFreeSwaps: proofer.maxFreeSwaps,
                        })
                    );
                }

                loadedAlbumIdRef.current = albumId;
                dirtyRef.current = false;
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
        const pin = accessLevel === 'password' ? String(albumPassword || '').trim() : '';
        setShareMessage(
            buildDefaultShareMessage(album, shareDisplayUrl, { pin, maxFreeSwaps })
        );
    }, [open, album, shareDisplayUrl, accessLevel, albumPassword, maxFreeSwaps]);

    useEffect(() => {
        if (!open) return;
        const el = messageRef.current;
        if (!el) return;
        // Reset to default height when the panel opens so the resize grip is available.
        el.style.height = '';
    }, [open, ready]);

    const persistSettings = useCallback(async () => {
        if (!photographerId || !albumId) return false;
        const nextAccess = accessLevelRef.current;
        const nextPassword = albumPasswordRef.current;
        const nextToken = privateShareTokenRef.current;
        try {
            const prooferPatch = {
                accessLevel: nextAccess,
                albumPassword: nextAccess === 'password' ? nextPassword : '',
                privateShareToken: nextToken,
            };

            await smartAlbumProoferSettingsService.saveAlbumSettings(
                photographerId,
                albumId,
                prooferPatch,
                { album: null }
            );
            const refreshed = await smartAlbumsService.getAlbum(photographerId, albumId);
            const merged = refreshed || {
                ...album,
                proofer_settings: {
                    ...(album?.proofer_settings || {}),
                    access_level: nextAccess,
                    album_password: nextAccess === 'password' ? nextPassword : '',
                    private_share_token: nextToken,
                },
            };
            await smartAlbumsService.syncAlbumPreviewProoferSettings(
                photographerId,
                albumId,
                merged
            );
            dirtyRef.current = false;
            onAlbumUpdated?.(merged);
            return true;
        } catch (err) {
            console.error(err);
            showToast?.('Could not save share settings.', { variant: 'error', duration: 3500 });
            return false;
        }
    }, [photographerId, albumId, album, onAlbumUpdated, showToast]);

    const flushPersist = useCallback(async () => {
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
        }
        if (!dirtyRef.current) return true;
        return persistSettings();
    }, [persistSettings]);

    const closePanel = useCallback(async () => {
        await flushPersist();
        onOpenChange(false);
        setPauseConfirm(false);
    }, [flushPersist, onOpenChange]);

    // If the parent closes the menu without closePanel(), still flush pending edits.
    useEffect(() => {
        if (open) return undefined;
        if (!dirtyRef.current) return undefined;
        void flushPersist();
        return undefined;
    }, [open, flushPersist]);

    useEffect(() => {
        if (!open) return undefined;
        const onPointer = (e) => {
            if (e.target.closest?.('.ae-share-wrap')) return;
            if (e.target.closest?.('.ae-settings-select-options')) return;
            void closePanel();
        };
        const onKey = (e) => {
            if (e.key === 'Escape') {
                if (pauseConfirm) setPauseConfirm(false);
                else void closePanel();
            }
        };
        document.addEventListener('mousedown', onPointer);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onPointer);
            document.removeEventListener('keydown', onKey);
        };
    }, [open, closePanel, pauseConfirm]);

    useEffect(() => {
        if (!open || !ready || skipSaveRef.current) {
            if (skipSaveRef.current && ready) skipSaveRef.current = false;
            return undefined;
        }
        // Only debounce-save when the user actually changed settings.
        if (!dirtyRef.current) return undefined;

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(() => {
            saveTimerRef.current = null;
            void persistSettings();
        }, 400);
        return () => {
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
                saveTimerRef.current = null;
            }
        };
    }, [open, ready, accessLevel, albumPassword, persistSettings]);

    const handleAccessChange = (nextLevel) => {
        dirtyRef.current = true;
        skipSaveRef.current = false;
        accessLevelRef.current = nextLevel;
        setAccessLevel(nextLevel);
        // Persist access mode immediately so "Password protected" sticks even before typing.
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
        }
        void persistSettings();
    };

    const handlePasswordChange = (value) => {
        dirtyRef.current = true;
        skipSaveRef.current = false;
        albumPasswordRef.current = value;
        setAlbumPassword(value);
    };

    const handlePasswordKeyDown = (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        event.stopPropagation();
        const input = event.currentTarget;
        void (async () => {
            const ok = await flushPersist();
            // Move focus out of the password field after save.
            input?.blur();
            if (ok) {
                showToast?.('Share settings saved.', { variant: 'success', duration: 2500 });
            }
        })();
    };

    const handlePasswordBlur = () => {
        if (dirtyRef.current) void flushPersist();
    };

    const accessHint =
        ACCESS_OPTIONS.find((o) => o.value === accessLevel)?.description ||
        'Anyone holding this URL can view and leave feedback.';

    const channelHint =
        shareChannel === 'whatsapp' ? (
            <>
                Opens WhatsApp with this ready to send.{' '}
                <strong>You</strong> press send — nothing goes out automatically.
            </>
        ) : shareChannel === 'email' ? (
            <>
                Opens your email with this ready to send.{' '}
                <strong>You</strong> press send — nothing goes out automatically.
            </>
        ) : (
            'Copies the client link to your clipboard.'
        );

    const handleCopyLink = async () => {
        await flushPersist();
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
        void flushPersist();
        const pin = accessLevel === 'password' ? String(albumPassword || '').trim() : '';
        const text =
            (shareMessage || '').trim() ||
            buildDefaultShareMessage(album, shareDisplayUrl, { pin, maxFreeSwaps });
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
            dirtyRef.current = true;
            await flushPersist();
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
            const pausedAt = new Date().toISOString();
            const updated = await smartAlbumsService.updateAlbumClientSettings(
                photographerId,
                albumId,
                { share_link_enabled: false, share_link_paused_at: pausedAt }
            );
            writeSharePausedAt(albumId, pausedAt);
            onAlbumUpdated?.({ ...updated, share_link_paused_at: pausedAt });
            notifyAlbumProoferSettingsChanged(albumId);
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
                { share_link_enabled: true, status: 'published', share_link_paused_at: null }
            );
            writeSharePausedAt(albumId, null);
            onAlbumUpdated?.({ ...updated, share_link_paused_at: null });
            notifyAlbumProoferSettingsChanged(albumId);
            showToast?.('Client access resumed.', { variant: 'success', duration: 3500 });
        } catch (err) {
            console.error(err);
            showToast?.('Could not resume access.', { variant: 'error', duration: 4000 });
        } finally {
            setBusy(false);
        }
    };

    if (!open) return null;

    const proofAlbum = mergeAlbumProofTimestamps(album);
    const pauseCopy = getPauseClientCopy(proofAlbum, clientIdentity);
    const pausedAtIso =
        album?.share_link_paused_at || readSharePausedAt(albumId) || null;
    const pausedRel = formatShareRelativeTime(pausedAtIso);
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
                onChange={handleAccessChange}
                options={ACCESS_OPTIONS}
            />
            <p className="ae-share-hint ae-share-hint--serif">{accessHint}</p>
            {accessLevel === 'password' ? (
                <div className="ae-share-password-field">
                    <input
                        type={showAlbumPassword ? 'text' : 'password'}
                        className="ae-share-input"
                        value={albumPassword}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        onKeyDown={handlePasswordKeyDown}
                        onBlur={handlePasswordBlur}
                        placeholder="Set album password"
                        autoComplete="new-password"
                    />
                    <button
                        type="button"
                        className="ae-share-password-toggle"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setShowAlbumPassword((prev) => !prev)}
                        aria-label={showAlbumPassword ? 'Hide password' : 'Show password'}
                    >
                        {showAlbumPassword ? (
                            <EyeOff size={16} strokeWidth={2} aria-hidden />
                        ) : (
                            <Eye size={16} strokeWidth={2} aria-hidden />
                        )}
                    </button>
                </div>
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
                ref={messageRef}
                className="ae-share-message"
                value={shareMessage}
                onChange={(e) => {
                    messageTouchedRef.current = true;
                    setShareMessage(e.target.value);
                }}
                rows={6}
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
                className={`ae-share-panel${pauseConfirm ? ' ae-share-panel--confirm' : ''}${
                    mode === 'draft' && !pauseConfirm && !showLoading ? ' ae-share-panel--draft' : ''
                }`}
                role="dialog"
                aria-label="Share and publish"
            >
                {pauseConfirm ? (
                    <div className="ae-share-pause-confirm">
                        <p className="ae-share-section-label">Pause client access</p>
                        <div className="ae-share-pause-warn">
                            <p>
                                <strong>{pauseCopy.lead}</strong>
                                {pauseCopy.rest}
                            </p>
                        </div>
                        <p className="ae-share-pause-keep">{pauseCopy.keep}</p>
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
                                className="ae-share-btn ae-share-btn--pause"
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
                    <div className="ae-share-draft">
                        <div className="ae-share-draft-hero">
                            <div className="ae-share-draft-icon" aria-hidden>
                                <Ban size={24} strokeWidth={1.5} />
                            </div>
                            <p className="ae-share-draft-title">
                                This album is a <strong>Draft</strong>.
                            </p>
                            <p className="ae-share-draft-sub">Your client has never seen it.</p>
                        </div>

                        <div className="ae-share-divider" />

                        <p className="ae-share-section-label">Who should be able to open it</p>
                        <div
                            className="ae-share-access-cards"
                            role="radiogroup"
                            aria-label="Who should be able to open it"
                        >
                            {DRAFT_ACCESS_OPTIONS.map((option) => {
                                const selected = accessLevel === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        role="radio"
                                        aria-checked={selected}
                                        className={`ae-share-access-card${
                                            selected ? ' ae-share-access-card--selected' : ''
                                        }`}
                                        onClick={() => handleAccessChange(option.value)}
                                    >
                                        <span className="ae-share-access-card__radio" aria-hidden />
                                        <span className="ae-share-access-card__copy">
                                            <strong>{option.label}</strong>
                                            <small>{option.description}</small>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        {accessLevel === 'password' ? (
                            <div className="ae-share-password-field">
                                <input
                                    type={showAlbumPassword ? 'text' : 'password'}
                                    className="ae-share-input"
                                    value={albumPassword}
                                    onChange={(e) => handlePasswordChange(e.target.value)}
                                    onKeyDown={handlePasswordKeyDown}
                                    onBlur={handlePasswordBlur}
                                    placeholder="4-digit PIN"
                                    inputMode="numeric"
                                    maxLength={8}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    className="ae-share-password-toggle"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => setShowAlbumPassword((prev) => !prev)}
                                    aria-label={showAlbumPassword ? 'Hide PIN' : 'Show PIN'}
                                >
                                    {showAlbumPassword ? (
                                        <EyeOff size={16} strokeWidth={2} aria-hidden />
                                    ) : (
                                        <Eye size={16} strokeWidth={2} aria-hidden />
                                    )}
                                </button>
                            </div>
                        ) : null}

                        <button
                            type="button"
                            className="ae-share-btn ae-share-btn--primary ae-share-btn--draft-publish"
                            onClick={() => void handlePublishAndShare()}
                            disabled={busy}
                        >
                            Publish &amp; share...
                        </button>
                        <p className="ae-share-footnote ae-share-footnote--center">
                            Publishing creates the link. Nothing is sent until you pick a channel.
                        </p>
                    </div>
                ) : mode === 'paused' ? (
                    <>
                        <p className="ae-share-section-label">Client link</p>
                        <div className="ae-share-link-row">
                            <input type="text" readOnly value={shareDisplayUrl} />
                            <button
                                type="button"
                                className="ae-share-copy-inline ae-share-copy-inline--outline"
                                onClick={() => void handleCopyLink()}
                            >
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                        <div className="ae-share-paused-banner">
                            Access is paused. Anyone opening this link sees{' '}
                            <strong>&ldquo;This album is temporarily unavailable.&rdquo;</strong>
                        </div>
                        <button
                            type="button"
                            className="ae-share-btn ae-share-btn--primary"
                            onClick={() => void handleResume()}
                            disabled={busy}
                        >
                            Resume client access
                        </button>
                        {pausedRel ? (
                            <p className="ae-share-footnote ae-share-footnote--center">
                                Paused {pausedRel} by you.
                            </p>
                        ) : null}
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
                    <span className="ae-publish-seg__btn ae-publish-seg__btn--active ae-publish-seg__btn--draft">
                        <span className="ae-publish-seg__dot" aria-hidden />
                        Draft
                    </span>
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
                PUBLISHED
            </span>
        </div>
    );
}
