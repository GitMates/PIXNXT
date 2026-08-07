import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import AlbumBook from '../../components/smart-albums/AlbumBook';
import AlbumHybrid3DPreview from '../../components/smart-albums/3d/AlbumHybrid3DPreview';
import { useAlbumWrapAspect, withAlbumWrapAspect } from '../../components/smart-albums/useAlbumWrapAspect';
import {
    pageToSpreadIndex,
    spreadIndexToPage,
    getTotalSpreads,
    isWholeSpreadLayout,
    getAlbumSpreadOptions,
} from '../../components/smart-albums/albumSpreadUtils';
import { getSlotLabel } from '../../components/smart-albums/albumSwapMarks';
import {
    getSwapMarks,
    parseSlotKey,
    removeSwapMark,
    SWAP_MARKS_CHANGED_EVENT,
} from '../../components/smart-albums/albumSwapMarks';
import {
    PHOTO_PINS_CHANGED_EVENT,
    getPhotoPins,
} from '../../components/smart-albums/albumPhotoPins';
import {
    COMMENTS_CHANGED_EVENT,
    countClientRootComments,
    groupRootCommentsBySpread,
    markGuestCommentsSeen,
    smartAlbumCommentsService,
    getCommentsSubmittedAt,
    markCommentsSubmitted,
    getGuestProfile,
    hasCommentBody,
} from '../../services/smartAlbumComments.service';
import AlbumPreviewProofActions from '../../components/smart-albums/AlbumPreviewProofActions';
import AlbumPreviewFeedbackSidebar from '../../components/smart-albums/AlbumPreviewFeedbackSidebar';
import { buildSpreadFeedbackFeed } from '../../components/smart-albums/spreadFeedbackFeed';
import { hasCommentAttachment } from '../../components/smart-albums/albumCommentAttachments';
import { galleryService } from '../../services/gallery.service';
import { AppToast, useAppToast } from '../../components/ui/AppToast';
import { useAuth } from '../../hooks/useAuth';
import {
    getImageReplacements,
    IMAGE_REPLACEMENTS_CHANGED_EVENT,
    removeImageReplacement,
} from '../../components/smart-albums/albumImageReplacements';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import {
    ALBUM_PROOFER_SETTINGS_CHANGED_EVENT,
    smartAlbumProoferSettingsService,
} from '../../services/smartAlbumProoferSettings.service';
import { ALBUM_PROOF_STATUS_CHANGED_EVENT } from '../../components/smart-albums/albumProofStatus';
import { hydrateAlbumClientFeedback } from '../../components/smart-albums/hydrateAlbumClientFeedback';
import { canClientLeaveFeedback } from '../../components/smart-albums/albumProoferPreview';
import AlbumPreviewGuestNamePrompt from '../../components/smart-albums/AlbumPreviewGuestNamePrompt';
import './AlbumViewer.css';

function albumPasswordUnlockKey(albumId) {
    return `pixnxt.albumPasswordUnlocked.${albumId}`;
}

function isAlbumPasswordUnlocked(albumId) {
    if (!albumId) return false;
    try {
        return sessionStorage.getItem(albumPasswordUnlockKey(albumId)) === '1';
    } catch {
        return false;
    }
}

function markAlbumPasswordUnlocked(albumId) {
    if (!albumId) return;
    try {
        sessionStorage.setItem(albumPasswordUnlockKey(albumId), '1');
    } catch {
        /* ignore */
    }
}

function needsGuestDetailsBeforeViewer(albumId, prooferAccess, clientPreview) {
    if (!clientPreview || !albumId || !prooferAccess) return false;
    if (prooferAccess.feedbackLocked) return false;

    const needsPassword =
        prooferAccess.accessLevel === 'password' ||
        prooferAccess.privacyLevel === 'password';
    const passwordOk = !needsPassword || isAlbumPasswordUnlocked(albumId);
    const profile = getGuestProfile(albumId);
    const hasDetails = Boolean(profile?.name?.trim() && profile?.email?.trim());

    if (needsPassword && !passwordOk) return true;
    if (prooferAccess.requireNameForComments && !hasDetails) return true;
    return false;
}

/**
 * Client-facing album preview (gallery-style layout + proofing footer).
 */
