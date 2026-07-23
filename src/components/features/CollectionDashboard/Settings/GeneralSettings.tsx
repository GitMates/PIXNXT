import React from 'react';
import { DatePicker } from '../../../ui/DatePicker';
import { ClientGallerySelect } from '../../ClientGallery/ClientGallerySelect';
import { galleryService } from '../../../../services/gallery.service';
import { cacheSlideshowEnabled } from '../../../../lib/collectionFeatureFlags';
import { CategoryTagsField } from './CategoryTagsField';

export interface GeneralSettingsProps {
    collectionId: string;
    collection: any;
    setCollection: React.Dispatch<React.SetStateAction<any>>;
    collectionUrl: string;
    setCollectionUrl: (val: string) => void;
    defaultWatermark: string;
    setDefaultWatermark: (val: string) => void;
    autoExpiry: string | null;
    setAutoExpiry: (val: string | null) => void;
    setShowExpiryReminderModal: (val: boolean) => void;
    expiryReminders: any[];
    onEditReminder: (reminder: any) => void;
    onDeleteReminder: (id: string) => void;
    onAddReminder: () => void;
    emailRegistration: boolean;
    setEmailRegistration: (val: boolean) => void;
    galleryAssist: boolean;
    setGalleryAssist: (val: boolean) => void;
    slideshow: boolean;
    setSlideshow: (val: boolean) => void;
    socialSharing: boolean;
    setSocialSharing: (val: boolean) => void;
    language: string;
    setLanguage: (val: string) => void;
    categoryTags: string[];
    onCategoryTagsChange: (tags: string[]) => void;
    categoryTagsSaving?: boolean;
    showGeneralAdditionalOptions: boolean;
    setShowGeneralAdditionalOptions: (val: boolean) => void;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
    collectionId,
    collection,
    setCollection,
    collectionUrl,
    setCollectionUrl,
    defaultWatermark,
    setDefaultWatermark,
    autoExpiry,
    setAutoExpiry,
    setShowExpiryReminderModal,
    expiryReminders = [],
    onEditReminder,
    onDeleteReminder,
    onAddReminder,
    emailRegistration,
    setEmailRegistration,
    galleryAssist,
    setGalleryAssist,
    slideshow,
    setSlideshow,
    socialSharing,
    setSocialSharing,
    language,
    setLanguage,
    categoryTags,
    onCategoryTagsChange,
    categoryTagsSaving = false,
    showGeneralAdditionalOptions,
    setShowGeneralAdditionalOptions,
}) => {
    const [pendingWatermark, setPendingWatermark] = React.useState<string | null>(null);
    const [isSavingWatermark, setIsSavingWatermark] = React.useState(false);

    const handleWatermarkChange = (val: string) => {
        setPendingWatermark(val);
    };

    const confirmWatermarkChange = async () => {
        if (pendingWatermark !== null) {
            setIsSavingWatermark(true);
            try {
                setDefaultWatermark(pendingWatermark);
                await galleryService.updateCollection(collectionId, { default_watermark: pendingWatermark });
                setCollection(prev => ({ ...prev, default_watermark: pendingWatermark }));
            } catch (err) {
                console.error('Failed to save default watermark:', err);
            } finally {
                setIsSavingWatermark(false);
                setPendingWatermark(null);
            }
        }
    };

    const [vaultEnabled, setVaultEnabled] = React.useState(false);
    const [vaultPrice, setVaultPrice] = React.useState('499');

    React.useEffect(() => {
        if (collectionId) {
            galleryService.fetchVaultPlan(collectionId).then(plan => {
                if (plan) {
                    setVaultEnabled(plan.vault_enabled === true);
                    setVaultPrice(String(plan.price_lifetime || '499'));
                }
            });
        }
    }, [collectionId]);


    const broadcastGallerySettings = (settings: {
        slideshow_enabled?: boolean;
        social_sharing_enabled?: boolean;
    }) => {
        const channel = new BroadcastChannel('pixnxt-gallery-update');
        channel.postMessage({
            type: 'SETTINGS_UPDATED',
            collectionId,
            slug: collectionUrl,
            settings,
        });
        channel.close();
    };

    const persistGalleryVisitorFlags = async (patch: {
        slideshow_enabled?: boolean;
        social_sharing_enabled?: boolean;
    }) => {
        if (patch.slideshow_enabled !== undefined) {
            cacheSlideshowEnabled(collectionId, patch.slideshow_enabled);
        }
        // Live-update open gallery tabs before DB round-trip (no reload).
        broadcastGallerySettings(patch);
        try {
            const updated = await galleryService.updateCollection(collectionId, patch);
            if (updated) {
                setCollection((prev) => (prev ? { ...prev, ...updated } : prev));
            }
        } catch (err) {
            console.error('Failed to save gallery visitor settings:', err);
            if (patch.slideshow_enabled !== undefined) {
                console.error(
                    'Slideshow setting could not be saved. Apply migration 20260519150000_ensure_slideshow_enabled_column.sql in Supabase.'
                );
            }
        }
    };

    const [watermarkOptions, setWatermarkOptions] = React.useState<{value: string, label: string}[]>([
        { value: 'No watermark', label: 'No watermark' }
    ]);

    React.useEffect(() => {
        const fetchWatermarks = async () => {
            if (collection?.photographer_id) {
                try {
                    const wms = await galleryService.getWatermarks(collection.photographer_id);
                    const opts = [
                        { value: 'No watermark', label: 'No watermark' },
                        ...wms.map((w: any) => ({ value: w.id, label: w.name || 'Unnamed Watermark' }))
                    ];
                    setWatermarkOptions(opts);
                } catch (err) {
                    console.error('Failed to fetch watermarks:', err);
                }
            }
        };
        fetchWatermarks();
    }, [collection?.photographer_id]);

    return (
        <div className="cd-general-settings-view">
            <div className="cd-settings-content-header">
                <h2 className="cd-settings-main-title">General Settings <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></h2>
            </div>

            <div className="cd-settings-form">
                <div className="settings-section">
                    <label className="settings-label">Collection URL</label>
                    <div className="settings-input-wrapper">
                        <input
                            type="text"
                            className="settings-input"
                            value={collectionUrl}
                            onChange={(e) => setCollectionUrl(e.target.value)}
                        />
                    </div>
                    <p className="settings-desc">Choose a unique url for visitors to access your collection.</p>
                </div>

                <div className="settings-section">
                    <label className="settings-label">Category Tags</label>
                    <CategoryTagsField
                      tags={categoryTags}
                      onChange={onCategoryTagsChange}
                      disabled={categoryTagsSaving}
                    />
                    <p className="settings-desc">
                      Add tags to categorize different collections e.g. wedding, outdoor, summer.
                      Press <strong>Enter</strong> to add each tag (tags are not added automatically).{' '}
                      <span className="settings-link">Learn more</span>
                    </p>
                </div>

                <div className="settings-section">
                    <label className="settings-label">Default Watermark</label>
                    <ClientGallerySelect
                        value={defaultWatermark}
                        onChange={handleWatermarkChange}
                        aria-label="Default watermark"
                        options={watermarkOptions}
                    />
                    <p className="settings-desc">Set the default watermark to apply to photos. Manage watermarks in <span className="settings-link">App settings</span>.</p>
                </div>

                <div className="settings-section">
                    <label className="settings-label">Auto Expiry</label>
                    <div className="settings-input-wrapper custom-dp">
                        <DatePicker 
                            value={autoExpiry} 
                            onChange={async (newDate) => {
                                setAutoExpiry(newDate);
                                try {
                                    await galleryService.updateCollection(collectionId, { auto_expiry: newDate });
                                    setCollection(prev => ({ ...prev, auto_expiry: newDate }));
                                } catch (err) {
                                    console.error('Failed to save auto expiry:', err);
                                }
                            }}
                            placeholder="Optional"
                            disablePastDates={true}
                        />
                    </div>
                    <p className="settings-desc">Automatically set your collection to hidden on a specific date (at 11:59pm <span className="highlight-text">GMT+5:30</span>)</p>
                    
                    {autoExpiry && (
                        <div style={{
                            marginTop: '16px',
                            padding: '16px',
                            background: '#fcfbfa',
                            border: '1px solid #f2ede4',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ flex: 1, paddingRight: '16px' }}>
                                    <label className="settings-label" style={{ fontSize: '13px', fontWeight: 600, color: '#111', display: 'block', marginBottom: '2px' }}>Enable Permanent Vault Purchase</label>
                                    <span className="settings-desc small" style={{ fontSize: '12px', color: '#64748b', display: 'block', lineHeight: 1.4 }}>
                                        Allow gallery visitors to pay to extend this gallery online forever, overriding the auto expiry.
                                    </span>
                                </div>
                                <div>
                                    <label className="cd-toggle">
                                        <input 
                                            type="checkbox" 
                                            checked={vaultEnabled} 
                                            onChange={async (e) => {
                                                const checked = e.target.checked;
                                                setVaultEnabled(checked);
                                                try {
                                                    await galleryService.upsertVaultPlan(collectionId, { vault_enabled: checked });
                                                } catch (err) { console.error('Failed to update vault_enabled:', err); }
                                            }} 
                                        />
                                        <span className="cd-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>

                            {vaultEnabled && (
                                <div style={{ marginTop: '16px', borderTop: '1px solid #f2ede4', paddingTop: '16px' }}>
                                    <label className="settings-label" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#111' }}>Permanent Vault Price (INR)</label>
                                    <div className="settings-input-wrapper" style={{ maxWidth: '140px' }}>
                                        <input
                                            type="number"
                                            className="settings-input"
                                            value={vaultPrice}
                                            onChange={async (e) => {
                                                const price = e.target.value;
                                                setVaultPrice(price);
                                                try {
                                                    await galleryService.upsertVaultPlan(collectionId, { price_lifetime: parseInt(price) || 499 });
                                                } catch (err) { console.error('Failed to update vault_price_lifetime:', err); }
                                            }}
                                            placeholder="499"
                                            style={{ padding: '8px 12px' }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {expiryReminders.length > 0 && (
                        <div className="reminders-list">
                            {expiryReminders.map((reminder) => (
                                <div key={reminder.id} className="reminder-item">
                                    <div className="reminder-item-left">
                                        <div className="reminder-item-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                        </div>
                                        <span className="reminder-item-text">{reminder.timing}</span>
                                    </div>
                                    <div className="reminder-item-actions">
                                        <button className="reminder-edit-btn" onClick={() => onEditReminder(reminder)}>Edit</button>
                                        <div className="reminder-divider"></div>
                                        <button className="reminder-delete-btn" onClick={() => onDeleteReminder(reminder.id)}>Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <button className="settings-action-btn" onClick={onAddReminder} style={{ marginTop: '12px' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                        Add expiry reminder email
                    </button>
                </div>

                <div className="settings-toggle-section">
                    <div className="settings-toggle-row">
                        <div className="toggle-info">
                            <label className="settings-label">Email Registration</label>
                        </div>
                        <div className="toggle-control">
                            <label className="cd-toggle">
                                <input type="checkbox" checked={emailRegistration} onChange={() => setEmailRegistration(!emailRegistration)} />
                                <span className="cd-toggle-slider"></span>
                            </label>
                            <span className="toggle-state-label">{emailRegistration ? 'On' : 'Off'}</span>
                        </div>
                    </div>
                    <p className="settings-desc small">Track email addresses accessing this collection. <span className="settings-link">Learn more</span></p>
                </div>

                <div className="settings-toggle-section">
                    <div className="settings-toggle-row">
                        <div className="toggle-info">
                            <label className="settings-label">Gallery Assist</label>
                        </div>
                        <div className="toggle-control">
                            <label className="cd-toggle">
                                <input type="checkbox" checked={galleryAssist} onChange={() => setGalleryAssist(!galleryAssist)} />
                                <span className="cd-toggle-slider"></span>
                            </label>
                            <span className="toggle-state-label">{galleryAssist ? 'On' : 'Off'}</span>
                        </div>
                    </div>
                    <p className="settings-desc small">Add walk-through cards to help visitors use the collection. <span className="settings-link">Learn more</span></p>
                </div>

                <div className="settings-toggle-section">
                    <div className="settings-toggle-row">
                        <div className="toggle-info">
                            <label className="settings-label">Slideshow</label>
                        </div>
                        <div className="toggle-control">
                            <label className="cd-toggle">
                                <input
                                    type="checkbox"
                                    checked={slideshow}
                                    onChange={() => {
                                        const newValue = !slideshow;
                                        setSlideshow(newValue);
                                        setCollection(prev => prev ? { ...prev, slideshow_enabled: newValue } : prev);
                                        void persistGalleryVisitorFlags({ slideshow_enabled: newValue });
                                    }}
                                />
                                <span className="cd-toggle-slider"></span>
                            </label>
                            <span className="toggle-state-label">{slideshow ? 'On' : 'Off'}</span>
                        </div>
                    </div>
                    <p className="settings-desc small">Allow visitors to view the images in their collection as a slideshow. <span className="settings-link">Learn more</span></p>
                    <button
                        type="button"
                        className={`settings-action-btn secondary ${showGeneralAdditionalOptions ? 'active' : ''}`}
                        onClick={() => setShowGeneralAdditionalOptions(!showGeneralAdditionalOptions)}
                    >
                        Additional options <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showGeneralAdditionalOptions ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>

                    {showGeneralAdditionalOptions && (
                        <div className="additional-options-panel">
                            <div className="settings-toggle-row">
                                <div className="toggle-info">
                                    <label className="settings-label">Social Sharing</label>
                                </div>
                                <div className="toggle-control">
                                    <label className="cd-toggle">
                                        <input
                                            type="checkbox"
                                            checked={socialSharing}
                                            onChange={() => {
                                                const newValue = !socialSharing;
                                                setSocialSharing(newValue);
                                                setCollection(prev => prev ? { ...prev, social_sharing_enabled: newValue } : prev);
                                                void persistGalleryVisitorFlags({ social_sharing_enabled: newValue });
                                            }}
                                        />
                                        <span className="cd-toggle-slider"></span>
                                    </label>
                                    <span className="toggle-state-label">{socialSharing ? 'On' : 'Off'}</span>
                                </div>
                            </div>
                            <p className="settings-desc small no-margin">Allow collection visitors to share your work to social media.</p>
                        </div>
                    )}
                </div>

                <div className="settings-section">
                    <label className="settings-label">Language</label>
                    <ClientGallerySelect
                        value={language}
                        onChange={setLanguage}
                        aria-label="Collection language"
                        options={[
                            { value: 'English', label: 'English' },
                            { value: 'Spanish', label: 'Spanish' },
                            { value: 'French', label: 'French' },
                            { value: 'German', label: 'German' },
                        ]}
                    />
                    <p className="settings-desc">Choose the language to display this collection in.</p>
                </div>
            </div>

            {pendingWatermark !== null && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '4px',
                        width: '440px',
                        padding: '24px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        position: 'relative'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', color: '#333' }}>
                                Change Default Watermark
                            </h3>
                            <button onClick={() => setPendingWatermark(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: 0 }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#555', lineHeight: '1.5' }}>
                            The watermark '{watermarkOptions.find(o => o.value === pendingWatermark)?.label || pendingWatermark}' will only be applied to new photo uploads moving forward.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button 
                                onClick={() => setPendingWatermark(null)}
                                style={{ background: 'none', border: 'none', padding: '8px 16px', fontSize: '14px', cursor: 'pointer', color: '#555', fontWeight: '500' }}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmWatermarkChange}
                                disabled={isSavingWatermark}
                                style={{ background: '#0d9488', color: 'white', border: 'none', borderRadius: '4px', padding: '8px 20px', fontSize: '14px', cursor: isSavingWatermark ? 'not-allowed' : 'pointer', fontWeight: '500', opacity: isSavingWatermark ? 0.7 : 1 }}
                            >
                                {isSavingWatermark ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
