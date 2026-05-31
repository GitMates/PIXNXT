import React, { useRef } from 'react';
import { PROOF_CELL_LABELS, PROOF_SLOT_COUNT } from './albumSpreadGrid';
import AlbumSwapMarksPanel from './AlbumSwapMarksPanel';
import AlbumPhotoPinsPanel from './AlbumPhotoPinsPanel';
import { formatGridSizeLabel } from './albumGridSize';

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

const IconPin = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 2v8" />
        <path d="m8 10 4 12 4-12" />
        <circle cx="12" cy="6" r="3" />
    </svg>
);

const NAV = [
    { id: 'collections', label: 'Collections', icon: IconCollection },
    { id: 'swap', label: 'Swap', icon: IconSwap },
    { id: 'pin', label: 'Pin', icon: IconPin },
    { id: 'comments', label: 'Comments', icon: IconComments },
];

const GRID_LAYOUT_LABELS = {
    'two-page': 'Two-page grid (left + right)',
    'whole-spread': 'Whole-spread photo',
};

function placementHint(gridEditSet, gridSelection, canSelectGrid) {
    if (!canSelectGrid) {
        return 'Flip to an inner spread (not the cover) to place photos.';
    }
    if (gridSelection?.mode === 'cover') {
        return 'Cover page';
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
}) {
    const fileRef = useRef(null);

    const handleFiles = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length) onUploadToCollection?.(files);
        e.target.value = '';
    };

    return (
        <aside className="ae-sidebar">
            <div className="ae-sidebar-head">
                <p className="ae-sidebar-label">Album studio</p>
                <h2 className="ae-sidebar-title">{album?.name || 'Album'}</h2>
                <p className="ae-sidebar-meta">{totalPages} pages · 2-page spreads</p>
            </div>

            <nav className="ae-nav" aria-label="Editor tools">
                {NAV.map(({ id, label, icon: Icon }) => (
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
                                <span className="ae-nav-badge" aria-hidden>
                                    {swapMarks.length}
                                </span>
                            )}
                            {id === 'pin' && photoPins.length > 0 && (
                                <span className="ae-nav-badge ae-nav-badge--pin" aria-hidden>
                                    {photoPins.length}
                                </span>
                            )}
                        </span>
                    </button>
                ))}
            </nav>

            <div className="ae-panel">
                {activePanel === 'comments' && (
                    <>
                        <h3 className="ae-panel-title">Comment settings</h3>
                        {commentSettings || (
                            <p className="ae-panel-text ae-panel-text--muted">
                                Sign in to manage client comments and publishing.
                            </p>
                        )}
                        {commentsFeed}
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
                        />
                    </>
                )}

                {activePanel === 'pin' && (
                    <>
                        <h3 className="ae-panel-title">Pin</h3>
                        <p className="ae-panel-text">
                            Client pin notes appear here. To add pins, use the album preview — hover a
                            photo and click Pin.
                        </p>
                        <AlbumPhotoPinsPanel
                            albumId={albumId}
                            pins={photoPins}
                            gridLayout={album?.grid_layout || 'two-page'}
                            variant="panel"
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
                                {placementHint(gridEditSet, gridSelection, canSelectGrid)}
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
                                    {collectionItems.length === 1 ? '' : 's'} ready
                                </p>
                                <div className="ae-collection-grid" role="list">
                                    {collectionItems.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            className="ae-collection-thumb"
                                            onClick={() => onPlaceCollectionItem?.(item.id)}
                                            title={item.name}
                                        >
                                            <img src={item.dataUrl} alt="" loading="lazy" />
                                        </button>
                                    ))}
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
                                <strong>{formatGridSizeLabel(album?.grid_size)}</strong>
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
