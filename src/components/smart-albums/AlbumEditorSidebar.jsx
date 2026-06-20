import React, { useCallback, useRef, useState } from 'react';
import { filesFromInput } from '../../lib/uploadFileOrder';
import { PROOF_CELL_LABELS, PROOF_SLOT_COUNT } from './albumSpreadGrid';
import { countUnseenPhotoPins } from './albumPhotoPins';
import { countUnseenSwapMarks } from './albumSwapMarks';
import {
    countSpreadComments,
    countUnseenSpreadComments,
} from '../../services/smartAlbumComments.service';
import ProofPanelStats from './ProofPanelStats';
import AlbumSwapMarksPanel from './AlbumSwapMarksPanel';
import AlbumPhotoPinsPanel from './AlbumPhotoPinsPanel';
import { getCollectionItemDisplayUrl } from './albumCollection';
import { formatAlbumGridSizeDisplay } from './albumGridSize';
import { getSlotLabel } from './albumSwapMarks';
import {
    albumHasBlankCovers,
    albumUsesBookWrap,
    isEndHalfSpreadLeftPage,
    isInsideCoverSpreadLeft,
} from './albumSpreadUtils';

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

const IconSettings = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
);

const IconEditCover = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
);

const NAV_BASE = [
    { id: 'collections', label: 'Collections', icon: IconCollection },
    { id: 'cover', label: 'Edit cover', icon: IconEditCover, requiresCovers: true },
    { id: 'swap', label: 'Swap', icon: IconSwap },
    { id: 'pin', label: 'Comment', icon: IconComments },
    { id: 'comments', label: 'Setting', icon: IconSettings },
];

const GRID_LAYOUT_LABELS = {
    'two-page': 'Two-page grid (left + right)',
    'whole-spread': 'Whole-spread photo',
};

function placementHint(gridEditSet, gridSelection, canSelectGrid, totalPages, spreadOpts, album) {
    const hasCovers = spreadOpts?.hasCovers === true;
    if (!canSelectGrid) {
        return hasCovers
            ? 'Flip to an inner spread (not the cover) to place photos.'
            : 'Select a spread to place photos.';
    }
    if (hasCovers && gridSelection?.mode === 'cover') {
        return spreadOpts?.blankCovers
            ? 'Cover · back · spine · front'
            : 'Book wrap (front + back)';
    }
    if (
        gridSelection?.leftPage != null &&
        isInsideCoverSpreadLeft(gridSelection.leftPage, totalPages, spreadOpts) &&
        gridSelection.cellId === 2
    ) {
        return getSlotLabel(
            gridSelection.leftPage + 1,
            2,
            false,
            totalPages,
            album
        );
    }
    if (
        gridSelection?.leftPage != null &&
        isEndHalfSpreadLeftPage(gridSelection.leftPage, totalPages, spreadOpts)
    ) {
        return getSlotLabel(gridSelection.leftPage, 1, false, totalPages, album);
    }
    if (gridEditSet === 'whole' || gridSelection?.mode === 'spread') {
        return 'Whole grid · one photo across both pages';
    }
    if (gridSelection?.mode === 'cell' && gridSelection.cellId) {
        const label = PROOF_CELL_LABELS[gridSelection.cellId] || '';
        return `Slot ${gridSelection.cellId}${label ? ` · ${label}` : ''}`;
    }
    return 'Select a slot on the spread';
}

