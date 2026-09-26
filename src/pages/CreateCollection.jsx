import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DatePicker } from '../components/ui/DatePicker';
import { ClientGallerySelect } from '../components/features/ClientGallery/ClientGallerySelect';
import { useAuth } from '../hooks/useAuth';
import { galleryService } from '../services/gallery.service';
import { guestDeliveryService } from '../services/guestDelivery.service';
import { photographerQuotaService } from '../services/photographerQuota.service';
import { resolveUploadDefaults } from '../lib/uploadDefaults';
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
                const data = await galleryService.getPresets(user.id);
                if (data) {
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
            setError('You must be logged in to create a delivery.');
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

            const prefs = resolveUploadDefaults(null);
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
                show_filenames: prefs.filenameDisplay === 'show',
                language: prefs.defaultLanguage || 'english',
                ...(folderId ? { folder_id: folderId } : {}),
                ...presetSettings,
            };

            // Creation quota only — face switches (Find People / face matching)
            // must not block delivery creation. They only hide the
            // Find People button and gate actual face scans.
            await photographerQuotaService.assertCreationDeliveryQuota(user.id, 1);

            const newCollection = await galleryService.createCollection(collectionData);
            // Record creation usage (backend also live-counts creations).
            void photographerQuotaService.recordUsage(user.id, 'delivery', 1).catch(() => {});

            if (guestDeliveryEnabled) {
                await guestDeliveryService.createLinkedEvent({
                    collectionId: newCollection.id,
                    photographerId: user.id,
                    name,
                    eventDate: date || null,
                    slug: collectionSlug,
                });
            }
            
            navigate(`/deliveries/manage?id=${newCollection.id}`);
        } catch (err) {
            console.error('Error creating collection:', err);
            const message = err.message || 'Failed to create delivery. Please try again.';
            setError(message);
            if (/limit|quota|disabled|exceeded|reached/i.test(message)) {
                alert(message);
            }
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

    const canSubmit = Boolean(name.trim()) && !isSubmitting;

    return (
        <div className="cc-page theme-mono cd-dashboard-shell">
            <header className="cc-header">
                <div className="cc-header-left">
                    <button type="button" className="cc-back-btn" onClick={handleClose} title="Back" aria-label="Back">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                    <div className="cc-header-copy">
                        <h1 className="cc-header-title">New Delivery</h1>
                        <p className="cc-header-sub">Set up a gallery for your client</p>
                    </div>
                </div>
                <p className="cc-header-meta">Draft · editable after create</p>
            </header>

            <main className="cc-main">
                <div className="cc-form-container">
                    <div className="cc-form-card">
                        <div className="cc-form-intro">
                            <div className="cc-form-intro__icon" aria-hidden>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <circle cx="9" cy="9" r="2" />
                                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                </svg>
                            </div>
                            <div className="cc-form-intro__copy">
                                <p className="cc-form-eyebrow">Client gallery</p>
                                <h2 className="cc-form-heading">Delivery details</h2>
                                <p className="cc-form-lead">
                                    Name it, date it, pick a preset — the rest comes after.
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div className="cc-error-message" role="alert">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleCreate} className="cc-form">
                            <div className="cc-form-grid">
                            <section className="cc-section" aria-labelledby="cc-section-basics">
                                <div className="cc-section-head">
                                    <h3 id="cc-section-basics" className="cc-section-title">Basics</h3>
                                    <span className="cc-section-rule" aria-hidden />
                                </div>

                                <div className="cc-form-group">
                                    <div className="cc-label-row">
                                        <label className="cc-label" htmlFor="collection-name">Delivery name</label>
                                        <span>
                                            <span className="cc-label-hint">Required</span>
                                            <span className="cc-label-count"> · {name.trim().length}/120</span>
                                        </span>
                                    </div>
                                    <div className="cc-input-shell cc-input-shell--field">
                                        <input
                                            id="collection-name"
                                            type="text"
                                            className="cc-input"
                                            placeholder="e.g. Wedding of Sarah & James"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                            autoFocus
                                            maxLength={120}
                                            autoComplete="off"
                                        />
                                    </div>
                                </div>

                                <div className="cc-form-group cc-form-group--last">
                                    <label className="cc-label" htmlFor="collection-date">Event date</label>
                                    <div className="cc-input-shell cc-input-shell--field cc-input-shell--rounded" id="collection-date">
                                        <DatePicker
                                            value={date}
                                            onChange={setDate}
                                            placeholder="Select event date"
                                        />
                                    </div>
                                    <p className="cc-field-hint">Optional — shown on the cover and in client emails.</p>
                                </div>
                            </section>

                            <section className="cc-section" aria-labelledby="cc-section-options">
                                <div className="cc-section-head">
                                    <h3 id="cc-section-options" className="cc-section-title">Options</h3>
                                    <span className="cc-section-rule" aria-hidden />
                                </div>

                                <div className="cc-form-group">
                                    <label className="cc-label">Preset</label>
                                    <ClientGallerySelect
                                        value={preset}
                                        onChange={setPreset}
                                        aria-label="Delivery preset"
                                        options={presetOptions}
                                    />
                                    <p className="cc-field-hint">Applies starting design and privacy from a saved preset.</p>
                                </div>

                                <div className={`cc-form-group cc-form-group--toggle${guestDeliveryEnabled ? ' is-active' : ''}`}>
                                    <div className="cc-toggle-icon" aria-hidden>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="3" width="7" height="7" rx="1" />
                                            <rect x="14" y="3" width="7" height="7" rx="1" />
                                            <rect x="3" y="14" width="7" height="7" rx="1" />
                                            <path d="M17 14v3h3" />
                                            <path d="M14 17h3v3" />
                                        </svg>
                                    </div>
                                    <label className="cc-label cc-toggle-row">
                                        <span className="cc-toggle-copy">
                                            <span className="cc-toggle-title">Guest delivery</span>
                                            <span className="cc-toggle-desc">QR registration with selfie matching</span>
                                        </span>
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
                                        <p className="cc-hint">Guests register via QR with a selfie. After you publish, matched photos are emailed as personal gallery links.</p>
                                    )}
                                </div>
                            </section>
                            </div>

                            <div className="cc-actions">
                                <button type="submit" className="cc-submit-btn" disabled={!canSubmit}>
                                    {isSubmitting ? (
                                        <>
                                            <span className="cc-submit-spinner" aria-hidden />
                                            Creating…
                                        </>
                                    ) : (
                                        <>
                                            {name.trim() ? (
                                                <>
                                                    Create <span className="cc-submit-name">“{name.trim().length > 24 ? `${name.trim().slice(0, 24)}…` : name.trim()}”</span>
                                                </>
                                            ) : (
                                                'Create delivery'
                                            )}
                                            <svg className="cc-submit-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                                <path d="M5 12h14" />
                                                <path d="m12 5 7 7-7 7" />
                                            </svg>
                                        </>
                                    )}
                                </button>
                                <button type="button" className="cc-cancel-btn" onClick={handleClose}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default CreateCollection;
