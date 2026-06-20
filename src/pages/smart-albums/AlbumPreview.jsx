import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AlbumBook from '../../components/smart-albums/AlbumBook';
import AlbumHybrid3DPreview from '../../components/smart-albums/3d/AlbumHybrid3DPreview';
import {
    pageToSpreadIndex,
    spreadIndexToPage,
    getTotalSpreads,
    isWholeSpreadLayout,
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
    removePhotoPin,
    updatePhotoPin,
} from '../../components/smart-albums/albumPhotoPins';
import {
    COMMENTS_CHANGED_EVENT,
    countMeaningfulComments,
    groupRootCommentsBySpread,
    smartAlbumCommentsService,
} from '../../services/smartAlbumComments.service';
import AlbumPreviewProofActions from '../../components/smart-albums/AlbumPreviewProofActions';
import { galleryService } from '../../services/gallery.service';
import { AppToast, useAppToast } from '../../components/ui/AppToast';
import { useAuth } from '../../hooks/useAuth';
import { countUnseenPhotoPins } from '../../components/smart-albums/albumPhotoPins';
import { countUnseenSwapMarks } from '../../components/smart-albums/albumSwapMarks';
import {
    getImageReplacements,
    IMAGE_REPLACEMENTS_CHANGED_EVENT,
    removeImageReplacement,
} from '../../components/smart-albums/albumImageReplacements';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import './AlbumViewer.css';
import './AlbumEditor.css';

const IconCollection = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
);

const IconComments = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
);

const IconSwap = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M7 16V4M7 4 3 8M7 4l4 4" />
        <path d="M17 8v12M17 20l4-4M17 20l-4-4" />
    </svg>
);

