import React, { useRef } from 'react';

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

export default function AlbumEditorSidebar({
    activePanel,
    onPanelChange,
    album,
    totalPages,
    onUploadFiles,
    uploading = false,
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
                            Add photos to your spreads. Images fill the layout slots in order.
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
                            Each spread uses a 5-photo Proof layout: two slots on the left page and three on
                            the right. Sizes are calculated automatically.
                        </p>
                        <ul className="ae-panel-list">
                            <li>Left: tall + framed portrait</li>
                            <li>Right: hero + two thumbnails</li>
                        </ul>
                    </>
                )}

                {activePanel === 'edit' && (
                    <>
                        <h3 className="ae-panel-title">Edit spreads</h3>
                        <p className="ae-panel-text">
                            Use the canvas to flip through pages. Drag corners to turn pages, or use arrow
                            keys and the side buttons.
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