export default function AlbumPreview({
    album,
    albumId,
    totalPages,
    initialPage,
    onPageChange,
    photoRevision = 0,
    minimalChrome = false,
    clientPreview = false,
}) {
    const { user } = useAuth();
    const { toast, showToast, clearToast } = useAppToast(4500);
    const [bookPage, setBookPage] = useState(initialPage);

    useEffect(() => {
        if (!album?.photographer_id) return undefined;
        void smartAlbumProoferSettingsService.loadPhotographerDefaults(album.photographer_id);
        return undefined;
    }, [album?.photographer_id]);

    useEffect(() => {
        setBookPage(initialPage);
    }, [initialPage]);

    useEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        const prevHtmlOverflow = html.style.overflow;
        const prevBodyOverflow = body.style.overflow;
        html.style.overflow = 'hidden';
        body.style.overflow = 'hidden';
        return () => {
            html.style.overflow = prevHtmlOverflow;
            body.style.overflow = prevBodyOverflow;
        };
    }, []);



    const wrapAspect = useAlbumWrapAspect(album, albumId, photoRevision);

    const albumForBook = useMemo(
        () => withAlbumWrapAspect(album, albumId, wrapAspect),
        [album, albumId, wrapAspect]
    );

    const isPhotographer = Boolean(
        !clientPreview && user?.id && album?.photographer_id === user.id
    );
    const spreadOpts = useMemo(() => getAlbumSpreadOptions(album), [album]);
    const spreadIndex = useMemo(
        () => pageToSpreadIndex(bookPage, { ...spreadOpts, totalPages }),
        [bookPage, spreadOpts, totalPages]
    );
    const spreadCount = getTotalSpreads(totalPages, spreadOpts);
    const [settingsRevision, setSettingsRevision] = useState(0);
    const [guestSessionTick, setGuestSessionTick] = useState(0);
    const [guestNamePromptOpen, setGuestNamePromptOpen] = useState(false);
    const [guestDetailsRequired, setGuestDetailsRequired] = useState(false);

    const prooferAccess = useMemo(() => {
        if (!clientPreview || !album?.photographer_id || !albumId) return null;
        return smartAlbumProoferSettingsService.getEffectiveAlbumAccess(
            album.photographer_id,
            albumId,
            album,
            album.preview_data
        );
    }, [clientPreview, album, albumId, settingsRevision]);

    const commentsEnabled = prooferAccess?.commentsEnabled ?? album?.comments_enabled !== false;
    const messagesEnabled = prooferAccess?.swapsEnabled ?? album?.messages_enabled !== false;

    const guestGatePending = useMemo(
        () => needsGuestDetailsBeforeViewer(albumId, prooferAccess, clientPreview),
        [albumId, prooferAccess, clientPreview, guestSessionTick, settingsRevision]
    );

    useEffect(() => {
        if (!albumId) return undefined;
        const onSettingsChanged = (event) => {
            if (event.detail?.albumId === albumId) {
                setSettingsRevision((value) => value + 1);
            }
        };
        window.addEventListener(ALBUM_PROOFER_SETTINGS_CHANGED_EVENT, onSettingsChanged);
        window.addEventListener(ALBUM_PROOF_STATUS_CHANGED_EVENT, onSettingsChanged);
        return () => {
            window.removeEventListener(ALBUM_PROOFER_SETTINGS_CHANGED_EVENT, onSettingsChanged);
            window.removeEventListener(ALBUM_PROOF_STATUS_CHANGED_EVENT, onSettingsChanged);
        };
    }, [albumId]);

    useEffect(() => {
        if (!guestGatePending) {
            setGuestDetailsRequired(false);
            return;
        }
        setGuestDetailsRequired(true);
        setGuestNamePromptOpen(true);
    }, [guestGatePending]);

    const handleProoferBlocked = useCallback(
        (message, code) => {
            if (code === 'name-required') return;
            showToast(message, { variant: 'warning', duration: 4500 });
        },
        [showToast]
    );
    const [spreadCommentsBySpread, setSpreadCommentsBySpread] = useState({});
    const [photoPins, setPhotoPins] = useState([]);
    const [editingPinId, setEditingPinId] = useState(null);
    const [editingPinMessage, setEditingPinMessage] = useState('');
    const [swapMarks, setSwapMarks] = useState([]);
    const [imageReplacements, setImageReplacements] = useState([]);
    const [businessName, setBusinessName] = useState(
        () => album?.preview_data?.business_name?.trim() || ''
    );
    const [profileIconUrl, setProfileIconUrl] = useState(
        () =>
            album?.preview_data?.logo_url?.trim() ||
            album?.preview_data?.profile_icon_url?.trim() ||
            ''
    );
    const [studioFaviconUrl, setStudioFaviconUrl] = useState('');
    const [profileBrandResolved, setProfileBrandResolved] = useState(
        () =>
            Boolean(
                album?.preview_data?.logo_url?.trim() ||
                    album?.preview_data?.profile_icon_url?.trim() ||
                    album?.preview_data?.business_name?.trim()
            )
    );

    const hasUnsubmittedComments = useMemo(() => {
        if (!clientPreview || !albumId) return false;
        // Check all forms of client feedback: spread comments, photo pins, swap marks
        const localCommentCount = countClientRootComments(albumId);
        const pinCount = photoPins.filter((p) => p.author_type === 'client').length;
        const swapCount = swapMarks.length;
        const spreadCount2 = Object.values(spreadCommentsBySpread || {}).flat().filter(
            (c) => c.author_type === 'client' && hasCommentBody(c)
        ).length;
        const totalFeedback = localCommentCount + pinCount + swapCount + spreadCount2;
        if (totalFeedback === 0) return false;
        return !getCommentsSubmittedAt(albumId);
    }, [clientPreview, albumId, spreadCommentsBySpread, photoPins, swapMarks]);

    useEffect(() => {
        if (!hasUnsubmittedComments) return undefined;

        const handleBeforeUnload = (e) => {
            const msg = 'If you leave the site, your feedback will be sent to the photographer. Accept to leave or continue commenting.';
            e.preventDefault();
            e.returnValue = msg;
            return msg;
        };

        const handleUnload = () => {
            const guest = getGuestProfile(albumId);
            if (!guest?.name) return;

            const flatComments = Object.values(spreadCommentsBySpread || {}).flat();
            const roots = flatComments.filter(
                (c) => !c.parent_id && hasCommentBody(c) && c.author_type === 'client'
            );
            if (roots.length === 0) return;

            const payload = {
                albumId,
                guestName: guest.name,
                guestEmail: guest.email || null,
                siteOrigin: window.location.origin,
                clientTimezone: (() => {
                    try {
                        return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
                    } catch {
                        return null;
                    }
                })(),
                comments: roots.map((c) => ({
                    spread_index: c.spread_index,
                    author_name: c.author_name,
                    body: c.body,
                    created_at: c.created_at,
                    updated_at: c.updated_at,
                })),
            };

            const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-album-comments-email`;
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY}`,
            };

            fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                keepalive: true,
            });

            markCommentsSubmitted(albumId);
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('pagehide', handleUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('pagehide', handleUnload);
        };
    }, [hasUnsubmittedComments, albumId, spreadCommentsBySpread]);

    useEffect(() => {
        const fromSnapshotName = album?.preview_data?.business_name?.trim();
        const fromSnapshotLogo =
            album?.preview_data?.logo_url?.trim() ||
            album?.preview_data?.profile_icon_url?.trim();
        if (fromSnapshotName) setBusinessName(fromSnapshotName);
        if (fromSnapshotLogo) setProfileIconUrl(fromSnapshotLogo);

        const photographerId = album?.photographer_id;
        if (!photographerId) {
            setProfileBrandResolved(true);
            return undefined;
        }

        let cancelled = false;
        galleryService
            .getPhotographerProfile(photographerId)
            .then((profile) => {
                if (cancelled || !profile) return;
                if (!fromSnapshotName) {
                    const name =
                        profile.business_name?.trim() ||
                        profile.display_name?.trim() ||
                        [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
                    if (name) setBusinessName(name);
                }
                // Studio identity logo first; Account profile icon as fallback
                if (!fromSnapshotLogo) {
                    const brandSrc =
                        profile.logo_url?.trim() || profile.profile_icon_url?.trim() || '';
                    if (brandSrc) setProfileIconUrl(brandSrc);
                }
                if (profile.favicon_url?.trim()) {
                    setStudioFaviconUrl(profile.favicon_url.trim());
                } else {
                    const localFav = localStorage.getItem('custom_favicon_url');
                    if (localFav) setStudioFaviconUrl(localFav);
                }
            })
            .catch(() => {})
            .finally(() => {
                if (!cancelled) setProfileBrandResolved(true);
            });

        return () => {
            cancelled = true;
        };
    }, [
        album?.photographer_id,
        album?.preview_data?.business_name,
        album?.preview_data?.logo_url,
        album?.preview_data?.profile_icon_url,
    ]);

    useEffect(() => {
        if (!studioFaviconUrl) return undefined;

        const link = document.querySelector("link[rel*='icon']");
        const originalHref = link ? link.getAttribute('href') : '/logo.png';
        const originalType = link ? link.getAttribute('type') : 'image/png';
        const faviconUrl = studioFaviconUrl;

        if (link) {
            link.href = faviconUrl;
            if (faviconUrl.endsWith('.png')) link.type = 'image/png';
            else if (faviconUrl.endsWith('.gif')) link.type = 'image/gif';
            else if (faviconUrl.endsWith('.ico')) link.type = 'image/x-icon';
        } else {
            const newLink = document.createElement('link');
            newLink.rel = 'icon';
            newLink.href = faviconUrl;
            if (faviconUrl.endsWith('.png')) newLink.type = 'image/png';
            else if (faviconUrl.endsWith('.gif')) newLink.type = 'image/gif';
            else if (faviconUrl.endsWith('.ico')) newLink.type = 'image/x-icon';
            document.head.appendChild(newLink);
        }

        return () => {
            const activeLink = document.querySelector("link[rel*='icon']");
            if (activeLink) {
                activeLink.href = originalHref;
                if (originalType) activeLink.type = originalType;
                else activeLink.removeAttribute('type');
            }
        };
    }, [studioFaviconUrl]);

    useEffect(() => {
        if (!profileIconUrl) return undefined;
        const img = new Image();
        img.src = profileIconUrl;
        return undefined;
    }, [profileIconUrl]);

    const loadSpreadComments = useCallback(async () => {
        if (!albumId || !commentsEnabled) return;
        try {
            const rows = await smartAlbumCommentsService.listAlbumComments(albumId);
            setSpreadCommentsBySpread(groupRootCommentsBySpread(rows));
        } catch (e) {
            console.warn('Could not load spread comments for overview', e);
        }
    }, [albumId, commentsEnabled]);

    useEffect(() => {
        loadSpreadComments();
    }, [loadSpreadComments]);

    useEffect(() => {
        if (!albumId) return undefined;
        let cancelled = false;
        const guest = getGuestProfile(albumId);
        const viewerKey = guest?.email?.trim() || guest?.name?.trim() || 'default';
        void hydrateAlbumClientFeedback(albumId, {
            viewerRole: 'client',
            viewerKey,
        }).then(() => {
            if (cancelled) return;
            setPhotoPins(getPhotoPins(albumId));
            setSwapMarks(getSwapMarks(albumId));
            void loadSpreadComments();
        });
        return () => {
            cancelled = true;
        };
    }, [albumId, loadSpreadComments]);

    useEffect(() => {
        if (!albumId) return undefined;
        const loadPins = () => setPhotoPins(getPhotoPins(albumId));
        loadPins();
        const onPinsChanged = (e) => {
            if (e.detail?.albumId && e.detail.albumId !== albumId) return;
            loadPins();
        };
        window.addEventListener(PHOTO_PINS_CHANGED_EVENT, onPinsChanged);
        return () => window.removeEventListener(PHOTO_PINS_CHANGED_EVENT, onPinsChanged);
    }, [albumId]);

    useEffect(() => {
        if (!albumId) return undefined;
        const loadMarks = () => setSwapMarks(getSwapMarks(albumId));
        loadMarks();
        const onSwapChanged = (e) => {
            if (e.detail?.albumId && e.detail.albumId !== albumId) return;
            loadMarks();
        };
        window.addEventListener(SWAP_MARKS_CHANGED_EVENT, onSwapChanged);
        return () => window.removeEventListener(SWAP_MARKS_CHANGED_EVENT, onSwapChanged);
    }, [albumId]);

    useEffect(() => {
        if (!albumId) return undefined;
        const loadReplacements = () => setImageReplacements(getImageReplacements(albumId));
        loadReplacements();
        const onReplacementsChanged = (e) => {
            if (e.detail?.albumId && e.detail.albumId !== albumId) return;
            loadReplacements();
        };
        window.addEventListener(IMAGE_REPLACEMENTS_CHANGED_EVENT, onReplacementsChanged);
        return () =>
            window.removeEventListener(IMAGE_REPLACEMENTS_CHANGED_EVENT, onReplacementsChanged);
    }, [albumId, photoRevision]);

    useEffect(() => {
        if (!albumId || !commentsEnabled) return undefined;
        const onChanged = (e) => {
            if (e.detail?.albumId === albumId) loadSpreadComments();
        };
        window.addEventListener(COMMENTS_CHANGED_EVENT, onChanged);
        return () => window.removeEventListener(COMMENTS_CHANGED_EVENT, onChanged);
    }, [albumId, commentsEnabled, loadSpreadComments]);

    const handleBookPageChange = useCallback(
        (idx) => {
            setBookPage(idx);
            onPageChange?.(idx);
        },
        [onPageChange]
    );

    const photoCommentItems = useMemo(
        () =>
            (photoPins || [])
                .map((pin) => {
                    const pinSpreadIndex = pageToSpreadIndex(pin.pageNum, {
                        ...spreadOpts,
                        totalPages,
                    });
                    const wholePin =
                        isWholeSpreadLayout(album?.grid_layout) && pin.pageNum > 0;
                    const pinSpreadLabel = getSlotLabel(
                        pin.pageNum,
                        pin.cellId ?? 0,
                        wholePin,
                        totalPages,
                        album
                    );
                    return {
                        ...pin,
                        spreadIndex: pinSpreadIndex,
                        spreadLabel: pinSpreadLabel,
                    };
                })
                .sort(
                    (a, b) =>
                        new Date(b.createdAt || 0).getTime() -
                        new Date(a.createdAt || 0).getTime()
                ),
        [photoPins, totalPages, album, spreadOpts]
    );
    const swapItems = useMemo(
        () =>
            (swapMarks || [])
                .map((mark) => {
                    const slotA = parseSlotKey(mark.a);
                    const slotB = parseSlotKey(mark.b);
                    const spreadA = pageToSpreadIndex(slotA.pageNum, { ...spreadOpts, totalPages });
                    const spreadB = pageToSpreadIndex(slotB.pageNum, { ...spreadOpts, totalPages });
                    const wholeA =
                        (isWholeSpreadLayout(album?.grid_layout) && slotA.pageNum > 0) ||
                        /\b(Whole|Both)\b/i.test(mark.labelA || '');
                    const wholeB =
                        (isWholeSpreadLayout(album?.grid_layout) && slotB.pageNum > 0) ||
                        /\b(Whole|Both)\b/i.test(mark.labelB || '');
                    return {
                        ...mark,
                        spreadA,
                        spreadB,
                        labelA: getSlotLabel(slotA.pageNum, slotA.cellId, wholeA, totalPages, album),
                        labelB: getSlotLabel(slotB.pageNum, slotB.cellId, wholeB, totalPages, album),
                    };
                })
                .sort(
                    (a, b) =>
                        new Date(b.createdAt || 0).getTime() -
                        new Date(a.createdAt || 0).getTime()
                ),
        [swapMarks, totalPages, album, spreadOpts]
    );

    const visiblePhotoCommentItems = useMemo(
        () => photoCommentItems.filter((pin) => pin.spreadIndex === spreadIndex),
        [photoCommentItems, spreadIndex]
    );

    const visibleSwapItems = useMemo(
        () =>
            swapItems.filter(
                (item) => item.spreadA === spreadIndex || item.spreadB === spreadIndex
            ),
        [swapItems, spreadIndex]
    );

    const visiblePhotographerMessages = useMemo(() => {
        const rows = spreadCommentsBySpread?.[spreadIndex] || [];
        return rows.filter(
            (c) => c.author_type === 'photographer' && String(c.body || '').trim()
        );
    }, [spreadCommentsBySpread, spreadIndex]);

    const visibleClientMessages = useMemo(() => {
        const rows = spreadCommentsBySpread?.[spreadIndex] || [];
        return rows.filter(
            (c) =>
                c.author_type === 'client' &&
                (String(c.body || '').trim() || hasCommentAttachment(c))
        );
    }, [spreadCommentsBySpread, spreadIndex]);

    const visibleImageReplacements = useMemo(
        () =>
            imageReplacements.filter((replacement) => replacement.spreadIndex === spreadIndex),
        [imageReplacements, spreadIndex]
    );

    const visibleSpreadFeed = useMemo(
        () =>
            buildSpreadFeedbackFeed({
                photographerMessages: visiblePhotographerMessages,
                clientMessages: visibleClientMessages,
                photoPins: visiblePhotoCommentItems,
                swapMarks: visibleSwapItems,
                imageReplacements: visibleImageReplacements,
                includeSwaps: messagesEnabled,
            }),
        [
            visiblePhotographerMessages,
            visibleClientMessages,
            visiblePhotoCommentItems,
            visibleSwapItems,
            visibleImageReplacements,
            messagesEnabled,
        ]
    );


    useEffect(() => {
        if (!clientPreview || !albumId) return;
        if (!visiblePhotographerMessages.length) return;
        markGuestCommentsSeen(albumId, visiblePhotographerMessages);
    }, [clientPreview, albumId, spreadIndex, visiblePhotographerMessages]);

    const jumpToSpread = useCallback(
        (targetSpreadIndex) => {
            const targetPage = spreadIndexToPage(targetSpreadIndex, {
                ...spreadOpts,
                totalPages,
            });
            setBookPage(targetPage);
            onPageChange?.(targetPage);
        },
        [onPageChange, totalPages, spreadOpts]
    );

    const handleRemoveImageReplacement = useCallback(
        async (replacementId) => {
            if (!albumId || !replacementId) return;
            if (!removeImageReplacement(albumId, replacementId)) return;
            if (isPhotographer && user?.id) {
                try {
                    await smartAlbumsService.syncAlbumPreviewData(user.id, albumId);
                } catch (err) {
                    console.warn('Could not sync after removing photo change:', err);
                }
            }
        },
        [albumId, isPhotographer, user?.id]
    );

    const albumBookProps = useMemo(
        () => ({
            previewMode: true,
            clientPreview,
            prooferAccess,
            onProoferBlocked: clientPreview ? handleProoferBlocked : undefined,
            showSamples: false,
            transformRevision: photoRevision,
            proofSpotPicker: commentsEnabled || messagesEnabled,
            spotCanComment: commentsEnabled,
            spotCanSwap: messagesEnabled,
            swapMarkMode: false,
            pinMarkMode: false,
            proofToolsHover: false,
            placementMode: isWholeSpreadLayout(album?.grid_layout) ? 'whole' : 'single',
            spreadCommentsBySpread: commentsEnabled ? spreadCommentsBySpread : null,
        }),
        [
            clientPreview,
            prooferAccess,
            handleProoferBlocked,
            photoRevision,
            commentsEnabled,
            messagesEnabled,
            album?.grid_layout,
            spreadCommentsBySpread,
        ]
    );

    return (
        <div className="av-page av-page--preview av-page--gallery-proof av-page--with-comments">
            <header className="av-preview-header">
                <span className="av-preview-header-brand" title={businessName || undefined}>
                    {profileIconUrl ? (
                        <img
                            src={profileIconUrl}
                            alt={businessName || 'Studio logo'}
                            className="av-preview-header-brand-icon"
                        />
                    ) : profileBrandResolved && businessName ? (
                        <span className="av-preview-header-brand-fallback">
                            {businessName[0].toUpperCase()}
                        </span>
                    ) : (
                        <span className="av-preview-header-brand-placeholder" aria-hidden />
                    )}
                </span>
                <div className="av-preview-header-title-wrap">
                    <h1 className="av-preview-header-title">{album?.name || 'Album'}</h1>
                </div>
                {clientPreview ? (
                    <AlbumPreviewProofActions
                        albumId={albumId}
                        albumName={album?.name}
                        album={album}
                        onToast={(message, variant = 'info') =>
                            showToast(message, { variant, duration: 4500 })
                        }
                    />
                ) : (
                    <span className="av-preview-header-spacer" aria-hidden />
                )}
            </header>

            <div className="av-preview-shell">
                <div className="av-preview-main">
                <div className="av-preview-book-section">
                    <div className="av-viewer-body av-viewer-body--preview-book">
                        {guestGatePending ? (
                            <div
                                className="av-preview-book-deferred"
                                aria-hidden
                            />
                        ) : albumForBook?.has_covers ? (
                            <Suspense
                                fallback={
                                    <div
                                        className="av-preview-book-deferred av-preview-book-deferred--loading"
                                        aria-busy="true"
                                        aria-label="Loading 3D album cover"
                                    />
                                }
                            >
                                <AlbumHybrid3DPreview
                                    album={albumForBook}
                                    totalPages={totalPages}
                                    bookPage={bookPage}
                                    onPageChange={handleBookPageChange}
                                    photoRevision={photoRevision}
                                    albumBookProps={albumBookProps}
                                />
                            </Suspense>
                        ) : (
                            <AlbumBook
                                key={`${albumId}-preview`}
                                album={albumForBook}
                                totalPages={totalPages}
                                initialPage={bookPage}
                                onPageChange={handleBookPageChange}
                                {...albumBookProps}
                            />
                        )}
                    </div>
                </div>

                    <AlbumPreviewFeedbackSidebar
                        albumId={albumId}
                        album={album}
                        totalPages={totalPages}
                        photoRevision={photoRevision}
                        photographerId={album?.photographer_id}
                        spreadIndex={spreadIndex}
                        spreadLabel={
                            spreadIndex <= 0
                                ? 'Cover'
                                : `Spread ${spreadIndex}`
                        }
                        spreadOpts={spreadOpts}
                        businessName={businessName}
                        clientPreview={clientPreview}
                        commentsEnabled={commentsEnabled}
                        prooferAccess={prooferAccess}
                        visibleSpreadFeed={visibleSpreadFeed}
                        editingPinId={editingPinId}
                        editingPinMessage={editingPinMessage}
                        onEditPinStart={(pin) => {
                            setEditingPinId(pin.id);
                            setEditingPinMessage(pin.message);
                        }}
                        onEditPinCancel={() => {
                            setEditingPinId(null);
                            setEditingPinMessage('');
                        }}
                        onEditPinMessageChange={setEditingPinMessage}
                        onEditPinSave={() => {
                            setEditingPinId(null);
                            setEditingPinMessage('');
                        }}
                        onJumpToSpread={jumpToSpread}
                        onNavigateToPin={(pin) => {
                            if (pin?.spreadIndex != null) jumpToSpread(pin.spreadIndex);
                            else if (Number.isFinite(pin?.pageNum)) {
                                jumpToSpread(
                                    pageToSpreadIndex(pin.pageNum, { ...spreadOpts, totalPages })
                                );
                            }
                        }}
                        onNavigateToSlotKey={(slotKey) => {
                            if (!slotKey) return;
                            const [pageNum] = String(slotKey).split(':').map(Number);
                            if (!Number.isFinite(pageNum)) return;
                            jumpToSpread(
                                pageToSpreadIndex(pageNum, { ...spreadOpts, totalPages })
                            );
                        }}
                        onRemoveSwap={(id) => removeSwapMark(albumId, id)}
                        onRemoveReplacement={handleRemoveImageReplacement}
                        onBlocked={clientPreview ? handleProoferBlocked : undefined}
                        onNotify={(message) => showToast(message, { variant: 'info', duration: 3500 })}
                        onCommentsChanged={loadSpreadComments}
                    />
                </div>
            </div>
            <AlbumPreviewGuestNamePrompt
                albumId={albumId}
                open={guestNamePromptOpen}
                required={guestDetailsRequired}
                requirePassword={
                    (prooferAccess?.accessLevel === 'password' ||
                        prooferAccess?.privacyLevel === 'password') &&
                    !isAlbumPasswordUnlocked(albumId)
                }
                expectedPassword={
                    prooferAccess?.accessPassword || prooferAccess?.albumPassword || ''
                }
                onClose={() => {
                    if (
                        prooferAccess?.accessLevel === 'password' ||
                        prooferAccess?.privacyLevel === 'password'
                    ) {
                        markAlbumPasswordUnlocked(albumId);
                    }
                    setGuestNamePromptOpen(false);
                    setGuestDetailsRequired(false);
                    setGuestSessionTick((value) => value + 1);
                }}
            />
            <AppToast toast={toast} onDismiss={clearToast} />
        </div>
    );
}