const PREVIEW_NAV = [
    { id: 'comments', label: 'Comment', icon: IconComments },
    { id: 'swap', label: 'Swap', icon: IconSwap },
    { id: 'review-summary', label: 'Review Summary', icon: IconCollection },
];

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
    const [is3D, setIs3D] = useState(true);

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

    const albumForBook = useMemo(
        () => (album ? { ...album, id: albumId } : null),
        [album, albumId]
    );

    const isPhotographer = Boolean(
        !clientPreview && user?.id && album?.photographer_id === user.id
    );
    const spreadIndex = useMemo(
        () => pageToSpreadIndex(bookPage, { showCover: true, totalPages }),
        [bookPage, totalPages]
    );
    const spreadCount = getTotalSpreads(totalPages, { showCover: true });
    const commentsEnabled = album?.comments_enabled !== false;
    const messagesEnabled = album?.messages_enabled !== false;
    const [spreadCommentsBySpread, setSpreadCommentsBySpread] = useState({});
    const [photoPins, setPhotoPins] = useState([]);
    const [sidebarTab, setSidebarTab] = useState('comments');
    const [editingPinId, setEditingPinId] = useState(null);
    const [editingPinMessage, setEditingPinMessage] = useState('');
    const [swapMarks, setSwapMarks] = useState([]);
    const [imageReplacements, setImageReplacements] = useState([]);
    const [businessName, setBusinessName] = useState(
        () => album?.preview_data?.business_name?.trim() || ''
    );

    useEffect(() => {
        const fromSnapshot = album?.preview_data?.business_name?.trim();
        if (fromSnapshot) {
            setBusinessName(fromSnapshot);
            return undefined;
        }

        const photographerId = album?.photographer_id;
        if (!photographerId) return undefined;

        let cancelled = false;
        galleryService
            .getPhotographerProfile(photographerId)
            .then((profile) => {
                if (cancelled || !profile) return;
                const name =
                    profile.business_name?.trim() ||
                    profile.display_name?.trim() ||
                    [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
                if (name) setBusinessName(name);
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [album?.photographer_id, album?.preview_data?.business_name]);

    useEffect(() => {
        if (!messagesEnabled && sidebarTab === 'swap') {
            setSidebarTab('comments');
        }
    }, [messagesEnabled, sidebarTab]);

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

    const spreadLabel =
        spreadIndex <= 0
            ? 'Cover'
            : `Spread ${spreadIndex} of ${Math.max(0, spreadCount - 1)}`;
    const photoCommentItems = useMemo(
        () =>
            (photoPins || [])
                .map((pin) => {
                    const pinSpreadIndex = pageToSpreadIndex(pin.pageNum, {
                        showCover: true,
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
        [photoPins, totalPages]
    );
    const albumCommentCount = useMemo(
        () =>
            countMeaningfulComments(
                Object.values(spreadCommentsBySpread || {}).flat()
            ),
        [spreadCommentsBySpread]
    );
    const visibleCommentCount = albumCommentCount + photoCommentItems.length;
    const swapMarksCount = swapMarks.length;
    const imageReplacementCount = imageReplacements.length;
    const unseenPinCount = countUnseenPhotoPins(albumId, photoPins);
    const unseenSwapCount = countUnseenSwapMarks(albumId, swapMarks);
    const swapItems = useMemo(
        () =>
            (swapMarks || [])
                .map((mark) => {
                    const slotA = parseSlotKey(mark.a);
                    const slotB = parseSlotKey(mark.b);
                    const spreadA = pageToSpreadIndex(slotA.pageNum, { showCover: true, totalPages });
                    const spreadB = pageToSpreadIndex(slotB.pageNum, { showCover: true, totalPages });
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
        [swapMarks, totalPages, album]
    );

    const handleSidebarTab = useCallback((tab) => {
        setSidebarTab(tab);
    }, []);

    const jumpToSpread = useCallback(
        (targetSpreadIndex) => {
            const targetPage = spreadIndexToPage(targetSpreadIndex, {
                showCover: true,
                totalPages,
            });
            setBookPage(targetPage);
            onPageChange?.(targetPage);
        },
        [onPageChange, totalPages]
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
                    {businessName}
                </span>
                <div className="av-preview-header-title-wrap">
                    <h1 className="av-preview-header-title">{album?.name || 'Album'}</h1>
                    {albumForBook?.has_covers ? (
                        <button
                            type="button"
                            className="av-preview-view-toggle"
                            onClick={() => setIs3D(!is3D)}
                        >
                            {is3D ? 'Switch to 2D' : 'View in 3D'}
                        </button>
                    ) : null}
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
                        {is3D && albumForBook?.has_covers ? (
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

                    <aside className="ae-sidebar av-preview-sidebar" aria-label="Preview tools">
                        <nav className="ae-nav-rail av-preview-nav-rail" aria-label="Preview panels">
                            {PREVIEW_NAV.map(({ id, label, icon: Icon }) => {
                                const disabled = id === 'swap' && !messagesEnabled;
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        className={`ae-nav-rail-btn${
                                            sidebarTab === id ? ' ae-nav-rail-btn--active' : ''
                                        }`}
                                        onClick={() => handleSidebarTab(id)}
                                        aria-label={label}
                                        aria-current={sidebarTab === id ? 'true' : undefined}
                                        title={
                                            disabled ? 'Swaps are disabled for this album' : label
                                        }
                                        disabled={disabled}
                                    >
                                        <span className="ae-nav-rail-icon">
                                            <Icon />
                                        </span>
                                        {id === 'comments' && photoPins.length > 0 && (
                                            <span
                                                className={`ae-nav-rail-badge ae-nav-rail-badge--pin${
                                                    unseenPinCount > 0
                                                        ? ' ae-nav-rail-badge--unseen'
                                                        : ''
                                                }`}
                                                aria-hidden
                                            >
                                                {unseenPinCount > 0
                                                    ? unseenPinCount
                                                    : photoPins.length}
                                            </span>
                                        )}
                                        {id === 'swap' && swapMarks.length > 0 && (
                                            <span
                                                className={`ae-nav-rail-badge${
                                                    unseenSwapCount > 0
                                                        ? ' ae-nav-rail-badge--unseen'
                                                        : ''
                                                }`}
                                                aria-hidden
                                            >
                                                {unseenSwapCount > 0
                                                    ? unseenSwapCount
                                                    : swapMarks.length}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </nav>

                        <div className="ae-panel av-preview-sidebar-panel">
                            {sidebarTab === 'comments' ? (
                                <>
                                    <h3 className="ae-panel-title">Comment</h3>
                                    <p className="ae-panel-text">
                                        {visibleCommentCount} comment
                                        {visibleCommentCount === 1 ? '' : 's'} in album
                                    </p>
                                    <div className="av-preview-sidebar-comments">
                                            {photoCommentItems.length === 0 ? (
                                                <p className="av-preview-sidebar-text">
                                                    No photo comments yet.
                                                </p>
                                            ) : (
                                                <>
                                                    {photoCommentItems.map((pin) => (
                                                        <article
                                                            key={pin.id}
                                                            className="av-preview-sidebar-comment av-preview-sidebar-comment--pin"
                                                        >
                                                            {editingPinId === pin.id ? (
                                                                <div className="av-preview-sidebar-comment-edit">
                                                                    <p className="av-preview-sidebar-comment-author">
                                                                        Photo comment · {pin.spreadLabel}
                                                                    </p>
                                                                    <textarea
                                                                        className="av-preview-sidebar-comment-input"
                                                                        value={editingPinMessage}
                                                                        onChange={(e) =>
                                                                            setEditingPinMessage(e.target.value)
                                                                        }
                                                                    />
                                                                    <div className="av-preview-sidebar-comment-actions">
                                                                        <button
                                                                            type="button"
                                                                            className="av-preview-sidebar-comment-action"
                                                                            onClick={() => {
                                                                                setEditingPinId(null);
                                                                                setEditingPinMessage('');
                                                                            }}
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className="av-preview-sidebar-comment-action av-preview-sidebar-comment-action--primary"
                                                                            onClick={() => {
                                                                                const updated = updatePhotoPin(
                                                                                    albumId,
                                                                                    pin.id,
                                                                                    {
                                                                                        message:
                                                                                            editingPinMessage,
                                                                                    }
                                                                                );
                                                                                if (updated) {
                                                                                    setEditingPinId(null);
                                                                                    setEditingPinMessage('');
                                                                                }
                                                                            }}
                                                                        >
                                                                            Save
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        className="av-preview-sidebar-comment-link"
                                                                        onClick={() => jumpToSpread(pin.spreadIndex)}
                                                                    >
                                                                        <p className="av-preview-sidebar-comment-author">
                                                                            Photo comment · {pin.spreadLabel}
                                                                        </p>
                                                                    </button>
                                                                    <div
                                                                        className="av-preview-sidebar-comment-body"
                                                                        role="button"
                                                                        tabIndex={0}
                                                                        onClick={() => jumpToSpread(pin.spreadIndex)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                                e.preventDefault();
                                                                                jumpToSpread(pin.spreadIndex);
                                                                            }
                                                                        }}
                                                                    >
                                                                        {pin.message}
                                                                    </div>
                                                                    <div className="av-preview-sidebar-comment-actions">
                                                                        <button
                                                                            type="button"
                                                                            className="av-preview-sidebar-comment-action"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setEditingPinId(pin.id);
                                                                                setEditingPinMessage(pin.message);
                                                                            }}
                                                                        >
                                                                            Edit
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className="av-preview-sidebar-comment-delete"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                removePhotoPin(albumId, pin.id);
                                                                            }}
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </article>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    </>
                                ) : sidebarTab === 'swap' ? (
                                    <>
                                        <h3 className="ae-panel-title">Swap</h3>
                                        <p className="ae-panel-text">
                                            {swapMarksCount > 0
                                                ? `${swapMarksCount} locked swap request${swapMarksCount === 1 ? '' : 's'}`
                                                : 'No swap requests yet'}
                                        </p>
                                        <div className="av-preview-sidebar-comments">
                                            {swapItems.length === 0 ? (
                                                <p className="av-preview-sidebar-text">
                                                    No swap requests yet.
                                                </p>
                                            ) : (
                                                <>
                                                    {swapItems.map((item) => {
                                                        const createdAtLabel = item.createdAt
                                                            ? new Date(item.createdAt).toLocaleString()
                                                            : null;
                                                        return (
                                                        <article
                                                            key={item.id}
                                                            className="av-preview-sidebar-comment av-preview-sidebar-comment--swap"
                                                        >
                                                            <p className="av-preview-sidebar-comment-author">
                                                                Swap request
                                                            </p>
                                                            <div className="av-preview-sidebar-swap-route">
                                                                <button
                                                                    type="button"
                                                                    className="av-preview-sidebar-swap-chip"
                                                                    onClick={() => jumpToSpread(item.spreadA)}
                                                                >
                                                                    {item.labelA}
                                                                </button>
                                                                <span className="av-preview-sidebar-swap-arrow" aria-hidden>
                                                                    ↔
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    className="av-preview-sidebar-swap-chip"
                                                                    onClick={() => jumpToSpread(item.spreadB)}
                                                                >
                                                                    {item.labelB}
                                                                </button>
                                                            </div>
                                                            <div className="av-preview-sidebar-swap-footer">
                                                                {createdAtLabel ? (
                                                                    <span className="av-preview-sidebar-swap-time">
                                                                        {createdAtLabel}
                                                                    </span>
                                                                ) : (
                                                                    <span className="av-preview-sidebar-swap-time" aria-hidden />
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    className="av-preview-sidebar-swap-remove"
                                                                    onClick={() =>
                                                                        removeSwapMark(albumId, item.id)
                                                                    }
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        </article>
                                                        );
                                                    })}
                                                </>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="ae-panel-title">Review Summary</h3>
                                        <p className="av-preview-summary-meta">
                                            <span>{visibleCommentCount} comment{visibleCommentCount === 1 ? '' : 's'}</span>
                                            <span className="av-preview-summary-meta-dot" aria-hidden>·</span>
                                            <span>{swapMarksCount} swap{swapMarksCount === 1 ? '' : 's'}</span>
                                            <span className="av-preview-summary-meta-dot" aria-hidden>·</span>
                                            <span>{imageReplacementCount} photo change{imageReplacementCount === 1 ? '' : 's'}</span>
                                        </p>
                                        <div className="av-preview-sidebar-comments av-preview-sidebar-replacements">
                                            {imageReplacementCount === 0 ? (
                                                <p className="av-preview-sidebar-empty">
                                                    No photo changes yet. When your photographer
                                                    updates a spread image, the before and after
                                                    photos appear here.
                                                </p>
                                            ) : (
                                                imageReplacements.map((replacement) => {
                                                    const createdAtLabel = replacement.createdAt
                                                        ? new Date(
                                                              replacement.createdAt
                                                          ).toLocaleString()
                                                        : null;
                                                    return (
                                                        <article
                                                            key={replacement.id}
                                                            className="av-preview-sidebar-replacement"
                                                        >
                                                            <button
                                                                type="button"
                                                                className="av-preview-sidebar-replacement-head"
                                                                onClick={() =>
                                                                    jumpToSpread(
                                                                        replacement.spreadIndex
                                                                    )
                                                                }
                                                            >
                                                                <span className="av-preview-sidebar-replacement-label">
                                                                    {replacement.slotLabel}
                                                                </span>
                                                                <span className="av-preview-sidebar-replacement-go">
                                                                    View spread
                                                                    <svg
                                                                        width="14"
                                                                        height="14"
                                                                        viewBox="0 0 24 24"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        strokeWidth="2"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        aria-hidden
                                                                    >
                                                                        <polyline points="9 18 15 12 9 6" />
                                                                    </svg>
                                                                </span>
                                                            </button>
                                                            <div className="av-preview-sidebar-replacement-pair">
                                                                <div className="av-preview-sidebar-replacement-shot av-preview-sidebar-replacement-shot--before">
                                                                    <img
                                                                        src={replacement.previousUrl}
                                                                        alt="Before photo change"
                                                                        draggable={false}
                                                                    />
                                                                    <span className="av-preview-sidebar-replacement-shot-tag">
                                                                        Before
                                                                    </span>
                                                                </div>
                                                                <div
                                                                    className="av-preview-sidebar-replacement-arrow"
                                                                    aria-hidden
                                                                >
                                                                    <svg
                                                                        width="16"
                                                                        height="16"
                                                                        viewBox="0 0 24 24"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        strokeWidth="2"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                    >
                                                                        <line x1="5" y1="12" x2="19" y2="12" />
                                                                        <polyline points="12 5 19 12 12 19" />
                                                                    </svg>
                                                                </div>
                                                                <div className="av-preview-sidebar-replacement-shot av-preview-sidebar-replacement-shot--now">
                                                                    <img
                                                                        src={replacement.newUrl}
                                                                        alt="Updated photo"
                                                                        draggable={false}
                                                                    />
                                                                    <span className="av-preview-sidebar-replacement-shot-tag av-preview-sidebar-replacement-shot-tag--new">
                                                                        Now
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="av-preview-sidebar-replacement-footer">
                                                                {createdAtLabel ? (
                                                                    <time
                                                                        className="av-preview-sidebar-replacement-time"
                                                                        dateTime={replacement.createdAt}
                                                                    >
                                                                        {createdAtLabel}
                                                                    </time>
                                                                ) : (
                                                                    <span
                                                                        className="av-preview-sidebar-replacement-time"
                                                                        aria-hidden
                                                                    />
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    className="av-preview-sidebar-replacement-remove"
                                                                    onClick={() =>
                                                                        handleRemoveImageReplacement(
                                                                            replacement.id
                                                                        )
                                                                    }
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        </article>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </>
                                )}
                        </div>
                    </aside>
                </div>
            </div>
            <AppToast toast={toast} onDismiss={clearToast} />
        </div>
    );
}
