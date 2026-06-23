import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
    groupRootCommentsBySpread,
    markGuestCommentsSeen,
    smartAlbumCommentsService,
} from '../../services/smartAlbumComments.service';
import AlbumPreviewProofActions from '../../components/smart-albums/AlbumPreviewProofActions';
import AlbumPreviewSpreadFeed from '../../components/smart-albums/AlbumPreviewSpreadFeed';
import { buildSpreadFeedbackFeed } from '../../components/smart-albums/spreadFeedbackFeed';
import { galleryService } from '../../services/gallery.service';
import { AppToast, useAppToast } from '../../components/ui/AppToast';
import { useAuth } from '../../hooks/useAuth';
import {
    getImageReplacements,
    IMAGE_REPLACEMENTS_CHANGED_EVENT,
    removeImageReplacement,
} from '../../components/smart-albums/albumImageReplacements';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import './AlbumViewer.css';

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
    const commentsEnabled = album?.comments_enabled !== false;
    const messagesEnabled = album?.messages_enabled !== false;
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
        () => album?.preview_data?.profile_icon_url?.trim() || ''
    );

    useEffect(() => {
        const fromSnapshotName = album?.preview_data?.business_name?.trim();
        const fromSnapshotIcon = album?.preview_data?.profile_icon_url?.trim();
        if (fromSnapshotName) setBusinessName(fromSnapshotName);
        if (fromSnapshotIcon) setProfileIconUrl(fromSnapshotIcon);
        if (fromSnapshotName && fromSnapshotIcon) return undefined;

        const photographerId = album?.photographer_id;
        if (!photographerId) return undefined;

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
                if (!fromSnapshotIcon && profile.profile_icon_url?.trim()) {
                    setProfileIconUrl(profile.profile_icon_url.trim());
                }
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [
        album?.photographer_id,
        album?.preview_data?.business_name,
        album?.preview_data?.profile_icon_url,
    ]);

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

    const visibleImageReplacements = useMemo(
        () =>
            imageReplacements.filter((replacement) => replacement.spreadIndex === spreadIndex),
        [imageReplacements, spreadIndex]
    );

    const visibleSpreadFeed = useMemo(
        () =>
            buildSpreadFeedbackFeed({
                photographerMessages: visiblePhotographerMessages,
                photoPins: visiblePhotoCommentItems,
                swapMarks: visibleSwapItems,
                imageReplacements: visibleImageReplacements,
                includeSwaps: messagesEnabled,
            }),
        [
            visiblePhotographerMessages,
            visiblePhotoCommentItems,
            visibleSwapItems,
            visibleImageReplacements,
            messagesEnabled,
        ]
    );

    const spreadFeedbackCount = visibleSpreadFeed.length;

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
                            alt=""
                            className="av-preview-header-brand-icon"
                        />
                    ) : null}
                    {businessName ? (
                        <span className="av-preview-header-brand-name">{businessName}</span>
                    ) : null}
                </span>
                <div className="av-preview-header-title-wrap">
                    <h1 className="av-preview-header-title">{album?.name || 'Album'}</h1>
                </div>
                {clientPreview ? (
                    <AlbumPreviewProofActions
                        albumId={albumId}
                        albumName={album?.name}
                        photoCommentItems={photoCommentItems}
                        swapItems={swapItems}
                        spreadCommentsBySpread={spreadCommentsBySpread}
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
                        {albumForBook?.has_covers ? (
                            <AlbumHybrid3DPreview
                                album={albumForBook}
                                totalPages={totalPages}
                                bookPage={bookPage}
                                onPageChange={handleBookPageChange}
                                photoRevision={photoRevision}
                                albumBookProps={albumBookProps}
                            />
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

                    <aside className="ae-sidebar av-preview-sidebar av-preview-sidebar--comments-only" aria-label="Preview comments">
                        <div className="ae-panel av-preview-sidebar-panel">
                                    <h3 className="ae-panel-title">Comment</h3>
                            <div className="av-preview-sidebar-comments">
                                {spreadFeedbackCount === 0 ? (
                                    <p className="av-preview-sidebar-text">
                                        No comments, swap requests, or photo changes on this
                                        spread yet.
                                                </p>
                                            ) : (
                                    <AlbumPreviewSpreadFeed
                                        feed={visibleSpreadFeed}
                                        albumId={albumId}
                                        businessName={businessName}
                                        spreadOpts={spreadOpts}
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
                                        onRemoveSwap={(id) => removeSwapMark(albumId, id)}
                                        onRemoveReplacement={handleRemoveImageReplacement}
                                    />
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
            <AppToast toast={toast} onDismiss={clearToast} />
        </div>
    );
}
