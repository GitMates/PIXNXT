import React, { useCallback, useRef, useState } from 'react';
import { filesFromInput } from '../../lib/uploadFileOrder';
import { PROOF_CELL_LABELS, PROOF_SLOT_COUNT } from './albumSpreadGrid';
import { countUnseenPhotoPins } from './albumPhotoPins';
import { countUnseenSwapMarks } from './albumSwapMarks';
import AlbumSwapMarksPanel from './AlbumSwapMarksPanel';
import AlbumPhotoPinsPanel from './AlbumPhotoPinsPanel';
import { getCollectionItemDisplayUrl } from './albumCollection';
import {
    formatAlbumGridSizeDisplay,
    formatGridLayoutLabel,
} from './albumGridSize';
import { isCoverInsidePage, isEndHalfSpreadLeftPage } from './albumSpreadUtils';

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

function placementHint(gridEditSet, gridSelection, canSelectGrid, totalPages, spreadOpts) {
    const hasCovers = spreadOpts?.hasCovers === true;
    if (!canSelectGrid) {
        return hasCovers
            ? 'Flip to an inner spread (not the cover) to place photos.'
            : 'Select a spread to place photos.';
    }
    if (hasCovers && gridSelection?.mode === 'cover') {
        return 'Book wrap (front + back)';
    }
    if (
        gridSelection?.leftPage != null &&
        isCoverInsidePage(gridSelection.leftPage, totalPages) &&
        gridSelection.cellId === 2
    ) {
        return 'Inside cover · right page';
    }
    if (
        gridSelection?.leftPage != null &&
        isEndHalfSpreadLeftPage(gridSelection.leftPage, totalPages, spreadOpts)
    ) {
        return 'Last spread · left page only';
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
    onUploadToCollection,
    onPlaceCollectionItem,
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
    commentsFeed = null,
    swapMarks = [],
    photoPins = [],
    albumId = null,
    onNavigateToPin = null,
    onNavigateToSwapSlotKey = null,
    onReorderCollectionItem = null,
    onApplyCollectionOrder = null,
    proofSeenTick = 0,
}) {
    const fileRef = useRef(null);
    const collectionDragFromRef = useRef(null);
    const [collectionDragOverIndex, setCollectionDragOverIndex] = useState(null);
    void proofSeenTick;
    const unseenPinCount = countUnseenPhotoPins(albumId, photoPins);
    const unseenSwapCount = countUnseenSwapMarks(albumId, swapMarks);
    const navItems = NAV_BASE.filter(
        (item) => !item.requiresCovers || album?.has_covers === true
    );

    const handleFiles = (e) => {
        const files = filesFromInput(e.target.files);
        if (files.length) onUploadToCollection?.(files);
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

    return (
        <aside className="ae-sidebar">
            <div className="ae-sidebar-head">
                <p className="ae-sidebar-label">Album studio</p>
                <h2 className="ae-sidebar-title">{album?.name || 'Album'}</h2>
                <p className="ae-sidebar-meta">
                    {totalPages} pages · {formatGridLayoutLabel(album?.grid_layout)}
                </p>
            </div>

            <nav className="ae-nav" aria-label="Editor tools">
                {navItems.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        type="button"
                        className={`ae-nav-btn${activePanel === id ? ' ae-nav-btn--active' : ''}`}
                        onClick={() => onPanelChange(id)}
                    >
                        <span className="ae-nav-icon">
                            <Icon />
                        </span>
                        <span className="ae-nav-label">
                            {label}
                            {id === 'swap' && swapMarks.length > 0 && (
                                <span
                                    className={`ae-nav-badge${
                                        unseenSwapCount > 0 ? ' ae-nav-badge--unseen' : ''
                                    }`}
                                    aria-hidden
                                >
                                    {unseenSwapCount > 0 ? unseenSwapCount : swapMarks.length}
                                </span>
                            )}
                            {id === 'pin' && photoPins.length > 0 && (
                                <span
                                    className={`ae-nav-badge ae-nav-badge--pin${
                                        unseenPinCount > 0 ? ' ae-nav-badge--unseen' : ''
                                    }`}
                                    aria-hidden
                                >
                                    {unseenPinCount > 0 ? unseenPinCount : photoPins.length}
                                </span>
                            )}
                        </span>
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
                        <p className="ae-panel-text">
                            Hover a photo on the spread and click Swap to mark two positions. Once
                            marked, the pair is locked until you unlock it here.
                        </p>
                        <AlbumSwapMarksPanel
                            albumId={albumId}
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
                        <p className="ae-panel-text">
                            Client photo comments appear here. To add comments, use the album preview
                            — open the Comment tab, then click a photo.
                        </p>
                        <AlbumPhotoPinsPanel
                            albumId={albumId}
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
                            Upload photos here, then click a slot on the spread to choose which image
                            to place.
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
                                    }
                                )}
                            </p>
                        )}
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*,application/pdf,.pdf"
                            multiple
                            className="ae-file-input"
                            onChange={handleFiles}
                        />
                        <button
                            type="button"
                            className="ae-upload-zone"
                            disabled={uploading}
                            onClick={() => fileRef.current?.click()}
                        >
                            <span>{uploading ? 'Uploading…' : 'Upload to collection'}</span>
                            <span className="ae-upload-hint">JPG, PNG, PDF · each PDF page becomes a photo</span>
                        </button>
                        {canSelectGrid && (
                            <button
                                type="button"
                                className="ae-btn-picker"
                                onClick={() => onOpenPicker?.()}
                            >
                                Choose photo for current slot
                            </button>
                        )}
                        {collectionItems.length === 0 ? (
                            <p className="ae-panel-text ae-panel-text--muted ae-collection-count">
                                No photos yet — upload above.
                            </p>
                        ) : (
                            <>
                                <p className="ae-collection-count">
                                    {collectionItems.length} photo
                                    {collectionItems.length === 1 ? '' : 's'} ready · order 1–
                                    {collectionItems.length}
                                </p>
                                <div className="ae-collection-grid" role="list">
                                    {collectionItems.map((item, index) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            className={`ae-collection-thumb${
                                                collectionDragOverIndex === index
                                                    ? ' ae-collection-thumb--drag-over'
                                                    : ''
                                            }`}
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
                                            title={`${index + 1}. ${item.name || 'Photo'}`}
                                        >
                                            <span className="ae-collection-order" aria-hidden>
                                                {index + 1}
                                            </span>
                                            <img
                                                src={getCollectionItemDisplayUrl(item) || undefined}
                                                alt=""
                                                loading="lazy"
                                                draggable={false}
                                            />
                                        </button>
                                    ))}
                                </div>
                                <p className="ae-collection-order-note">
                                    {album?.has_covers === true
                                        ? 'Order 1 → book wrap (front right + back left). Photos 2+ fill inner pages in order.'
                                        : 'Order 1 → first page (left), 2 → second page (right), then on. No dedicated cover spreads.'}{' '}
                                    Drag thumbnails to reorder; spreads update automatically.
                                </p>
                                <button
                                    type="button"
                                    className="ae-btn-apply-order"
                                    onClick={() => onApplyCollectionOrder?.()}
                                >
                                    Apply collection order to spreads
                                </button>
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
                        <p className="ae-panel-text">
                            One spread shows your book wrap: collection photo 1 fills the whole spread
                            (left half = back cover, right half = front).
                        </p>
                        <p className="ae-selection-badge" role="status">
                            Book wrap · whole spread
                        </p>
                        <button
                            type="button"
                            className="ae-btn-picker"
                            onClick={() => onOpenPicker?.()}
                        >
                            Choose book wrap photo
                        </button>
                        <p className="ae-panel-text ae-panel-text--muted">
                            Upload in Collections first — order 1 is used here. Click the spread to
                            replace the wrap image.
                        </p>
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
