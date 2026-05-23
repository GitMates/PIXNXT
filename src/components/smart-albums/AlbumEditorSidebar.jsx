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
        return 'Open an inner spread (not the cover), then choose how to place photos.';
    }
    if (gridEditSet === 'whole') {
        return 'Whole grid — click the spread, then one collection photo fills both pages.';
    }
    if (gridSelection?.mode === 'cell' && gridSelection.cellId) {
        const label = PROOF_CELL_LABELS[gridSelection.cellId] || '';
        return `Single slot ${gridSelection.cellId}${label ? ` · ${label}` : ''}`;
    }
    return 'Single slot — click a slot on the spread, then pick a collection photo.';
}

export default function AlbumEditorSidebar({
    activePanel,
    onPanelChange,
    album,
    totalPages,
    collectionItems = [],
    onUploadToCollection,
    onPlaceCollectionItem,
    onClearAllPhotos,
    uploading = false,
    gridEditSet = 'single',
    onGridEditSetChange,
    gridSelection = null,
    onSelectCell,
    onSelectWholeSpread,
    canSelectGrid = false,
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
                <p className="ae-sidebar-meta">{totalPages} pages · 2-photo spread</p>
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
                            Uploads are saved here. Set placement in Grid layout, then click a photo to
                            add it to the spread.
                        </p>
                        <p className="ae-selection-badge" role="status">
                            {placementHint(gridEditSet, gridSelection, canSelectGrid)}
                        </p>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="ae-file-input"
                            onChange={handleFiles}
                        />
                        <button
                            type="button"
                            className="ae-upload-zone ae-upload-zone--compact"
                            disabled={uploading}
                            onClick={() => fileRef.current?.click()}
                        >
                            <span>{uploading ? 'Uploading…' : 'Add to collection'}</span>
                        </button>
                        {collectionItems.length === 0 ? (
                            <p className="ae-panel-text ae-panel-text--muted">No photos yet.</p>
                        ) : (
                            <div className="ae-collection-grid" role="list">
                                {collectionItems.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className="ae-collection-thumb"
                                        onClick={() => onPlaceCollectionItem?.(item.id)}
                                        title={item.name}
                                    >
                                        <img src={item.dataUrl} alt="" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {activePanel === 'grid' && (
                    <>
                        <h3 className="ae-panel-title">Grid layout</h3>
                        <p className="ae-panel-text">
                            Choose how photos from your collection are placed on the current spread.
                        </p>
                        <div className="ae-edit-set">
                            <button
                                type="button"
                                className={`ae-edit-set-btn${
                                    gridEditSet === 'single' ? ' ae-edit-set-btn--active' : ''
                                }`}
                                onClick={() => onGridEditSetChange?.('single')}
                            >
                                Single slot
                            </button>
                            <button
                                type="button"
                                className={`ae-edit-set-btn${
                                    gridEditSet === 'whole' ? ' ae-edit-set-btn--active' : ''
                                }`}
                                onClick={() => onGridEditSetChange?.('whole')}
                            >
                                Whole grid
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
                                        {id}
                                    </button>
                                ))}
                            </div>
                        )}
                        {canSelectGrid && gridEditSet === 'whole' && (
                            <p className="ae-panel-text ae-panel-text--muted">
                                Click either page on the spread to select it, then choose one photo from
                                Collections.
                            </p>
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
                            Drag a photo to reposition it inside its slot. Use the corner handle to resize
                            (zoom). Change spreads with the arrows or keyboard.
                        </p>
                        <p className="ae-panel-text ae-panel-text--muted">
                            Only slots with placed photos can be adjusted.
                        </p>
                    </>
                )}

                {activePanel === 'pages' && (
                    <>
                        <h3 className="ae-panel-title">Pages</h3>
                        <p className="ae-panel-text">
                            Cover plus {Math.max(0, totalPages - 1)} inner pages. URL updates as you flip.
                        </p>
                    </>
                )}
            </div>
        </aside>
    );
}
