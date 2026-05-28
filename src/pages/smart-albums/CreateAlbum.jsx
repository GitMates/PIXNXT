import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DatePicker } from '../../components/ui/DatePicker';
import { addFilesToAlbumCollection } from '../../components/smart-albums/albumCollection';
import {
    autoPlaceCollectionItems,
    setPagePhotoFromCollectionItem,
} from '../../components/smart-albums/albumPagePhotos';
import { useAuth } from '../../hooks/useAuth';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import './CreateAlbum.css';

const SPREAD_COUNT_OPTIONS = [3, 4, 5, 6, 8, 11, 16, 21];

function spreadsToPageCount(spreads) {
    return Math.max(1, spreads * 2 - 1);
}

function pageCountToSpreads(pageCount) {
    return Math.max(1, Math.ceil((pageCount + 1) / 2));
}

const GRID_SIZE_OPTIONS = [
    { value: 'square', label: 'Square pages (1:1)' },
    { value: 'portrait', label: 'Portrait pages (4:5)' },
    { value: 'landscape', label: 'Landscape pages (5:4)' },
    { value: 'wide', label: 'Wide pages (16:9)' },
    { value: 'custom', label: 'Custom' },
];

const GRID_LAYOUT_OPTIONS = [
    { value: 'two-page', label: 'Two-page grid (left + right)' },
    { value: 'whole-spread', label: 'Whole-spread photo' },
    { value: 'custom', label: 'Custom' },
];

function normalizeCustomKey(value, fallback = 'custom') {
    return String(value || fallback)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || fallback;
}

