import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AlbumBook from '../../components/smart-albums/AlbumBook';
import AlbumHybrid3DPreview from '../../components/smart-albums/3d/AlbumHybrid3DPreview';
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
    isGuestCommentUnseen,
    markGuestCommentsSeen,
    smartAlbumCommentsService,
} from '../../services/smartAlbumComments.service';
import AlbumPreviewProofActions from '../../components/smart-albums/AlbumPreviewProofActions';
import AlbumPreviewSpreadFeed from '../../components/smart-albums/AlbumPreviewSpreadFeed';
import { buildSpreadFeedbackFeed } from '../../components/smart-albums/spreadFeedbackFeed';
import ProofPanelStats from '../../components/smart-albums/ProofPanelStats';
import { galleryService } from '../../services/gallery.service';
import { AppToast, useAppToast } from '../../components/ui/AppToast';
import { useAuth } from '../../hooks/useAuth';
import { countUnseenPhotoPins } from '../../components/smart-albums/albumPhotoPins';
import { countUnseenSwapMarks } from '../../components/smart-albums/albumSwapMarks';
import {
    getImageReplacements,
    IMAGE_REPLACEMENTS_CHANGED_EVENT,
    removeImageReplacement,
    resolveReplacementPreviewUrl,
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

const PREVIEW_NAV = [
    { id: 'comments', label: 'Comment', icon: IconComments },
    { id: 'review-summary', label: 'Review Summary', icon: IconCollection },
];

function ReplacementPreviewImage({ albumId, url, itemId, alt, variant, tagLabel }) {
    const [failed, setFailed] = useState(false);
    const resolvedUrl = resolveReplacementPreviewUrl(albumId, url, itemId);

    useEffect(() => {
        setFailed(false);
    }, [resolvedUrl]);

    const shotClassName = `av-preview-sidebar-replacement-shot${
        variant ? ` av-preview-sidebar-replacement-shot--${variant}` : ''
    }`;

    if (!resolvedUrl || failed) {
        return (
            <div className={`${shotClassName} av-preview-sidebar-replacement-shot--missing`}>
                <span className="av-preview-sidebar-replacement-shot-placeholder">
                    Original photo unavailable
                </span>
                {tagLabel ? (
                    <span
                        className={`av-preview-sidebar-replacement-shot-tag${
                            variant === 'now'
                                ? ' av-preview-sidebar-replacement-shot-tag--new'
                                : ''
                        }`}
                    >
                        {tagLabel}
                    </span>
                ) : null}
            </div>
        );
    }

    return (
        <div className={shotClassName}>
            <img
                src={resolvedUrl}
                alt={alt}
                draggable={false}
                onError={() => setFailed(true)}
            />
            {tagLabel ? (
                <span
                    className={`av-preview-sidebar-replacement-shot-tag${
                        variant === 'now' ? ' av-preview-sidebar-replacement-shot-tag--new' : ''
                    }`}
                >
                    {tagLabel}
                </span>
            ) : null}
        </div>
    );
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
    const photographerMessages = useMemo(
        () =>
            Object.values(spreadCommentsBySpread || {})
                .flat()
                .filter(
                    (c) =>
                        c.author_type === 'photographer' && String(c.body || '').trim()
                ),
        [spreadCommentsBySpread]
    );
    const unseenPhotographerMessageCount = clientPreview
        ? photographerMessages.filter((c) => isGuestCommentUnseen(albumId, c)).length
        : 0;
    const swapMarksCount = swapMarks.length;
    const unseenPinCount = countUnseenPhotoPins(albumId, photoPins);
    const unseenSwapCount = countUnseenSwapMarks(albumId, swapMarks);
    const previewFeedbackCount =
        photoCommentItems.length +
        (clientPreview ? photographerMessages.length : 0) +
        (messagesEnabled ? swapMarksCount : 0);
    const previewUnseenCount =
        unseenPinCount +
        unseenPhotographerMessageCount +
        (messagesEnabled ? unseenSwapCount : 0);
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

    const visibleSpreadFeed = useMemo(
        () =>
            buildSpreadFeedbackFeed({
                photographerMessages: visiblePhotographerMessages,
                photoPins: visiblePhotoCommentItems,
                swapMarks: visibleSwapItems,
                includeSwaps: messagesEnabled,
            }),
        [
            visiblePhotographerMessages,
            visiblePhotoCommentItems,
            visibleSwapItems,
            messagesEnabled,
        ]
    );

    const spreadFeedbackCount = visibleSpreadFeed.length;
    const spreadFeedbackUnresolved =
        countUnseenPhotoPins(albumId, visiblePhotoCommentItems) +
        visiblePhotographerMessages.filter((c) => isGuestCommentUnseen(albumId, c)).length +
        (messagesEnabled ? countUnseenSwapMarks(albumId, visibleSwapItems) : 0);

    const visibleImageReplacements = useMemo(
        () =>
            imageReplacements
                .filter((replacement) => replacement.spreadIndex === spreadIndex)
                .sort(
                    (a, b) =>
                        new Date(a.createdAt || 0).getTime() -
                        new Date(b.createdAt || 0).getTime()
                ),
        [imageReplacements, spreadIndex]
    );

    const spreadReviewCommentCount =
        visiblePhotoCommentItems.length + visiblePhotographerMessages.length;
    const spreadReviewSwapCount = messagesEnabled ? visibleSwapItems.length : 0;
    const spreadReviewReplacementCount = visibleImageReplacements.length;

    const handleSidebarTab = useCallback((tab) => {
        setSidebarTab(tab);
    }, []);

    useEffect(() => {
        if (!clientPreview || !albumId || sidebarTab !== 'comments') return;
        if (!visiblePhotographerMessages.length) return;
        markGuestCommentsSeen(albumId, visiblePhotographerMessages);
    }, [clientPreview, albumId, sidebarTab, spreadIndex, visiblePhotographerMessages]);

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
                    {businessName}
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

                    <aside className="ae-sidebar av-preview-sidebar" aria-label="Preview tools">
                        <nav className="ae-nav-rail av-preview-nav-rail" aria-label="Preview panels">
                            {PREVIEW_NAV.map(({ id, label, icon: Icon }) => (
                                    <button
                                        key={id}
                                        type="button"
                                        className={`ae-nav-rail-btn${
                                            sidebarTab === id ? ' ae-nav-rail-btn--active' : ''
                                        }`}
                                        onClick={() => handleSidebarTab(id)}
                                        aria-label={label}
                                        aria-current={sidebarTab === id ? 'true' : undefined}
                                        title={label}
                                    >
                                        <span className="ae-nav-rail-icon">
                                            <Icon />
                                        </span>
                                        {id === 'comments' && previewFeedbackCount > 0 && (
                                            <span
                                                className={`ae-nav-rail-badge ae-nav-rail-badge--pin${
                                                    previewUnseenCount > 0
                                                        ? ' ae-nav-rail-badge--unseen'
                                                        : ''
                                                }`}
                                                aria-hidden
                                            >
                                                {previewUnseenCount > 0
                                                    ? previewUnseenCount
                                                    : previewFeedbackCount}
                                            </span>
                                        )}
                                    </button>
                                ))}
                        </nav>

                        <div className="ae-panel av-preview-sidebar-panel">
                            {sidebarTab === 'comments' ? (
                                <>
                                    <h3 className="ae-panel-title">Comment</h3>
                                    <ProofPanelStats
                                        unresolved={spreadFeedbackUnresolved}
                                        total={spreadFeedbackCount}
                                        totalLabel="On this spread"
                                        compact
                                    />
                                    <div className="av-preview-sidebar-comments">
                                            {spreadFeedbackCount === 0 ? (
                                                <p className="av-preview-sidebar-text">
                                                    No comments or swap requests on this spread yet.
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
                                                    onRemoveSwap={(id) =>
                                                        removeSwapMark(albumId, id)
                                                    }
                                                />
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="av-preview-sidebar-scroll av-preview-sidebar-scroll--summary">
                                        <h3 className="ae-panel-title">Review Summary</h3>
                                        <p className="av-preview-summary-meta">
                                            <span>
                                                {spreadReviewCommentCount} comment
                                                {spreadReviewCommentCount === 1 ? '' : 's'}
                                            </span>
                                            <span className="av-preview-summary-meta-dot" aria-hidden>
                                                ·
                                            </span>
                                            <span>
                                                {spreadReviewSwapCount} swap
                                                {spreadReviewSwapCount === 1 ? '' : 's'}
                                            </span>
                                            <span className="av-preview-summary-meta-dot" aria-hidden>
                                                ·
                                            </span>
                                            <span>
                                                {spreadReviewReplacementCount} photo change
                                                {spreadReviewReplacementCount === 1 ? '' : 's'}
                                            </span>
                                        </p>
                                        {spreadReviewReplacementCount === 0 ? (
                                            <p className="av-preview-sidebar-empty">
                                                No photo changes on this spread yet. When your
                                                photographer updates an image here, the before and
                                                after photos appear below.
                                            </p>
                                        ) : (
                                            visibleImageReplacements.map((replacement) => {
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
                                                            <ReplacementPreviewImage
                                                                albumId={albumId}
                                                                url={replacement.previousUrl}
                                                                itemId={replacement.previousItemId}
                                                                alt="Before photo change"
                                                                variant="before"
                                                                tagLabel="Before"
                                                            />
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
                                                            <ReplacementPreviewImage
                                                                albumId={albumId}
                                                                url={replacement.newUrl}
                                                                itemId={replacement.newItemId}
                                                                alt="Updated photo"
                                                                variant="now"
                                                                tagLabel="Now"
                                                            />
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
                                )}
                        </div>
                    </aside>
                </div>
            </div>
            <AppToast toast={toast} onDismiss={clearToast} />
        </div>
    );
}
