import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pickImageFiles } from '../../lib/pickImageFiles';
import { PROOF_CELL_LABELS, PROOF_SLOT_COUNT, getSpreadLeftPageIndex } from './albumSpreadGrid';
import {
    getSlotLabel,
    parseSlotKey,
    removeSwapMark,
} from './albumSwapMarks';
import EditorSpreadMessageCompose from './EditorSpreadMessageCompose';
import AlbumPreviewSpreadFeed from './AlbumPreviewSpreadFeed';
import { buildSpreadFeedbackFeed } from './spreadFeedbackFeed';
import CollectionSpreadThumb from './CollectionSpreadThumb';
import CoverLeatherColorPicker from './CoverLeatherColorPicker';
import {
    resolveCollectionSpreadLabel,
    resolveCollectionThumbLayout,
} from './collectionThumbLayout';
import { getLockedCollectionIndices } from './albumCollection';
import { formatAlbumGridSizeDisplay, parseGridSizeAspect } from './albumGridSize';
import {
    getImageReplacements,
    IMAGE_REPLACEMENTS_CHANGED_EVENT,
    removeImageReplacement,
} from './albumImageReplacements';
import {
    albumHasBlankCovers,
    albumUsesBookWrap,
    getAlbumSpreadOptions,
    isWholeSpreadLayout,
    pageToSpreadIndex,
} from './albumSpreadUtils';
import '../../pages/smart-albums/AlbumViewer.css';
import './AlbumCoverPanel.css';

const ICON_PROPS = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.35,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
};

const IconCollection = () => (
    <svg {...ICON_PROPS}>
        <rect x="4.25" y="4.25" width="6.25" height="6.25" rx="1.15" />
        <rect x="13.5" y="4.25" width="6.25" height="6.25" rx="1.15" />
        <rect x="4.25" y="13.5" width="6.25" height="6.25" rx="1.15" />
        <rect x="13.5" y="13.5" width="6.25" height="6.25" rx="1.15" />
    </svg>
);

const IconComments = () => (
    <svg {...ICON_PROPS}>
        <path d="M7.25 5.75h9.5a1.75 1.75 0 0 1 1.75 1.75v6.75a1.75 1.75 0 0 1-1.75 1.75H11.5L7.25 18.5v-3.25a1.75 1.75 0 0 1-1.75-1.75V7.5a1.75 1.75 0 0 1 1.75-1.75z" />
    </svg>
);

