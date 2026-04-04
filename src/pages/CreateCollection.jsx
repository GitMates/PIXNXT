import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DatePicker } from '../components/ui/DatePicker';
import { useAuth } from '../hooks/useAuth';
import { galleryService } from '../services/gallery.service';
import './CreateCollection.css';

const CreateCollection = () => {
    const navigate = useNavigate();
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
                cover_style: 'photo'
            };

            const newCollection = await galleryService.createCollection(collectionData);
            
            // Navigate to management with the new collection ID
            navigate(`/collections/manage?id=${newCollection.id}`);
        } catch (err) {
            console.error('Error creating collection:', err);
            setError(err.message || 'Failed to create collection. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        navigate('/client-gallery');
    };

    return (
        <div className="cc-page">
            <header className="cc-header">
                <div className="cc-header-left">
                    <button className="cc-back-btn" onClick={handleClose} title="Back">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                    <h1 className="cc-header-title">New Collection</h1>
                </div>
            </header>

            <main className="cc-main">
                <div className="cc-form-container">
                    {error && (
                        <div className="cc-error-message" style={{ color: '#dc2626', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', border: '1px solid #fee2e2' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleCreate}>
                        <div className="cc-form-group">
                            <label className="cc-label">Collection Name</label>
                            <input
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
                            <DatePicker 
                                value={date} 
                                onChange={setDate} 
                                placeholder="Select event date" 
                            />
                        </div>

                        <div className="cc-form-group">
                            <label className="cc-label">Preset</label>
                            <div className="cc-select-wrapper">
                                <select 
                                    className="cc-select"
                                    value={preset}
                                    onChange={(e) => setPreset(e.target.value)}
                                >
                                    <option value="default">Default</option>
                                    <option value="wedding">Wedding</option>
                                    <option value="portrait">Portrait</option>
                                    <option value="event">Event</option>
                                </select>
                                <svg className="cc-select-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </div>
                        </div>

                        <div className="cc-actions">
                            <button type="submit" className="cc-submit-btn" disabled={isSubmitting}>
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
