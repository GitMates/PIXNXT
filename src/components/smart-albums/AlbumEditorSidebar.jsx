import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { pickImageFiles } from '../../lib/pickImageFiles';
import { PROOF_CELL_LABELS, PROOF_SLOT_COUNT, getSpreadLeftPageIndex } from './albumSpreadGrid';
import {
    getSlotLabel,
    isSwapMarkUnseen,
    parseSlotKey,
    removeSwapMark,
} from './albumSwapMarks';
import { isPhotoPinUnseen } from './albumPhotoPins';
import { isCommentUnseen } from '../../services/smartAlbumComments.service';
import EditorSpreadMessageCompose from './EditorSpreadMessageCompose';
import SpreadVersionHistory from './SpreadVersionHistory';
import AlbumPreviewSpreadFeed from './AlbumPreviewSpreadFeed';
import { buildSpreadFeedbackFeed } from './spreadFeedbackFeed';
import { hasCommentAttachment } from './albumCommentAttachments';
import CoverLeatherColorPicker from './CoverLeatherColorPicker';
import CoverPhotoUploader from './CoverPhotoUploader';
import { formatAlbumGridSizeDisplay } from './albumGridSize';
import { resolveFrontCoverDisplayText } from './albumCoverText';
import {
    albumHasCoverSpreads,
    formatBookSpreadMetaLabel,
    getAlbumSpreadOptions,
    getSpreadPages,
    isWholeSpreadLayout,
    pageToSpreadIndex,
} from './albumSpreadUtils';
import {
    getPagePhotoOverride,
    getSpreadPhotoOverride,
    resolveCoverImageSrc,
} from './albumPagePhotos';
import {
    filterUploadReplacements,
    getImageReplacements,
    IMAGE_REPLACEMENTS_CHANGED_EVENT,
    removeImageReplacement,
    sortSpreadReplacements,
} from './albumImageReplacements';
import '../../pages/smart-albums/AlbumViewer.css';
import './AlbumCoverPanel.css';

const NAV_BASE = [
    { id: 'pin', label: 'Comments' },
    { id: 'cover', label: 'Cover', requiresCovers: true },
    { id: 'comments', label: 'Settings' },
];

const GRID_LAYOUT_LABELS = {
    'two-page': 'Two-page grid (left + right)',
    'whole-spread': 'Whole-spread photo',
};

/** Mark-as-done is photographer "seen" state — not comment.resolved. */
function isProofFeedItemMarkedDone(albumId, item) {
    if (!albumId || !item) return false;
    if (item.kind === 'client-message' && item.comment) {
        return !isCommentUnseen(albumId, item.comment);
    }
    if (item.kind === 'photo-pin' && item.pin) {
        return !isPhotoPinUnseen(albumId, item.pin);
    }
    if (item.kind === 'swap' && item.mark) {
        return !isSwapMarkUnseen(albumId, item.mark);
    }
    return false;
}

function CoverSpineToggle({ on, onChange, label }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={label}
            onClick={onChange}
            className={`ae-cover-spine-toggle${on ? ' ae-cover-spine-toggle--on' : ''}`}
        >
            <span className="ae-cover-spine-toggle__knob" />
        </button>
    );
}

