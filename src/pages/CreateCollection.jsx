import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DatePicker } from '../components/ui/DatePicker';
import { ClientGallerySelect } from '../components/features/ClientGallery/ClientGallerySelect';
import { useAuth } from '../hooks/useAuth';
import { galleryService } from '../services/gallery.service';
import { guestDeliveryService } from '../services/guestDelivery.service';
import { supabase } from '../lib/supabase/client';
import '../styles/clientGalleryTheme.css';
import '../styles/collectionDashboardTheme.css';
import './CreateCollection.css';

const CreateCollection = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const folderId = searchParams.get('folderId');
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [preset, setPreset] = useState('default');
    const [guestDeliveryEnabled, setGuestDeliveryEnabled] = useState(false);
    const [presets, setPresets] = useState([]);
    const [presetOptions, setPresetOptions] = useState([{ value: 'default', label: 'Default' }]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user) return;
        const fetchPresets = async () => {
            try {
                const { data, error } = await supabase
                    .from('presets')
                    .select('*')
                    .eq('photographer_id', user.id);
                if (!error && data) {
                    setPresets(data);
                    const options = [
                        { value: 'default', label: 'Default' },
                        ...data.map(p => ({ value: p.id, label: p.name }))
                    ];
                    setPresetOptions(options);
                }
            } catch (err) {
                console.error("Failed to load presets", err);
            }
        };
        fetchPresets();
    }, [user]);

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
            const collectionSlug = `${generateSlug(name)}-${Date.now().toString(36)}`;
            let presetSettings = {};
            if (preset !== 'default') {
                const selectedPreset = presets.find(p => p.id === preset);
                if (selectedPreset && selectedPreset.settings) {
                    const ps = selectedPreset.settings;
                    presetSettings = {
                        font_family: ps.typography || 'sans_1',
                        color_palette: ps.colorTheme || 'light_1',
                        grid_style: ps.gridStyle || 'vertical',
                        thumbnail_size: ps.thumbnailSize || 'regular',
                        grid_spacing: ps.gridSpacing || 'regular',
                        nav_style: (ps.navigationStyle === 'text' || ps.navigationStyle === 'icon_text') ? 'icons_labels' : 'icons',
                        privacy: ps.collectionPassword ? 'password' : 'public',
                        cover_layout: ps.coverStyle || 'novel',
                        cover_style: 'photo',
                    };
                }
            }

            const collectionData = {
                photographer_id: user.id,
                name,
                slug: collectionSlug,
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
                guest_delivery_enabled: guestDeliveryEnabled,
                cover_layout: 'novel',
                show_filenames: localStorage.getItem('filename_display') === 'show',
                language: localStorage.getItem('default_language') || 'english',
                ...(folderId ? { folder_id: folderId } : {}),
                ...presetSettings,
            };

            const newCollection = await galleryService.createCollection(collectionData);

            if (guestDeliveryEnabled) {
                try {
                    await guestDeliveryService.createLinkedEvent({
                        collectionId: newCollection.id,
                        photographerId: user.id,
                        name,
                        eventDate: date || null,
                        slug: collectionSlug,
                    });
                } catch (gdErr) {
                    console.error('Guest delivery event creation failed:', gdErr);
                }
            }
            
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

                        <div className="cc-form-group">
                            <label className="cc-label">Event Date</label>
                            <div className="cc-input-shell neu-inset cc-input-shell--rounded">
                                <DatePicker 
                                    value={date} 
                                    onChange={setDate} 
                                    placeholder="Select event date" 
                                />
                            </div>
                        </div>

                        <div className="cc-form-group">
                            <label className="cc-label">Preset</label>
                            <ClientGallerySelect
                                value={preset}
                                onChange={setPreset}
                                aria-label="Collection preset"
                                options={presetOptions}
                            />
                        </div>

                        <div className="cc-form-group">
                            <label className="cc-label cc-toggle-row">
                                <span>Guest Delivery</span>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={guestDeliveryEnabled}
                                    className={`cc-toggle ${guestDeliveryEnabled ? 'cc-toggle--on' : ''}`}
                                    onClick={() => setGuestDeliveryEnabled((v) => !v)}
                                >
                                    <span className="cc-toggle-thumb" />
                                </button>
                            </label>
                            {guestDeliveryEnabled && (
                                <p className="cc-hint">Guests can register via QR with a selfie. After publishing, matched photos are emailed as personal gallery links.</p>
                            )}
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