const IconSettings = () => (
    <svg {...ICON_PROPS} strokeWidth={1.65}>
        <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const IconEditCover = () => (
    <svg {...ICON_PROPS}>
        <path d="M12 5.25c-4.2-1.15-7.75-.55-7.75 2.45V17c0 2.35 3.05 2.85 7.75 1.55" />
        <path d="M12 5.25c4.2-1.15 7.75-.55 7.75 2.45V17c0 2.35-3.05 2.85-7.75 1.55" />
        <path d="M12 5.25v13.3" />
    </svg>
);

const NAV_BASE = [
    { id: 'collections', label: 'Collections', icon: IconCollection },
    { id: 'cover', label: 'Edit cover', icon: IconEditCover, requiresCovers: true },
    { id: 'pin', label: 'Comment', icon: IconComments },
    { id: 'comments', label: 'Settings', icon: IconSettings },
];

const GRID_LAYOUT_LABELS = {
    'two-page': 'Two-page grid (left + right)',
    'whole-spread': 'Whole-spread photo',
};

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
    collectionItems = [],
    collectionRevision = 0,
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
    onReorderCollectionItem = null,
    proofSeenTick = 0,
    showCoverSpine = true,
    onShowCoverSpineChange = null,
}) {
    const collectionDragFromRef = useRef(null);
    const [collectionDragOverIndex, setCollectionDragOverIndex] = useState(null);
    const [imageReplacements, setImageReplacements] = useState([]);
    void proofSeenTick;
    const swapsEnabled = album?.messages_enabled !== false;

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

    const collectionThumbLayouts = useMemo(
        () =>
            collectionItems.map((_, index) =>
                resolveCollectionThumbLayout(index, collectionItems, album, totalPages)
            ),
        [collectionItems, album, totalPages]
    );
    const collectionSpreadLabels = useMemo(
        () =>
            collectionItems.map((_, index) =>
                resolveCollectionSpreadLabel(index, collectionItems, album, totalPages)
            ),
        [collectionItems, album, totalPages]
    );
    const collectionThumbAspect = useMemo(() => {
        const pageAspect = parseGridSizeAspect(album?.grid_size || 'square');
        return 2 * pageAspect;
    }, [album?.grid_size]);
    const lockedCollectionIndices = useMemo(
        () => getLockedCollectionIndices(collectionItems, album),
        [collectionItems, album]
    );

    const currentSpreadIndex = useMemo(() => {
        const left =
            gridSelection?.leftPage ??
            getSpreadLeftPageIndex(bookPage, { ...spreadOpts, totalPages });
        return pageToSpreadIndex(left, { ...spreadOpts, totalPages });
    }, [gridSelection?.leftPage, bookPage, spreadOpts, totalPages]);

    const visiblePhotoPins = useMemo(
        () =>
            photoPins
                .filter(
                    (pin) =>
                        pageToSpreadIndex(pin.pageNum, spreadOpts) === currentSpreadIndex
                )
                .map((pin) => ({
                    ...pin,
                    spreadIndex: pageToSpreadIndex(pin.pageNum, spreadOpts),
                })),
        [photoPins, currentSpreadIndex, spreadOpts]
    );

    const visibleSwapMarks = useMemo(
        () =>
            swapMarks
                .filter((mark) => {
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
        [swapMarks, currentSpreadIndex, spreadOpts, album, totalPages]
    );

    const visibleImageReplacements = useMemo(
        () =>
            imageReplacements.filter(
                (replacement) => replacement.spreadIndex === currentSpreadIndex
            ),
        [imageReplacements, currentSpreadIndex]
    );

    const visibleSentMessages = useMemo(() => {
        const rows = spreadCommentsBySpread?.[currentSpreadIndex] || [];
        return rows.filter(
            (c) => c.author_type === 'photographer' && String(c.body || '').trim()
        );
    }, [spreadCommentsBySpread, currentSpreadIndex]);

    const visibleClientMessages = useMemo(() => {
        const rows = spreadCommentsBySpread?.[currentSpreadIndex] || [];
        return rows.filter((c) => c.author_type === 'client' && String(c.body || '').trim());
    }, [spreadCommentsBySpread, currentSpreadIndex]);

    const visibleSpreadFeed = useMemo(
        () =>
            buildSpreadFeedbackFeed({
                photographerMessages: visibleSentMessages,
                clientMessages: visibleClientMessages,
                photoPins: visiblePhotoPins,
                swapMarks: visibleSwapMarks,
                imageReplacements: visibleImageReplacements,
                includeSwaps: swapsEnabled,
            }),
        [
            visibleSentMessages,
            visibleClientMessages,
            visiblePhotoPins,
            visibleSwapMarks,
            visibleImageReplacements,
            swapsEnabled,
        ]
    );

    const spreadPanelCount = visibleSpreadFeed.length;

    const navItems = NAV_BASE.filter(
        (item) => !item.requiresCovers || album?.has_covers === true
    );

    const openSpreadUploadPicker = useCallback(() => {
        pickImageFiles({
            onPick: (files) => {
                if (files.length) onUploadForCurrentSpread?.(files);
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
                            Replaces the photo on the spread you are viewing
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

    const handleCollectionDragStart = useCallback(
        (index) => {
            if (lockedCollectionIndices.has(index)) return;
            collectionDragFromRef.current = index;
        },
        [lockedCollectionIndices]
    );

    const handleCollectionDragOver = useCallback(
        (index) => {
            if (lockedCollectionIndices.has(index)) return;
            setCollectionDragOverIndex(index);
        },
        [lockedCollectionIndices]
    );

    const handleCollectionDrop = useCallback(
        (toIndex) => {
            const fromIndex = collectionDragFromRef.current;
            collectionDragFromRef.current = null;
            setCollectionDragOverIndex(null);
            if (fromIndex == null || fromIndex === toIndex) return;
            if (lockedCollectionIndices.has(fromIndex) || lockedCollectionIndices.has(toIndex)) {
                return;
            }
            onReorderCollectionItem?.(fromIndex, toIndex);
        },
        [onReorderCollectionItem, lockedCollectionIndices]
    );

    const handleCollectionDragEnd = useCallback(() => {
        collectionDragFromRef.current = null;
        setCollectionDragOverIndex(null);
    }, []);

    const albumSpreadMeta = `${totalPages} pages · ${pagesPerSpread}-page spreads`;

    return (
        <aside className="ae-sidebar">
            <nav className="ae-nav-rail" aria-label="Editor tools">
                {navItems.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        type="button"
                        className={`ae-nav-rail-btn${activePanel === id ? ' ae-nav-rail-btn--active' : ''}`}
                        onClick={() => onPanelChange(id)}
                        aria-label={label}
                        aria-current={activePanel === id ? 'true' : undefined}
                        title={label}
                    >
                        <span className="ae-nav-rail-icon">
                            <Icon />
                        </span>
                    </button>
                ))}
            </nav>

            <div className={`ae-panel${activePanel === 'pin' ? ' ae-panel--pin' : ''}${activePanel === 'comments' ? ' ae-panel--settings' : ''}${activePanel === 'cover' ? ' ae-panel--cover' : ''}`}>
                {activePanel === 'comments' && commentSettings}

                {activePanel === 'pin' && (
                    <div className="ae-panel-pin-layout">
                        <div className="ae-panel-pin-body">
                            <h3 className="ae-panel-title">Comment</h3>
                            {spreadPanelCount === 0 ? (
                                <p className="av-preview-sidebar-text ae-swap-marks-empty">
                                    No comments, swap requests, or photo changes on this spread
                                    yet.
                                </p>
                            ) : (
                                <div className="av-preview-sidebar-comments ae-panel-proof-feed">
                                    <AlbumPreviewSpreadFeed
                                        feed={visibleSpreadFeed}
                                        albumId={albumId}
                                        businessName={photographerName}
                                        spreadOpts={spreadOpts}
                                        proofMode
                                        seenTick={proofSeenTick}
                                        onNavigateToPin={onNavigateToPin}
                                        onNavigateToSlotKey={onNavigateToSwapSlotKey}
                                        onRemoveSwap={(id) => removeSwapMark(albumId, id)}
                                        onRemoveReplacement={(id) =>
                                            removeImageReplacement(albumId, id)
                                        }
                                    />
                                </div>
                            )}
                        </div>
                        {gridSelection?.mode !== 'cover' ? (
                            <div className="ae-panel-pin-footer">
                                <EditorSpreadMessageCompose
                                    albumId={albumId}
                                    spreadIndex={currentSpreadIndex}
                                    authorName={photographerName}
                                    disabled={!albumId}
                                />
                                {renderSpreadUploadActions(false)}
                            </div>
                        ) : null}
                    </div>
                )}

                {activePanel === 'collections' && (
                    <>
                        <h3 className="ae-panel-title">Collections</h3>
                        <div className="ae-panel-status-row">
                            <span className="ae-panel-status-meta">{albumSpreadMeta}</span>
                        </div>
                        {collectionItems.length > 0 && (
                            <>
                                <div className="ae-collection-grid" role="list">
                                    {collectionItems.map((item, index) => {
                                        const isLocked = lockedCollectionIndices.has(index);
                                        const spreadLabel = collectionSpreadLabels[index] || '';
                                        const spreadTitle = spreadLabel
                                            ? spreadLabel === 'Cover' || spreadLabel === 'Back'
                                                ? spreadLabel
                                                : `Spread ${spreadLabel}`
                                            : `Photo ${index + 1}`;
                                        return (
                                        <div
                                            key={item.id}
                                            className={`ae-collection-thumb-wrap${collectionDragOverIndex === index
                                                ? ' ae-collection-thumb-wrap--drag-over'
                                                : ''
                                                }`}
                                            role="listitem"
                                        >
                                            <div
                                                className={`ae-collection-thumb${isLocked ? ' ae-collection-thumb--locked' : ''}`}
                                                style={{ aspectRatio: collectionThumbAspect }}
                                                draggable={!isLocked}
                                                onDragStart={(e) => {
                                                    if (isLocked) {
                                                        e.preventDefault();
                                                        return;
                                                    }
                                                    e.stopPropagation();
                                                    e.dataTransfer.effectAllowed = 'move';
                                                    handleCollectionDragStart(index);
                                                }}
                                                onDragOver={(e) => {
                                                    if (isLocked) return;
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleCollectionDragOver(index);
                                                }}
                                                onDrop={(e) => {
                                                    if (isLocked) return;
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleCollectionDrop(index);
                                                }}
                                                onDragEnd={handleCollectionDragEnd}
                                                title={`${spreadTitle}. ${item.name || 'Photo'}${isLocked ? ' — fixed position' : ''}`}
                                            >
                                                <span
                                                    className={`ae-collection-order${spreadLabel.length > 2 ? ' ae-collection-order--wide' : ''}`}
                                                    aria-hidden
                                                >
                                                    {spreadLabel || index + 1}
                                                </span>
                                                <CollectionSpreadThumb
                                                    key={`${item.id}-r${collectionRevision}`}
                                                    layout={collectionThumbLayouts[index]}
                                                    alt=""
                                                />
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </>
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
                        {albumHasBlankCovers(album) ? (
                            <p className="ae-cover-panel__intro">
                                Covers start blank. Choose a wide photo for back, spine, and
                                front — or leave empty for a plain leather cover spread.
                            </p>
                        ) : (
                            <p className="ae-cover-panel__intro">
                                Book wrap (photo 1) is wider than inner spreads. The center strip
                                is the spine; outer portions are back and front covers (not
                                shown on spine in the flipbook).
                            </p>
                        )}
                        <button
                            type="button"
                            className="ae-cover-panel__upload"
                            disabled={uploading || !canSelectGrid}
                            onClick={openSpreadUploadPicker}
                        >
                            <svg
                                className="ae-cover-panel__upload-icon"
                                width="22"
                                height="22"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden
                            >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            <span className="ae-cover-panel__upload-title">
                                {uploading ? 'Uploading…' : 'Upload new photo for this cover'}
                            </span>
                            <span className="ae-cover-panel__upload-hint">
                                Replaces the photo on the cover you are viewing
                            </span>
                        </button>
                        {albumHasBlankCovers(album) ? (
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