function CustomSelect({ id, value, options, onChange, placeholder = 'Select' }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const selected = options.find((opt) => String(opt.value) === String(value));

    useEffect(() => {
        const onDocDown = (e) => {
            if (!rootRef.current?.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onDocDown);
        return () => document.removeEventListener('mousedown', onDocDown);
    }, []);

    return (
        <div className="sa-select-wrap" ref={rootRef}>
            <button
                id={id}
                type="button"
                className={`cc-input sa-select-btn${open ? ' sa-select-btn--open' : ''}`}
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span>{selected?.label || placeholder}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
            </button>
            {open && (
                <div className="sa-select-menu" role="listbox" aria-labelledby={id}>
                    {options.map((option) => {
                        const isSelected = String(option.value) === String(value);
                        return (
                            <button
                                key={String(option.value)}
                                type="button"
                                className={`sa-select-option${isSelected ? ' sa-select-option--active' : ''}`}
                                onClick={() => {
                                    onChange(option.value);
                                    setOpen(false);
                                }}
                                role="option"
                                aria-selected={isSelected}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function formatFileSize(bytes) {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
}

const CreateAlbum = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [pageCount, setPageCount] = useState(spreadsToPageCount(11));
    const [spreadMode, setSpreadMode] = useState('preset');
    const [gridSize, setGridSize] = useState('square');
    const [gridLayout, setGridLayout] = useState('two-page');
    const [customSpreadCount, setCustomSpreadCount] = useState(11);
    const [customGridSize, setCustomGridSize] = useState('');
    const [customGridLayout, setCustomGridLayout] = useState('');
    const spreadOptions = useMemo(
        () => [
            ...SPREAD_COUNT_OPTIONS.map((count) => ({ value: String(count), label: `${count} spreads` })),
            { value: 'custom', label: 'Custom' },
        ],
        []
    );

    const [photoFiles, setPhotoFiles] = useState([]);
    const [photoPreviews, setPhotoPreviews] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const previews = photoFiles.map((file, index) => ({
            index,
            id: `${file.name}-${file.lastModified}-${file.size}-${index}`,
            name: file.name,
            size: file.size,
            isPdf:
                file.type === 'application/pdf' ||
                file.name.toLowerCase().endsWith('.pdf'),
            url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        }));

        setPhotoPreviews(previews);

        return () => {
            previews.forEach((preview) => {
                if (preview.url) URL.revokeObjectURL(preview.url);
            });
        };
    }, [photoFiles]);

    const handlePhotoChange = (e) => {
        setPhotoFiles(Array.from(e.target.files || []));
        e.target.value = '';
    };

    const handleRemovePhoto = (indexToRemove) => {
        setPhotoFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!user) {
            setError('You must be logged in to create an album.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const spreadValue =
                spreadMode === 'custom'
                    ? Number(customSpreadCount) || 11
                    : pageCountToSpreads(pageCount);
            const finalPageCount = spreadsToPageCount(Math.max(1, Math.min(99, spreadValue)));
            const finalGridSize =
                gridSize === 'custom'
                    ? `custom-${normalizeCustomKey(customGridSize)}`
                    : gridSize;
            const finalGridLayout =
                gridLayout === 'custom'
                    ? `custom-${normalizeCustomKey(customGridLayout)}`
                    : gridLayout;

            const album = await smartAlbumsService.createAlbum({
                photographer_id: user.id,
                name,
                event_date: date || null,
                page_count: finalPageCount,
                grid_size: finalGridSize,
                grid_layout: finalGridLayout,
            });
            if (photoFiles.length > 0) {
                const added = await addFilesToAlbumCollection(album.id, photoFiles, {
                    photographerId: user.id,
                });
                const coverItem = added[0] || added.duplicateItems?.[0];
                if (coverItem) {
                    setPagePhotoFromCollectionItem(album.id, 0, coverItem.id);
                }
                const gridItems = coverItem
                    ? added.filter((item) => item.id !== coverItem.id)
                    : added;
                autoPlaceCollectionItems(
                    album.id,
                    gridItems.map((item) => item.id),
                    {
                        totalPages: album.page_count || pageCount,
                        gridLayout,
                    }
                );
            }
            navigate(`/smart-albums/album/${album.id}`);
        } catch (err) {
            console.error('Error creating album:', err);
            setError(err.message || 'Failed to create album. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="cc-page sa-create-page">
            <header className="cc-header">
                <div className="cc-header-left">
                    <button type="button" className="cc-back-btn" onClick={() => navigate('/smart-albums')} title="Back">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <h1 className="cc-header-title">New Album</h1>
                </div>
            </header>

            <main className="cc-main sa-create-main">
                <div className="cc-form-container sa-create-shell">
                    <div className="sa-create-intro">
                        <span className="sa-create-kicker">Smart Album Setup</span>
                        <h2>Design the album before you start editing.</h2>
                        <p>
                            Choose the spread count, page shape, and layout once. Your uploaded photos
                            will be placed automatically after the album is created.
                        </p>
                    </div>

                    {error && (
                        <div
                            className="cc-error-message"
                            style={{
                                color: '#dc2626',
                                backgroundColor: '#fef2f2',
                                padding: '12px',
                                borderRadius: '8px',
                                marginBottom: '24px',
                                fontSize: '14px',
                                border: '1px solid #fee2e2',
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleCreate} className="sa-create-grid">
                        <section className="sa-create-card">
                            <div className="sa-section-heading">
                                <span>Album details</span>
                                <small>Name and event date</small>
                            </div>

                            <div className="cc-form-group">
                                <label className="cc-label" htmlFor="album-name">
                                    Album Name
                                </label>
                                <input
                                    id="album-name"
                                    type="text"
                                    className="cc-input"
                                    placeholder="e.g. Wedding of Sarah & James"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="cc-form-group">
                                <label className="cc-label">Event Date</label>
                                <DatePicker value={date} onChange={setDate} placeholder="Select event date" />
                            </div>
                        </section>

                        <section className="sa-create-card">
                            <div className="sa-section-heading">
                                <span>Locked layout</span>
                                <small>Cannot be changed after creation</small>
                            </div>

                            <div className="sa-form-row">
                                <div className="cc-form-group">
                                    <label className="cc-label" htmlFor="album-spread-count">
                                        No. of Spreads
                                    </label>
                                    <CustomSelect
                                        id="album-spread-count"
                                        value={spreadMode === 'custom' ? 'custom' : String(pageCountToSpreads(pageCount))}
                                        options={spreadOptions}
                                        onChange={(nextValue) => {
                                            if (nextValue === 'custom') {
                                                setSpreadMode('custom');
                                                return;
                                            }
                                            setSpreadMode('preset');
                                            setPageCount(spreadsToPageCount(Number(nextValue)));
                                        }}
                                    />
                                    {spreadMode === 'custom' && (
                                        <input
                                            type="number"
                                            className="cc-input sa-custom-input"
                                            min={1}
                                            max={99}
                                            value={customSpreadCount}
                                            onChange={(e) => {
                                                const val = Math.max(
                                                    1,
                                                    Math.min(99, Number(e.target.value) || 1)
                                                );
                                                setCustomSpreadCount(val);
                                            }}
                                            placeholder="Enter custom spreads"
                                        />
                                    )}
                                </div>

                                <div className="cc-form-group">
                                    <label className="cc-label" htmlFor="album-grid-size">
                                        Grid Size
                                    </label>
                                    <CustomSelect
                                        id="album-grid-size"
                                        value={gridSize}
                                        options={GRID_SIZE_OPTIONS}
                                        onChange={setGridSize}
                                    />
                                    {gridSize === 'custom' && (
                                        <input
                                            type="text"
                                            className="cc-input sa-custom-input"
                                            value={customGridSize}
                                            onChange={(e) => setCustomGridSize(e.target.value)}
                                            placeholder="Custom size label (e.g. 3:2)"
                                            required
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="cc-form-group">
                                <label className="cc-label" htmlFor="album-grid-layout">
                                    Grid Layout
                                </label>
                                <CustomSelect
                                    id="album-grid-layout"
                                    value={gridLayout}
                                    options={GRID_LAYOUT_OPTIONS}
                                    onChange={setGridLayout}
                                />
                                {gridLayout === 'custom' && (
                                    <input
                                        type="text"
                                        className="cc-input sa-custom-input"
                                        value={customGridLayout}
                                        onChange={(e) => setCustomGridLayout(e.target.value)}
                                        placeholder="Custom layout label"
                                        required
                                    />
                                )}
                                <p className="sa-field-note">
                                    Grid size and layout are locked after the album is created.
                                </p>
                            </div>
                        </section>

                        <section className="sa-create-card sa-create-card--upload">
                            <div className="sa-section-heading">
                                <span>Upload photos</span>
                                <small>Images and PDF pages will be auto-placed</small>
                            </div>

                            <input
                                id="album-photos"
                                type="file"
                                className="sa-file-input-native"
                                accept="image/*,application/pdf,.pdf"
                                multiple
                                onChange={handlePhotoChange}
                            />
                            <label className="sa-upload-card" htmlFor="album-photos">
                                <span className="sa-upload-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="17 8 12 3 7 8" />
                                        <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                </span>
                                <strong>Choose photos or PDF</strong>
                                <small>JPG, PNG, WEBP, or PDF pages</small>
                            </label>

                            {photoPreviews.length > 0 ? (
                                <div className="sa-upload-preview">
                                    <div className="sa-upload-summary">
                                        <span>
                                            {photoPreviews.length} file{photoPreviews.length === 1 ? '' : 's'} selected
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setPhotoFiles([])}
                                            className="sa-upload-clear"
                                        >
                                            Clear all
                                        </button>
                                    </div>

                                    <div className="sa-preview-grid">
                                        {photoPreviews.map((preview) => (
                                            <figure className="sa-preview-card" key={preview.id}>
                                                <button
                                                    type="button"
                                                    className="sa-preview-remove"
                                                    onClick={() => handleRemovePhoto(preview.index)}
                                                    aria-label={`Remove ${preview.name}`}
                                                >
                                                    x
                                                </button>
                                                {preview.url ? (
                                                    <img src={preview.url} alt={preview.name} />
                                                ) : (
                                                    <div className="sa-preview-pdf">PDF</div>
                                                )}
                                                <figcaption title={preview.name}>
                                                    <span>{preview.name}</span>
                                                    <small>{formatFileSize(preview.size)}</small>
                                                </figcaption>
                                            </figure>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="sa-field-note">
                                    Optional: upload now to fill the selected grid automatically.
                                </p>
                            )}
                        </section>

                        <div className="cc-actions sa-create-actions">
                            <button type="submit" className="cc-submit-btn" disabled={isSubmitting}>
                                {isSubmitting ? 'Creating...' : 'Create Album'}
                            </button>
                            <button type="button" className="cc-cancel-btn" onClick={() => navigate('/smart-albums')}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default CreateAlbum;
