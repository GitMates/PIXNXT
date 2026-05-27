import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DatePicker } from '../../components/ui/DatePicker';
/* Upload on create — disabled
import { addFilesToAlbumCollection } from '../../components/smart-albums/albumCollection';
import {
    autoPlaceCollectionItems,
    setPagePhotoFromCollectionItem,
} from '../../components/smart-albums/albumPagePhotos';
*/
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
];

const GRID_LAYOUT_OPTIONS = [
    { value: 'two-page', label: 'Two-page grid (left + right)' },
    { value: 'whole-spread', label: 'Whole-spread photo' },
];

/*
function formatFileSize(bytes) {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
}
*/

const CreateAlbum = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [pageCount, setPageCount] = useState(spreadsToPageCount(11));
    const [gridSize, setGridSize] = useState('square');
    const [gridLayout, setGridLayout] = useState('two-page');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!user) {
            setError('You must be logged in to create an album.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const album = await smartAlbumsService.createAlbum({
                photographer_id: user.id,
                name,
                event_date: date || null,
                page_count: pageCount,
                grid_size: gridSize,
                grid_layout: gridLayout,
            });
            /*
            if (CREATE_ALBUM_UPLOAD_ENABLED && photoFiles.length > 0) {
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
            */
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
                            Choose the spread count, page shape, and layout once. Add photos from the
                            editor after the album is created.
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
                                    <select
                                        id="album-spread-count"
                                        className="cc-input sa-select"
                                        value={pageCountToSpreads(pageCount)}
                                        onChange={(e) =>
                                            setPageCount(spreadsToPageCount(Number(e.target.value)))
                                        }
                                    >
                                        {SPREAD_COUNT_OPTIONS.map((count) => (
                                            <option key={count} value={count}>
                                                {count} spreads
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="cc-form-group">
                                    <label className="cc-label" htmlFor="album-grid-size">
                                        Grid Size
                                    </label>
                                    <select
                                        id="album-grid-size"
                                        className="cc-input sa-select"
                                        value={gridSize}
                                        onChange={(e) => setGridSize(e.target.value)}
                                    >
                                        {GRID_SIZE_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="cc-form-group">
                                <label className="cc-label" htmlFor="album-grid-layout">
                                    Grid Layout
                                </label>
                                <select
                                    id="album-grid-layout"
                                    className="cc-input sa-select"
                                    value={gridLayout}
                                    onChange={(e) => setGridLayout(e.target.value)}
                                >
                                    {GRID_LAYOUT_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="sa-field-note">
                                    Grid size and layout are locked after the album is created.
                                </p>
                            </div>
                        </section>

                        {/* Upload photos — disabled (set CREATE_ALBUM_UPLOAD_ENABLED to re-enable)
                        <section className="sa-create-card sa-create-card--upload">...</section>
                        */}

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
