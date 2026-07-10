import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DatePicker } from '../components/ui/DatePicker';
import { ClientGallerySelect } from '../components/features/ClientGallery/ClientGallerySelect';
import { useAuth } from '../hooks/useAuth';
import { galleryService } from '../services/gallery.service';
import '../styles/clientGalleryTheme.css';
import '../styles/collectionDashboardTheme.css';
import './CreateCollection.css';

const PRESET_OPTIONS = [
    { value: 'default', label: 'Default' },
    { value: 'wedding', label: 'Wedding' },
    { value: 'portrait', label: 'Portrait' },
    { value: 'event', label: 'Event' },
];

const CreateCollection = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const folderId = searchParams.get('folderId');
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [preset, setPreset] = useState('default');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const generateSlug = (text) => {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^\w ]+/g, '')
            .replace(/ +/g, '-');
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!user) {
            setError('You must be logged in to create a collection.');
            return;
        }
        
        setIsSubmitting(true);
        setError(null);
        
        try {
            const collectionData = {
                photographer_id: user.id,
                name,
                slug: `${generateSlug(name)}-${Date.now().toString(36)}`,
                event_date: date || null,
                status: 'draft',
                font_family: 'sans_1',
                color_palette: 'light_1',
                grid_style: 'vertical',
                thumbnail_size: 'regular',
                grid_spacing: 'regular',
                nav_style: 'icons',
                privacy: 'public',
                cover_style: 'photo',
                ...(folderId ? { folder_id: folderId } : {}),
            };

            const newCollection = await galleryService.createCollection(collectionData);
            
            navigate(`/collections/manage?id=${newCollection.id}`);
        } catch (err) {
            console.error('Error creating collection:', err);
            setError(err.message || 'Failed to create collection. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (folderId) {
            navigate(`/folders/${folderId}`);
        } else {
            navigate('/client-gallery');
        }
    };

    return (
        <div className="cc-page theme-mono cd-dashboard-shell">
            <header className="cc-header">
                <div className="cc-header-left">
                    <button type="button" className="cc-back-btn neu-circle" onClick={handleClose} title="Back">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                    <h1 className="cc-header-title">New Collection</h1>
                </div>
            </header>

            <main className="cc-main">
                <div className="cc-form-container">
                    {error && (
                        <div className="cc-error-message">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleCreate}>
                        <div className="cc-form-group">
                            <label className="cc-label" htmlFor="collection-name">Collection Name</label>
                            <div className="cc-input-shell neu-inset">
                                <input
                                    id="collection-name"
                                    type="text"
                                    className="cc-input"
                                    placeholder="e.g. Wedding of Sarah & James"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="cc-form-group cc-form-group--datepicker">
                            <label className="cc-label" htmlFor="collection-event-date">Event Date</label>
                            <div className="cc-input-shell neu-inset">
                                <DatePicker
                                    inputId="collection-event-date"
                                    value={date}
                                    onChange={setDate}
                                    placeholder="Select event date"
                                    className="cc-date-picker"
                                />
                            </div>
                        </div>

                        <div className="cc-form-group">
                            <label className="cc-label">Preset</label>
                            <ClientGallerySelect
                                value={preset}
                                onChange={setPreset}
                                aria-label="Collection preset"
                                options={PRESET_OPTIONS}
                            />
                        </div>

                        <div className="cc-actions">
                            <button type="submit" className="cc-submit-btn neu-pill" disabled={isSubmitting}>
                                {isSubmitting ? 'Creating...' : 'Create Collection'}
                            </button>
                            <button type="button" className="cc-cancel-btn" onClick={handleClose}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default CreateCollection;
