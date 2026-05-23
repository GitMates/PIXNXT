import React, { useRef } from 'react';
import { PROOF_CELL_LABELS } from './albumSpreadGrid';

const IconGrid = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="3" width="7" height="18" rx="1" />
        <rect x="14" y="3" width="7" height="8" rx="1" />
        <rect x="14" y="14" width="3" height="7" rx="1" />
        <rect x="18" y="14" width="3" height="7" rx="1" />
    </svg>
);

const IconUpload = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
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
    { id: 'upload', label: 'Upload photos', icon: IconUpload },
    { id: 'grid', label: 'Grid layout', icon: IconGrid },
    { id: 'edit', label: 'Edit spreads', icon: IconEdit },
    { id: 'pages', label: 'Pages', icon: IconPages },
];

function selectionSummary(gridSelection) {
    if (!gridSelection?.leftPage) {
        return 'Flip to an inner spread, then pick a slot on the canvas.';
    }
    if (gridSelection.mode === 'cell' && gridSelection.cellId) {
        const label = PROOF_CELL_LABELS[gridSelection.cellId] || `Slot ${gridSelection.cellId}`;
        return `Slot ${gridSelection.cellId} · ${label}`;
    }
    return 'Whole spread · all 5 photo slots';
}

export default function AlbumEditorSidebar({
    activePanel,
    onPanelChange,
    album,
    totalPages,
    onUploadFiles,
    uploading = false,
    gridSelection = null,
    onSelectWholeSpread,
    onSelectCell,
    canSelectGrid = false,
}) {
    const fileRef = useRef(null);

    const handleFiles = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length) onUploadFiles?.(files);
        e.target.value = '';
    };

    return (
        <aside className="ae-sidebar">
            <div className="ae-sidebar-head">
                <p className="ae-sidebar-label">Album studio</p>
                <h2 className="ae-sidebar-title">{album?.name || 'Album'}</h2>
                <p className="ae-sidebar-meta">{totalPages} pages · Proof-style grid</p>
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
                {activePanel === 'upload' && (
                    <>
                        <h3 className="ae-panel-title">Upload to grid</h3>
                        <p className="ae-panel-text">
                            {canSelectGrid
                                ? 'Photos go into the selected slot or spread below. Click the canvas to change the target.'
                                : 'Open an inner spread in the editor, then choose a slot or the whole grid.'}
                        </p>
                        {canSelectGrid && (
                            <p className="ae-selection-badge" role="status">
                                {selectionSummary(gridSelection)}
                            </p>
                        )}
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
                            className="ae-upload-zone"
                            disabled={uploading}
                            onClick={() => fileRef.current?.click()}
                        >
                            <IconUpload />
                            <span>{uploading ? 'Uploading…' : 'Choose photos'}</span>
                            <span className="ae-upload-hint">JPG, PNG · multiple files</span>
                        </button>
                    </>
                )}

                {activePanel === 'grid' && (
                    <>
                        <h3 className="ae-panel-title">Grid layout</h3>
                        <p className="ae-panel-text">
                            Click a photo slot on the spread, or select the whole grid. Then upload to fill
                            that slot or all five slots in order.
                        </p>
                        {canSelectGrid ? (
                            <>
                                <p className="ae-selection-badge" role="status">
                                    {selectionSummary(gridSelection)}
                                </p>
                                <div className="ae-slot-picker">
                                    <button
                                        type="button"
                                        className={`ae-slot-btn ae-slot-btn--all${
                                            gridSelection?.mode === 'spread' ? ' ae-slot-btn--active' : ''
                                        }`}
                                        onClick={() => onSelectWholeSpread?.()}
                                    >
                                        Whole spread
                                    </button>
                                    {[1, 2, 3, 4, 5].map((id) => (
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
                                <ul className="ae-panel-list ae-panel-list--compact">
                                    <li>1–2: left page</li>
                                    <li>3–5: right page (hero + thumbnails)</li>
                                </ul>
                            </>
                        ) : (
                            <p className="ae-panel-text ae-panel-text--muted">
                                Use the arrows to open an inner spread (not the cover), then select slots.
                            </p>
                        )}
                    </>
                )}

                {activePanel === 'edit' && (
                    <>
                        <h3 className="ae-panel-title">Edit spreads</h3>
                        <p className="ae-panel-text">
                            Click grid slots on the canvas to choose where uploads go. Change spreads with
                            the arrow buttons or keyboard.
                        </p>
                        <p className="ae-panel-text ae-panel-text--muted">
                            Open Preview to see exactly what clients will receive.
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
