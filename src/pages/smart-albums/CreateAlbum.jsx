import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DatePicker } from '../../components/ui/DatePicker';
import { addFilesToAlbumCollection } from '../../components/smart-albums/albumCollection';
import { useAuth } from '../../hooks/useAuth';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import './CreateAlbum.css';

const PAGE_COUNT_OPTIONS = [5, 7, 9, 11, 15, 21, 31, 41];

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

const CreateAlbum = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [pageCount, setPageCount] = useState(21);
    const [gridSize, setGridSize] = useState('square');
    const [gridLayout, setGridLayout] = useState('two-page');
    const [photoFiles, setPhotoFiles] = useState([]);
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
            if (photoFiles.length > 0) {
                await addFilesToAlbumCollection(album.id, photoFiles);
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

            <main className="cc-main">
                <div className="cc-form-container">
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

                    <form onSubmit={handleCreate}>
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

                        <div className="cc-form-group">
                            <label className="cc-label" htmlFor="album-page-count">
                                No. of Pages
                            </label>
                            <select
                                id="album-page-count"
                                className="cc-input sa-select"
                                value={pageCount}
                                onChange={(e) => setPageCount(Number(e.target.value))}
                            >
                                {PAGE_COUNT_OPTIONS.map((count) => (
                                    <option key={count} value={count}>
                                        {count} pages
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

                        <div className="cc-form-group">
                            <label className="cc-label" htmlFor="album-photos">
                                Upload Photos
                            </label>
                            <input
                                id="album-photos"
                                type="file"
                                className="cc-input sa-file-input"
                                accept="image/*,application/pdf,.pdf"
                                multiple
                                onChange={(e) => setPhotoFiles(Array.from(e.target.files || []))}
                            />
                            <p className="sa-field-note">
                                {photoFiles.length > 0
                                    ? `${photoFiles.length} file${photoFiles.length === 1 ? '' : 's'} selected`
                                    : 'Optional: JPG, PNG, or PDF pages.'}
                            </p>
                        </div>

                        <div className="cc-actions">
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