export default function AlbumEditorSidebar({
    activePanel,
    onPanelChange,
    album,
    totalPages,
    collectionItems = [],
    onUploadForCurrentSpread,
    onPlaceCollectionItem,
    onDeleteCollectionItem,
    onOpenPicker,
    onClearAllPhotos,
    uploading = false,
    gridEditSet = 'single',
    onGridEditSetChange,
    gridSelection = null,
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
    onNavigateToPin = null,
    onNavigateToSwapSlotKey = null,
    onReorderCollectionItem = null,
    proofSeenTick = 0,
}) {
    const fileRef = useRef(null);
    const collectionDragFromRef = useRef(null);
    const [collectionDragOverIndex, setCollectionDragOverIndex] = useState(null);
    void proofSeenTick;
    const unseenPinCount = countUnseenPhotoPins(albumId, photoPins);
    const unseenSwapCount = countUnseenSwapMarks(albumId, swapMarks);
    const unseenSpreadCommentCount = countUnseenSpreadComments(
        albumId,
        spreadCommentsBySpread
    );
    const totalSpreadCommentCount = countSpreadComments(spreadCommentsBySpread);
    const totalCommentCount = photoPins.length + totalSpreadCommentCount;
    const unresolvedCommentCount = unseenPinCount + unseenSpreadCommentCount;
    const navItems = NAV_BASE.filter(
        (item) => !item.requiresCovers || album?.has_covers === true
    );

    const handleSpreadUpload = (e) => {
        const files = filesFromInput(e.target.files);
        if (files.length) onUploadForCurrentSpread?.(files);
        e.target.value = '';
    };

    const handleCollectionDragStart = useCallback((index) => {
        collectionDragFromRef.current = index;
    }, []);

    const handleCollectionDragOver = useCallback((index) => {
        setCollectionDragOverIndex(index);
    }, []);

    const handleCollectionDrop = useCallback(
        (toIndex) => {
            const fromIndex = collectionDragFromRef.current;
            collectionDragFromRef.current = null;
            setCollectionDragOverIndex(null);
            if (fromIndex == null || fromIndex === toIndex) return;
            onReorderCollectionItem?.(fromIndex, toIndex);
        },
        [onReorderCollectionItem]
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
                        {id === 'swap' && swapMarks.length > 0 && (
                            <span
                                className={`ae-nav-rail-badge${
                                    unseenSwapCount > 0 ? ' ae-nav-rail-badge--unseen' : ''
                                }`}
                                aria-hidden
                            >
                                {unseenSwapCount > 0 ? unseenSwapCount : swapMarks.length}
                            </span>
                        )}
                        {id === 'pin' && totalCommentCount > 0 && (
                            <span
                                className={`ae-nav-rail-badge ae-nav-rail-badge--pin${
                                    unresolvedCommentCount > 0
                                        ? ' ae-nav-rail-badge--unseen'
                                        : ''
                                }`}
                                aria-hidden
                            >
                                {unresolvedCommentCount > 0
                                    ? unresolvedCommentCount
                                    : totalCommentCount}
                            </span>
                        )}
                    </button>
                ))}
            </nav>

            <div className="ae-panel">
                {activePanel === 'comments' && (
                    <>
                        <h3 className="ae-panel-title">Settings</h3>
                        {commentSettings || (
                            <p className="ae-panel-text ae-panel-text--muted">
                                Sign in to manage client comments and publishing.
                            </p>
                        )}
                    </>
                )}

                {activePanel === 'swap' && (
                    <>
                        <h3 className="ae-panel-title">Swap</h3>
                        <ProofPanelStats
                            unresolved={unseenSwapCount}
                            total={swapMarks.length}
                            totalLabel="Total swaps"
                        />
                        <p className="ae-panel-text">
                            Hover a photo on the spread and click Swap to mark two positions. Once
                            marked, the pair is locked until you unlock it here.
                        </p>
                        <AlbumSwapMarksPanel
                            albumId={albumId}
                            album={album}
                            totalPages={totalPages}
                            marks={swapMarks}
                            gridLayout={album?.grid_layout || 'two-page'}
                            variant="panel"
                            seenTick={proofSeenTick}
                            onNavigateToSlotKey={onNavigateToSwapSlotKey}
                        />
                    </>
                )}

                {activePanel === 'pin' && (
                    <>
                        <h3 className="ae-panel-title">Comment</h3>
                        <ProofPanelStats
                            unresolved={unresolvedCommentCount}
                            total={totalCommentCount}
                            totalLabel="Total comments"
                        />
                        <p className="ae-panel-text">
                            Client photo comments appear here. To add comments, use the album preview
                            — open the Comment tab, then click a photo.
                        </p>
                        <AlbumPhotoPinsPanel
                            albumId={albumId}
                            album={album}
                            totalPages={totalPages}
                            pins={photoPins}
                            gridLayout={album?.grid_layout || 'two-page'}
                            variant="panel"
                            onNavigateToPin={onNavigateToPin}
                            seenTick={proofSeenTick}
                        />
                    </>
                )}

                {activePanel === 'collections' && (
                    <>
                        <h3 className="ae-panel-title">Collections</h3>
                        <p className="ae-panel-text">
                            Upload a new photo for the spread you are viewing, or pick from the
                            collection below.
                        </p>
                        {canSelectGrid && (
                            <p className="ae-selection-badge" role="status">
                                {placementHint(
                                    gridEditSet,
                                    gridSelection,
                                    canSelectGrid,
                                    totalPages,
                                    {
                                        hasCovers: album?.has_covers === true,
                                        blankCovers: albumHasBlankCovers(album),
                                    },
                                    album
                                )}
                            </p>
                        )}
                        <div className="ae-spread-actions">
                            <div className="ae-spread-actions-header">
                                <span className="ae-spread-actions-title">Current spread actions</span>
                            </div>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*,application/pdf,.pdf"
                                className="ae-file-input"
                                onChange={handleSpreadUpload}
                            />
                            <button
                                type="button"
                                className="ae-upload-zone ae-upload-zone--spread"
                                disabled={uploading || !canSelectGrid}
                                onClick={() => fileRef.current?.click()}
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
                        {canSelectGrid && (
                            <button
                                type="button"
                                className="ae-btn-picker"
                                onClick={() => onOpenPicker?.()}
                            >
                                Choose photo for current slot
                            </button>
                        )}
                        <div className="ae-panel-status-row">
                            <span className="ae-panel-status-meta">{albumSpreadMeta}</span>
                            <span
                                className={`ae-panel-status-count${
                                    collectionItems.length === 0 ? ' ae-panel-status-count--muted' : ''
                                }`}
                            >
                                {collectionItems.length === 0
                                    ? 'No photos yet'
                                    : `${collectionItems.length} photo${
                                          collectionItems.length === 1 ? '' : 's'
                                      } ready`}
                            </span>
                        </div>
                        {collectionItems.length > 0 && (
                            <>
                                <div className="ae-collection-grid" role="list">
                                    {collectionItems.map((item, index) => (
                                        <div
                                            key={item.id}
                                            className={`ae-collection-thumb-wrap${
                                                collectionDragOverIndex === index
                                                    ? ' ae-collection-thumb-wrap--drag-over'
                                                    : ''
                                            }`}
                                            role="listitem"
                                        >
                                            <button
                                                type="button"
                                                className="ae-collection-thumb"
                                                draggable
                                                onClick={() => onPlaceCollectionItem?.(item.id)}
                                                onDragStart={(e) => {
                                                    e.stopPropagation();
                                                    e.dataTransfer.effectAllowed = 'move';
                                                    handleCollectionDragStart(index);
                                                }}
                                                onDragOver={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleCollectionDragOver(index);
                                                }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleCollectionDrop(index);
                                                }}
                                                onDragEnd={handleCollectionDragEnd}
                                                title={`${index + 1}. ${item.name || 'Photo'} — click to place`}
                                            >
                                                <span className="ae-collection-order" aria-hidden>
                                                    {index + 1}
                                                </span>
                                                <img
                                                    src={
                                                        getCollectionItemDisplayUrl(item) ||
                                                        undefined
                                                    }
                                                    alt=""
                                                    loading="lazy"
                                                    draggable={false}
                                                />
                                            </button>
                                            <button
                                                type="button"
                                                className="ae-collection-thumb-delete"
                                                aria-label={`Delete ${item.name || 'photo'}`}
                                                title="Delete photo"
                                                disabled={uploading}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteCollectionItem?.(item.id);
                                                }}
                                            >
                                                <svg
                                                    width="12"
                                                    height="12"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    aria-hidden
                                                >
                                                    <path d="M18 6 6 18M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <p className="ae-collection-order-note">
                                    {albumUsesBookWrap(album)
                                        ? 'Order 1 → book wrap (front right + back left). Photos 2+ fill inner pages in order.'
                                        : albumHasBlankCovers(album)
                                          ? 'Blank front & back covers. All photos fill inner pages in upload order.'
                                          : 'Order 1 → first page (left), 2 → second page (right), then on. No dedicated cover spreads.'}{' '}
                                    Drag thumbnails to reorder; spreads update automatically.
                                </p>
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
                                        className={`ae-slot-btn${
                                            gridSelection?.mode === 'cell' &&
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
                    <>
                        <h3 className="ae-panel-title">Edit cover</h3>
                        {albumHasBlankCovers(album) ? (
                            <>
                                <p className="ae-panel-text">
                                    Covers start blank. Choose a wide photo for back, spine, and
                                    front — or leave empty for a plain cover spread.
                                </p>
                                <p className="ae-selection-badge" role="status">
                                    Cover · back · spine · front
                                </p>
                                <button
                                    type="button"
                                    className="ae-btn-picker"
                                    onClick={() => onOpenPicker?.()}
                                >
                                    Choose cover photo
                                </button>
                                <p className="ae-panel-text ae-panel-text--muted">
                                    Upload in Collections first, then pick a photo here. If the
                                    image is wider than inner spreads, drag the red spine lines to
                                    adjust width.
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="ae-panel-text">
                                    Book wrap (photo 1) is wider than inner spreads. The center strip
                                    is the spine; outer portions are back and front covers (not
                                    shown on spine in the flipbook).
                                </p>
                                <p className="ae-selection-badge" role="status">
                                    Book wrap · back · spine · front
                                </p>
                                <button
                                    type="button"
                                    className="ae-btn-picker"
                                    onClick={() => onOpenPicker?.()}
                                >
                                    Choose book wrap photo
                                </button>
                                <p className="ae-panel-text ae-panel-text--muted">
                                    Upload in Collections first — order 1 is used here. Drag the red
                                    spine lines on each side of the spine to adjust its width.
                                </p>
                            </>
                        )}
                    </>
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