export default function AlbumEditorSidebar({
    activePanel,
    onPanelChange,
    album,
    totalPages,
    onUploadForCurrentSpread,
    onOpenPicker,
    onClearAllPhotos,
    uploading = false,
    gridEditSet = 'single',
    onGridEditSetChange,
    gridSelection = null,
    bookPage = 0,
    onSelectCell,
    canSelectGrid = false,
    spreadCount = 1,
    innerPageCount = 0,
    canAddPages = true,
    canRemovePages = true,
    pagesPerSpread = 2,
    pageCountBusy = false,
    onAddPages,
    onRemovePages,
    commentSettings = null,
    swapMarks = [],
    photoPins = [],
    spreadCommentsBySpread = null,
    albumId = null,
    photographerName = 'Photographer',
    onNavigateToPin = null,
    onNavigateToSwapSlotKey = null,
    onNavigateToSwapMark = null,
    proofSeenTick = 0,
    showCoverSpine = true,
    onShowCoverSpineChange = null,
    coverTextMessage = '',
    onSaveCoverText = null,
    onUploadCoverFile = null,
    onRemoveCoverPhotos = null,
    workspaceRevision = 0,
    onRestoreImageReplacement = null,
    onRemoveImageReplacement = null,
}) {
    const [imageReplacements, setImageReplacements] = useState([]);
    const [localCoverText, setLocalCoverText] = useState(coverTextMessage);
    const [feedbackFilter, setFeedbackFilter] = useState('this'); // this | done | all

    const hasCoverPhoto = useMemo(() => {
        void workspaceRevision;
        return Boolean(resolveCoverImageSrc(album, { showSamples: false }));
    }, [album, workspaceRevision]);

    // Same text shown on the leather cover (custom message, or album name when blank).
    const resolvedCoverText = useMemo(() => {
        void coverTextMessage;
        void hasCoverPhoto;
        return resolveFrontCoverDisplayText(album, albumId);
    }, [album, albumId, coverTextMessage, hasCoverPhoto]);

    useEffect(() => {
        setLocalCoverText(resolvedCoverText || '');
    }, [resolvedCoverText]);

    const swapsEnabled = album?.messages_enabled !== false;
    const showAllFeedback = feedbackFilter === 'all';
    const showDoneOnly = feedbackFilter === 'done';
    const clientVisibleName =
        album?.client_contact_name ||
        album?.client_name ||
        album?.share_guest_name ||
        'Client';

    const spreadOpts = useMemo(
        () => ({ ...getAlbumSpreadOptions(album), totalPages }),
        [album, totalPages]
    );

    useEffect(() => {
        if (!albumId) {
            setImageReplacements([]);
            return undefined;
        }
        const loadReplacements = () => setImageReplacements(getImageReplacements(albumId));
        loadReplacements();
        const onReplacementsChanged = (e) => {
            if (e.detail?.albumId && e.detail.albumId !== albumId) return;
            loadReplacements();
        };
        window.addEventListener(IMAGE_REPLACEMENTS_CHANGED_EVENT, onReplacementsChanged);
        return () =>
            window.removeEventListener(IMAGE_REPLACEMENTS_CHANGED_EVENT, onReplacementsChanged);
    }, [albumId]);

    const currentSpreadIndex = useMemo(() => {
        const left =
            gridSelection?.leftPage ??
            getSpreadLeftPageIndex(bookPage, { ...spreadOpts, totalPages });
        return pageToSpreadIndex(left, { ...spreadOpts, totalPages });
    }, [gridSelection?.leftPage, bookPage, spreadOpts, totalPages]);

    useEffect(() => {
        setFeedbackFilter('this');
    }, [currentSpreadIndex]);

    const visiblePhotoPins = useMemo(
        () =>
            photoPins
                .filter(
                    (pin) =>
                        showAllFeedback ||
                        pageToSpreadIndex(pin.pageNum, spreadOpts) === currentSpreadIndex
                )
                .map((pin) => ({
                    ...pin,
                    spreadIndex: pageToSpreadIndex(pin.pageNum, spreadOpts),
                })),
        [photoPins, currentSpreadIndex, spreadOpts, showAllFeedback]
    );

    const visibleSwapMarks = useMemo(
        () =>
            swapMarks
                .filter((mark) => {
                    if (showAllFeedback) return true;
                    const a = parseSlotKey(mark.a);
                    const b = parseSlotKey(mark.b);
                    const idxA = pageToSpreadIndex(a.pageNum, spreadOpts);
                    const idxB = pageToSpreadIndex(b.pageNum, spreadOpts);
                    return idxA === currentSpreadIndex || idxB === currentSpreadIndex;
                })
                .map((mark) => {
                    const slotA = parseSlotKey(mark.a);
                    const slotB = parseSlotKey(mark.b);
                    const wholeA =
                        (isWholeSpreadLayout(album?.grid_layout) && slotA.pageNum > 0) ||
                        /\b(Whole|Both)\b/i.test(mark.labelA || '');
                    const wholeB =
                        (isWholeSpreadLayout(album?.grid_layout) && slotB.pageNum > 0) ||
                        /\b(Whole|Both)\b/i.test(mark.labelB || '');
                    return {
                        ...mark,
                        spreadA: pageToSpreadIndex(slotA.pageNum, spreadOpts),
                        spreadB: pageToSpreadIndex(slotB.pageNum, spreadOpts),
                        labelA: getSlotLabel(
                            slotA.pageNum,
                            slotA.cellId,
                            wholeA,
                            totalPages,
                            album
                        ),
                        labelB: getSlotLabel(
                            slotB.pageNum,
                            slotB.cellId,
                            wholeB,
                            totalPages,
                            album
                        ),
                    };
                }),
        [swapMarks, currentSpreadIndex, spreadOpts, album, totalPages, showAllFeedback]
    );

    const visibleImageReplacements = useMemo(
        () =>
            showAllFeedback
                ? imageReplacements
                : imageReplacements.filter(
                      (replacement) =>
                          Number(replacement.spreadIndex) === Number(currentSpreadIndex)
                  ),
        [imageReplacements, currentSpreadIndex, showAllFeedback]
    );

    const visibleSentMessages = useMemo(() => {
        if (showAllFeedback) {
            return Object.values(spreadCommentsBySpread || {})
                .flat()
                .filter((c) => c.author_type === 'photographer' && String(c.body || '').trim());
        }
        const rows = spreadCommentsBySpread?.[currentSpreadIndex] || [];
        return rows.filter(
            (c) => c.author_type === 'photographer' && String(c.body || '').trim()
        );
    }, [spreadCommentsBySpread, currentSpreadIndex, showAllFeedback]);

    const visibleClientMessages = useMemo(() => {
        if (showAllFeedback) {
            return Object.values(spreadCommentsBySpread || {})
                .flat()
                .filter(
                    (c) =>
                        c.author_type === 'client' &&
                        (String(c.body || '').trim() || hasCommentAttachment(c))
                );
        }
        const rows = spreadCommentsBySpread?.[currentSpreadIndex] || [];
        return rows.filter(
            (c) =>
                c.author_type === 'client' &&
                (String(c.body || '').trim() || hasCommentAttachment(c))
        );
    }, [spreadCommentsBySpread, currentSpreadIndex, showAllFeedback]);

    const visibleSpreadFeed = useMemo(() => {
        const feed = buildSpreadFeedbackFeed({
            photographerMessages: visibleSentMessages,
            clientMessages: visibleClientMessages,
            photoPins: visiblePhotoPins,
            swapMarks: visibleSwapMarks,
            imageReplacements: visibleImageReplacements,
            includeSwaps: swapsEnabled,
        });
        if (!showDoneOnly) return feed;
        return feed.filter((item) => isProofFeedItemMarkedDone(albumId, item));
    }, [
        visibleSentMessages,
        visibleClientMessages,
        visiblePhotoPins,
        visibleSwapMarks,
        visibleImageReplacements,
        swapsEnabled,
        showDoneOnly,
        albumId,
        proofSeenTick,
    ]);

    const doneFeedCount = useMemo(() => {
        const all = buildSpreadFeedbackFeed({
            photographerMessages: Object.values(spreadCommentsBySpread || {})
                .flat()
                .filter((c) => c.author_type === 'photographer' && String(c.body || '').trim()),
            clientMessages: Object.values(spreadCommentsBySpread || {})
                .flat()
                .filter(
                    (c) =>
                        c.author_type === 'client' &&
                        (String(c.body || '').trim() || hasCommentAttachment(c))
                ),
            photoPins: (photoPins || []).map((pin) => ({
                ...pin,
                spreadIndex: pageToSpreadIndex(pin.pageNum, spreadOpts),
            })),
            swapMarks: swapsEnabled ? swapMarks || [] : [],
            imageReplacements,
            includeSwaps: swapsEnabled,
        });
        return all.filter((item) => isProofFeedItemMarkedDone(albumId, item)).length;
    }, [
        spreadCommentsBySpread,
        photoPins,
        swapMarks,
        imageReplacements,
        swapsEnabled,
        spreadOpts,
        albumId,
        proofSeenTick,
    ]);

    const currentSpreadFeedCount = useMemo(() => {
        const pins = (photoPins || []).filter(
            (pin) => pageToSpreadIndex(pin.pageNum, spreadOpts) === currentSpreadIndex
        ).length;
        const swaps = swapsEnabled
            ? (swapMarks || []).filter((mark) => {
                  const a = parseSlotKey(mark.a);
                  const b = parseSlotKey(mark.b);
                  const idxA = pageToSpreadIndex(a.pageNum, spreadOpts);
                  const idxB = pageToSpreadIndex(b.pageNum, spreadOpts);
                  return idxA === currentSpreadIndex || idxB === currentSpreadIndex;
              }).length
            : 0;
        const rows = spreadCommentsBySpread?.[currentSpreadIndex] || [];
        const messages = rows.filter(
            (c) =>
                (c.author_type === 'photographer' && String(c.body || '').trim()) ||
                (c.author_type === 'client' &&
                    (String(c.body || '').trim() || hasCommentAttachment(c)))
        ).length;
        const replacements = imageReplacements.filter(
            (replacement) =>
                Number(replacement.spreadIndex) === Number(currentSpreadIndex)
        ).length;
        return pins + swaps + messages + replacements;
    }, [
        photoPins,
        swapMarks,
        swapsEnabled,
        spreadCommentsBySpread,
        imageReplacements,
        currentSpreadIndex,
        spreadOpts,
    ]);

    const currentSpreadReplacements = useMemo(
        () =>
            filterUploadReplacements(
                showAllFeedback
                    ? imageReplacements
                    : imageReplacements.filter(
                          (replacement) =>
                              Number(replacement.spreadIndex) === Number(currentSpreadIndex)
                      )
            ),
        [imageReplacements, currentSpreadIndex, showAllFeedback]
    );

    const currentSpreadPreviewUrl = useMemo(() => {
        void workspaceRevision;
        if (!albumId) return null;
        if (currentSpreadIndex <= 0 && spreadOpts.hasCovers) {
            const cover = resolveCoverImageSrc(album, { showSamples: false });
            if (cover) return cover;
        }
        const { left, right } = getSpreadPages(currentSpreadIndex, totalPages, spreadOpts);
        const live =
            getSpreadPhotoOverride(albumId, left) ||
            getPagePhotoOverride(albumId, left) ||
            (right !== left ? getPagePhotoOverride(albumId, right) : null) ||
            null;
        if (live) return live;
        const sorted = sortSpreadReplacements(currentSpreadReplacements);
        const latest = sorted.length ? sorted[sorted.length - 1] : null;
        return latest?.newUrl || null;
    }, [
        album,
        albumId,
        currentSpreadIndex,
        currentSpreadReplacements,
        spreadOpts,
        totalPages,
        workspaceRevision,
    ]);

    const [versionExpandToken, setVersionExpandToken] = useState(0);

    const handleNewVersionUpload = useCallback(async () => {
        if (!onUploadForCurrentSpread) return;
        try {
            const files = await pickImageFiles({
                multiple: false,
                accept: 'image/jpeg,image/png,image/webp,image/jpg,.jpg,.jpeg,.png,.webp',
            });
            if (!files?.length) return;
            await onUploadForCurrentSpread(files, { asNewVersion: true });
            setImageReplacements(getImageReplacements(albumId));
            setVersionExpandToken((n) => n + 1);
        } catch (e) {
            console.warn(e);
        }
    }, [onUploadForCurrentSpread, albumId]);

    const spreadPanelCount = currentSpreadFeedCount;

    const albumFeedbackCount = useMemo(() => {
        const pinCount = (photoPins || []).length;
        const swapCount = swapsEnabled ? (swapMarks || []).length : 0;
        let clientCount = 0;
        Object.values(spreadCommentsBySpread || {}).forEach((rows) => {
            (rows || []).forEach((c) => {
                if (
                    c.author_type === 'client' &&
                    (String(c.body || '').trim() || hasCommentAttachment(c))
                ) {
                    clientCount += 1;
                }
            });
        });
        return pinCount + swapCount + clientCount + (imageReplacements?.length || 0);
    }, [photoPins, swapMarks, swapsEnabled, spreadCommentsBySpread, imageReplacements]);

    const currentSpreadMetaLabel = useMemo(
        () => formatBookSpreadMetaLabel(currentSpreadIndex, totalPages, spreadOpts),
        [currentSpreadIndex, totalPages, spreadOpts]
    );

    const navItems = NAV_BASE.filter(
        (item) => !item.requiresCovers || album?.has_covers === true
    );

    const openSpreadUploadPicker = useCallback(() => {
        pickImageFiles({
            onPick: (files) => {
                if (files.length) onUploadForCurrentSpread?.(files, { asNewVersion: true });
            },
        });
    }, [onUploadForCurrentSpread]);

    const renderSpreadUploadActions = (showPicker = true) => {
        if (gridSelection?.mode === 'cover') return null;
        return (
            <>
                <div className="ae-spread-actions">
                    <div className="ae-spread-actions-header">
                        <span className="ae-spread-actions-title">Current spread actions</span>
                    </div>
                    <button
                        type="button"
                        className="ae-upload-zone ae-upload-zone--spread"
                        disabled={uploading || !canSelectGrid}
                        onClick={openSpreadUploadPicker}
                    >
                        <svg
                            className="ae-upload-zone-icon"
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                        >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span>
                            {uploading
                                ? 'Uploading…'
                                : 'Upload new photo for this spread'}
                        </span>
                        <span className="ae-upload-hint">
                            Replaces the photo on the current spread
                        </span>
                    </button>
                </div>
                {showPicker && canSelectGrid ? (
                    <button
                        type="button"
                        className="ae-btn-picker"
                        onClick={() => onOpenPicker?.()}
                    >
                        Choose photo for current slot
                    </button>
                ) : null}
            </>
        );
    };

    return (
        <aside className="ae-sidebar">
            <nav className="ae-nav-rail ae-nav-rail--tabs" aria-label="Editor tools">
                {navItems.map(({ id, label }) => {
                    const active = activePanel === id;
                    const showBadge = id === 'pin' && spreadPanelCount > 0;
                    return (
                        <button
                            key={id}
                            type="button"
                            className={`ae-nav-rail-btn${active ? ' ae-nav-rail-btn--active' : ''}`}
                            onClick={() => onPanelChange(id)}
                            aria-label={label}
                            aria-current={active ? 'true' : undefined}
                        >
                            <span className="ae-nav-rail-label">{label}</span>
                            {showBadge ? (
                                <span className="ae-nav-rail-count" aria-label={`${spreadPanelCount} on this spread`}>
                                    {spreadPanelCount > 99 ? '99+' : spreadPanelCount}
                                </span>
                            ) : null}
                        </button>
                    );
                })}
            </nav>

            <div className={`ae-panel${activePanel === 'pin' ? ' ae-panel--pin' : ''}${activePanel === 'comments' ? ' ae-panel--settings' : ''}${activePanel === 'cover' ? ' ae-panel--cover' : ''}`}>
                {activePanel === 'comments' && commentSettings}

                {activePanel === 'pin' && (
                    <div className="ae-panel-pin-layout">
                        <div className="ae-panel-pin-filters" role="tablist" aria-label="Feedback filters">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={feedbackFilter === 'this'}
                                className={`ae-panel-pin-filter${
                                    feedbackFilter === 'this' ? ' ae-panel-pin-filter--active' : ''
                                }`}
                                onClick={() => setFeedbackFilter('this')}
                            >
                                This spread {currentSpreadFeedCount}
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={feedbackFilter === 'done'}
                                className={`ae-panel-pin-filter${
                                    feedbackFilter === 'done' ? ' ae-panel-pin-filter--active' : ''
                                }`}
                                onClick={() => setFeedbackFilter('done')}
                            >
                                Done {doneFeedCount}
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={feedbackFilter === 'all'}
                                className={`ae-panel-pin-filter${
                                    feedbackFilter === 'all' ? ' ae-panel-pin-filter--active' : ''
                                }`}
                                onClick={() => setFeedbackFilter('all')}
                            >
                                All spreads {albumFeedbackCount}
                            </button>
                        </div>
                        <div className="ae-panel-pin-body">
                            {visibleSpreadFeed.length === 0 ? (
                                <p className="av-preview-sidebar-text ae-swap-marks-empty">
                                    {feedbackFilter === 'done'
                                        ? 'No completed feedback yet.'
                                        : feedbackFilter === 'all'
                                          ? 'No comments, swap requests, or photo changes in this album yet.'
                                          : 'No comments, swap requests, or photo changes on this spread yet.'}
                                </p>
                            ) : (
                                <div className="av-preview-sidebar-comments ae-panel-proof-feed">
                                    <AlbumPreviewSpreadFeed
                                        feed={visibleSpreadFeed}
                                        albumId={albumId}
                                        album={album}
                                        totalPages={totalPages}
                                        photoRevision={workspaceRevision}
                                        businessName={photographerName}
                                        spreadOpts={spreadOpts}
                                        proofMode
                                        seenTick={proofSeenTick}
                                        onNavigateToPin={onNavigateToPin}
                                        onNavigateToSlotKey={onNavigateToSwapSlotKey}
                                        onNavigateToSwapMark={onNavigateToSwapMark}
                                        onRemoveSwap={(id) => removeSwapMark(albumId, id)}
                                        onRemoveReplacement={(id) => {
                                            if (onRemoveImageReplacement) {
                                                onRemoveImageReplacement(id);
                                            } else {
                                                removeImageReplacement(albumId, id);
                                            }
                                        }}
                                        onNewVersion={handleNewVersionUpload}
                                        onRestoreReplacement={onRestoreImageReplacement}
                                    />
                                </div>
                            )}
                        </div>
                        {gridSelection?.mode !== 'cover' ? (
                            <div className="ae-panel-pin-footer">
                                <div className="ae-spread-compose-card">
                                    <SpreadVersionHistory
                                        albumId={albumId}
                                        replacements={currentSpreadReplacements}
                                        currentPreviewUrl={currentSpreadPreviewUrl}
                                        forceExpandToken={versionExpandToken}
                                        authorLabel="you"
                                        createdAt={album?.created_at || album?.updated_at || null}
                                        onNewVersion={handleNewVersionUpload}
                                        onRestore={onRestoreImageReplacement}
                                        onDelete={(row) => {
                                            if (!row?.id) return;
                                            if (onRemoveImageReplacement) {
                                                onRemoveImageReplacement(row.id);
                                            } else {
                                                removeImageReplacement(albumId, row.id);
                                            }
                                        }}
                                    />
                                    <EditorSpreadMessageCompose
                                        albumId={albumId}
                                        spreadIndex={currentSpreadIndex}
                                        authorName={photographerName}
                                        disabled={!albumId}
                                        visibleToName={clientVisibleName}
                                        spreadLabel={currentSpreadMetaLabel}
                                    />
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}

                {activePanel === 'grid' && (
                    <>
                        <h3 className="ae-panel-title">Grid layout</h3>
                        <p className="ae-panel-text">
                            These album setup options were selected at creation and are locked.
                        </p>
                        <div className="ae-locked-grid">
                            <div>
                                <span className="ae-locked-grid-label">Grid size</span>
                                <strong>{formatAlbumGridSizeDisplay(album)}</strong>
                            </div>
                            <div>
                                <span className="ae-locked-grid-label">Grid layout</span>
                                <strong>
                                    {GRID_LAYOUT_LABELS[album?.grid_layout] || GRID_LAYOUT_LABELS['two-page']}
                                </strong>
                            </div>
                        </div>
                        {canSelectGrid && gridEditSet === 'single' && (
                            <div className="ae-slot-picker ae-slot-picker--compact">
                                {Array.from({ length: PROOF_SLOT_COUNT }, (_, i) => i + 1).map((id) => (
                                    <button
                                        key={id}
                                        type="button"
                                        className={`ae-slot-btn${gridSelection?.mode === 'cell' &&
                                            gridSelection?.cellId === id
                                            ? ' ae-slot-btn--active'
                                            : ''
                                            }`}
                                        onClick={() => onSelectCell?.(id)}
                                    >
                                        {PROOF_CELL_LABELS[id]?.split(' ')[0] || id}
                                    </button>
                                ))}
                            </div>
                        )}
                        {canSelectGrid && (
                            <button type="button" className="ae-btn-picker" onClick={() => onOpenPicker?.()}>
                                Open photo picker
                            </button>
                        )}
                        <button
                            type="button"
                            className="ae-btn-clear"
                            onClick={() => onClearAllPhotos?.()}
                        >
                            Remove all images from album
                        </button>
                    </>
                )}

                {activePanel === 'cover' && (
                    <div className="ae-cover-panel">
                        <h2 className="ae-cover-panel__title">Edit cover</h2>
                        {typeof onUploadCoverFile === 'function' ? (
                            <CoverPhotoUploader
                                busy={uploading}
                                hasImage={hasCoverPhoto}
                                onSelectFile={onUploadCoverFile}
                            />
                        ) : null}
                        {hasCoverPhoto && typeof onRemoveCoverPhotos === 'function' ? (
                            <button
                                type="button"
                                className="ae-cover-panel__remove-btn"
                                onClick={onRemoveCoverPhotos}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <line x1="9" y1="9" x2="15" y2="15" />
                                    <line x1="15" y1="9" x2="9" y2="15" />
                                </svg>
                                Remove cover photos
                            </button>
                        ) : null}
                        {albumHasCoverSpreads(album) && !hasCoverPhoto ? (
                            <CoverLeatherColorPicker albumId={albumId} />
                        ) : null}
                        {onShowCoverSpineChange ? (
                            <div className="ae-cover-panel__spine">
                                <div className="ae-cover-panel__spine-text">
                                    <p className="ae-cover-panel__spine-title">Show spine</p>
                                    <p className="ae-cover-panel__spine-hint">
                                        Toggle the spine panel in the cover view
                                    </p>
                                </div>
                                <CoverSpineToggle
                                    on={showCoverSpine}
                                    onChange={() => onShowCoverSpineChange(!showCoverSpine)}
                                    label="Show spine in cover view"
                                />
                            </div>
                        ) : null}

                        {onSaveCoverText && !hasCoverPhoto ? (
                            <div className="ae-cover-panel__text-block">
                                <p className="ae-cover-panel__text-title">Cover text message</p>
                                <textarea
                                    className="ae-cover-panel__text-textarea"
                                    rows={3}
                                    maxLength={280}
                                    placeholder="e.g. Kellie & Fahim · June 2026"
                                    value={localCoverText}
                                    onChange={(e) => setLocalCoverText(e.target.value)}
                                />
                                <div className="ae-cover-panel__text-footer">
                                    {coverTextMessage && (
                                        <button
                                            type="button"
                                            className="ae-cover-panel__text-clear"
                                            onClick={() => {
                                                setLocalCoverText('');
                                                onSaveCoverText('');
                                            }}
                                        >
                                            Clear
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="ae-cover-panel__text-save"
                                        disabled={
                                            localCoverText.trim() === (resolvedCoverText || '').trim()
                                        }
                                        onClick={() => onSaveCoverText(localCoverText.trim())}
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}

                {activePanel === 'edit' && (
                    <>
                        <h3 className="ae-panel-title">Edit spreads</h3>
                        <p className="ae-panel-text">
                            Fine-tune photos already on the spread. Drag the photo to reposition; drag
                            top/bottom or left/right edges separately to zoom.
                        </p>
                        <ul className="ae-tips-list">
                            <li>Works on left, right, or whole-spread photos</li>
                            <li>Use arrow keys to change spreads</li>
                        </ul>
                    </>
                )}

                {activePanel === 'pages' && (
                    <>
                        <h3 className="ae-panel-title">Pages</h3>
                        <p className="ae-panel-text">
                            Each spread uses two pages (left and right). New pages are added at the end
                            of the album.
                        </p>
                        <div className="ae-page-stats" role="status">
                            <div className="ae-page-stat">
                                <span className="ae-page-stat-value">{totalPages}</span>
                                <span className="ae-page-stat-label">Total pages</span>
                            </div>
                            <div className="ae-page-stat">
                                <span className="ae-page-stat-value">{spreadCount}</span>
                                <span className="ae-page-stat-label">Spreads</span>
                            </div>
                        </div>
                        <div className="ae-page-actions">
                            <button
                                type="button"
                                className="ae-page-action-btn ae-page-action-btn--add"
                                disabled={!canAddPages || pageCountBusy}
                                onClick={() => onAddPages?.()}
                            >
                                {pageCountBusy ? 'Updating…' : `+ Add ${pagesPerSpread} pages`}
                            </button>
                            <button
                                type="button"
                                className="ae-page-action-btn ae-page-action-btn--remove"
                                disabled={!canRemovePages || pageCountBusy}
                                onClick={() => onRemovePages?.()}
                            >
                                {pageCountBusy ? 'Updating…' : `− Remove ${pagesPerSpread} pages`}
                            </button>
                        </div>
                        <p className="ae-panel-text ae-panel-text--muted">
                            1 cover plus {innerPageCount} inner page
                            {innerPageCount === 1 ? '' : 's'}. Removing pages clears photos on those
                            pages.
                        </p>
                    </>
                )}
            </div>
        </aside>
    );
}
