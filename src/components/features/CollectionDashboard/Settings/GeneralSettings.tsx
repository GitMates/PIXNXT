import React from 'react';
import { DatePicker } from '../../../ui/DatePicker';
import { galleryService } from '../../../../services/gallery.service';

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
    setLanguage
}) => {
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
                    <div className="settings-input-wrapper">
                        <input type="text" className="settings-input" placeholder="Select or enter tags" />
                    </div>
                    <p className="settings-desc">Add tags to categorize different collections e.g. wedding, outdoor, summer. <span className="settings-link">Learn more</span></p>
                </div>

                <div className="settings-section">
                    <label className="settings-label">Default Watermark</label>
                    <div className="settings-select-wrapper">
                        <select className="settings-select" value={defaultWatermark} onChange={(e) => setDefaultWatermark(e.target.value)}>
                            <option>No watermark</option>
                            <option>Center Watermark</option>
                            <option>Bottom Right Watermark</option>
                        </select>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="select-arrow"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
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
                                <input type="checkbox" checked={slideshow} onChange={() => setSlideshow(!slideshow)} />
                                <span className="cd-toggle-slider"></span>
                            </label>
                            <span className="toggle-state-label">{slideshow ? 'On' : 'Off'}</span>
                        </div>
                    </div>
                    <p className="settings-desc small">Allow visitors to view the images in their collection as a slideshow. <span className="settings-link">Learn more</span></p>
                    <button className="settings-action-btn secondary">
                        Additional options <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                </div>

                <div className="settings-toggle-section">
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
                                    }} 
                                />
                                <span className="cd-toggle-slider"></span>
                            </label>
                            <span className="toggle-state-label">{socialSharing ? 'On' : 'Off'}</span>
                        </div>
                    </div>
                    <p className="settings-desc small">Allow collection visitors to share your work to social media.</p>
                </div>

                <div className="settings-section">
                    <label className="settings-label">Language</label>
                    <div className="settings-select-wrapper">
                        <select className="settings-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
                            <option>English</option>
                            <option>Spanish</option>
                            <option>French</option>
                            <option>German</option>
                        </select>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="select-arrow"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                    <p className="settings-desc">Choose the language to display this collection in.</p>
                </div>
            </div>
        </div>
    );
};
