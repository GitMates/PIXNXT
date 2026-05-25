import React, { useRef } from 'react';
import { PROOF_CELL_LABELS, PROOF_SLOT_COUNT } from './albumSpreadGrid';

const IconGrid = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="3" width="8" height="18" rx="1" />
        <rect x="13" y="3" width="8" height="18" rx="1" />
    </svg>
);

const IconCollection = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
);

const IconEdit = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
);

const IconPages = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
);

const NAV = [
    { id: 'collections', label: 'Collections', icon: IconCollection },
    { id: 'grid', label: 'Grid layout', icon: IconGrid },
    { id: 'edit', label: 'Edit spreads', icon: IconEdit },
    { id: 'pages', label: 'Pages', icon: IconPages },
];

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
                        {label}
                    </button>
                ))}
            </nav>

            <div className="ae-panel">
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
                        <p className="ae-panel-text">How photos fill the current spread when you pick from your collection.</p>
                        <div className="ae-edit-set">
                            <button
                                type="button"
                                className={`ae-edit-set-btn${
                                    gridEditSet === 'single' ? ' ae-edit-set-btn--active' : ''
                                }`}
                                onClick={() => onGridEditSetChange?.('single')}
                            >
                                <span className="ae-edit-set-label">Single slot</span>
                                <span className="ae-edit-set-desc">Left or right page</span>
                            </button>
                            <button
                                type="button"
                                className={`ae-edit-set-btn${
                                    gridEditSet === 'whole' ? ' ae-edit-set-btn--active' : ''
                                }`}
                                onClick={() => onGridEditSetChange?.('whole')}
                            >
                                <span className="ae-edit-set-label">Whole grid</span>
                                <span className="ae-edit-set-desc">One image · full spread</span>
                            </button>
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
