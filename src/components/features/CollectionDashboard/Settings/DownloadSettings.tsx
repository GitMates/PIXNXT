import React from 'react';
import { DownloadSettingsProps } from './Settings.types';

export const DownloadSettings: React.FC<DownloadSettingsProps> = ({
  photoDownload,
  setPhotoDownload,
  showAdditionalOptions,
  setShowAdditionalOptions,
  galleryDownload,
  setGalleryDownload,
  singlePhotoDownload,
  setSinglePhotoDownload,
  requirePinForSinglePhoto,
  setRequirePinForSinglePhoto,
  emailRegistration,
  setEmailRegistration,
  restrictSinglePhotoSizes,
  setRestrictSinglePhotoSizes,
  downloadPin,
  setDownloadPin,
  pinValue,
  setPinValue,
  downloadLimit,
  setDownloadLimit,
  restrictToEmails,
  setRestrictToEmails,
  selectedDownloadSets,
  setSelectedDownloadSets,
  sets,
  pinUsageLimit,
  setPinUsageLimit,
  activeDownloadTab,
  setActiveDownloadTab,
  setActiveSidebarTab,
  setActiveActivitySubTab
}) => {
  return (
    <div className="cd-general-settings-view">
        <div className="cd-settings-content-header split">
            <h2 className="cd-settings-main-title">Download Settings</h2>
            <span className="activity-link" onClick={() => { setActiveSidebarTab('activity'); setActiveActivitySubTab('download'); }}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg> Download Activity</span>
        </div>

        <div className="settings-tab-nav">
            <span className={`settings-tab-item ${activeDownloadTab === 'general' ? 'active' : ''}`} onClick={() => setActiveDownloadTab('general')}>General Settings</span>
            <span className={`settings-tab-item ${activeDownloadTab === 'advanced' ? 'active' : ''}`} onClick={() => setActiveDownloadTab('advanced')}>Advanced Settings</span>
        </div>

        <div className="cd-settings-form">
            {activeDownloadTab === 'general' ? (
                <>
                    <div className="settings-toggle-section no-margin">
                        <div className="settings-toggle-row">
                            <div className="toggle-info">
                                <label className="settings-label">Photo Download</label>
                            </div>
                            <div className="toggle-control">
                                <label className="cd-toggle">
                                    <input type="checkbox" checked={photoDownload} onChange={() => setPhotoDownload(!photoDownload)} />
                                    <span className="cd-toggle-slider"></span>
                                </label>
                                <span className="toggle-state-label">{photoDownload ? 'On' : 'Off'}</span>
                            </div>
                        </div>
                        <p className="settings-desc small">Allow visitors to download photos in your gallery</p>
                        <button
                            className={`settings-action-btn secondary ${showAdditionalOptions ? 'active' : ''}`}
                            onClick={() => setShowAdditionalOptions(!showAdditionalOptions)}
                        >
                            Additional options <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showAdditionalOptions ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </button>

                        {showAdditionalOptions && (
                            <div className="additional-options-panel">
                                <div className="checkbox-group mt-12">
                                    <label className="custom-checkbox">
                                        <input type="checkbox" checked={galleryDownload} onChange={() => setGalleryDownload(!galleryDownload)} />
                                        <span className="checkmark"></span>
                                        Gallery Download
                                    </label>
                                    <label className="custom-checkbox">
                                        <input type="checkbox" checked={singlePhotoDownload} onChange={() => setSinglePhotoDownload(!singlePhotoDownload)} />
                                        <span className="checkmark"></span>
                                        Single Photo Download
                                    </label>
                                    <div className="indent-options">
                                        <label className="custom-checkbox">
                                            <input type="checkbox" checked={requirePinForSinglePhoto} onChange={() => setRequirePinForSinglePhoto(!requirePinForSinglePhoto)} />
                                            <span className="checkmark"></span>
                                            Require PIN for single photos
                                        </label>
                                        <label className="custom-checkbox">
                                            <input type="checkbox" checked={emailRegistration} onChange={() => setEmailRegistration(!emailRegistration)} />
                                            <span className="checkmark"></span>
                                            Email Tracking
                                        </label>
                                        <label className="custom-checkbox">
                                            <input type="checkbox" checked={restrictSinglePhotoSizes} onChange={() => setRestrictSinglePhotoSizes(!restrictSinglePhotoSizes)} />
                                            <span className="checkmark"></span>
                                            Restrict Single Photo sizes
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="settings-toggle-section">
                        <div className="settings-toggle-row">
                            <div className="toggle-info">
                                <label className="settings-label">Download PIN</label>
                            </div>
                            <div className="toggle-control">
                                <label className="cd-toggle">
                                    <input type="checkbox" checked={downloadPin} onChange={() => setDownloadPin(!downloadPin)} />
                                    <span className="cd-toggle-slider"></span>
                                </label>
                                <span className="toggle-state-label">{downloadPin ? 'On' : 'Off'}</span>
                            </div>
                        </div>
                        {downloadPin && (
                            <div className="settings-input-wrapper with-action mt-12">
                                <input type="text" className="settings-input" value={pinValue} onChange={(e) => setPinValue(e.target.value)} maxLength={4} />
                                <button className="input-action-btn no-icon" onClick={() => setPinValue(Math.floor(1000 + Math.random() * 9000).toString())}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                                    Reset PIN
                                </button>
                            </div>
                        )}
                        <p className="settings-desc">Require visitors to enter a 4-digit PIN to download photos and videos.</p>
                    </div>
                </>
            ) : (
                <div className="advanced-settings-panel">
                    <div className="settings-section">
                        <label className="settings-label">Download Limits</label>
                        <p className="settings-desc">Limit the total number of photo downloads for this collection. Leave blank for no limit.</p>
                        <div className="settings-input-wrapper">
                            <input
                                type="number"
                                className="settings-input"
                                placeholder="No limit"
                                value={downloadLimit}
                                onChange={(e) => setDownloadLimit(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="settings-section">
                        <label className="settings-label">Restrict to Specific Emails</label>
                        <p className="settings-desc">Only allow these email addresses to download. Separate with commas.</p>
                        <div className="settings-input-wrapper">
                            <textarea
                                className="settings-input settings-textarea"
                                placeholder="e.g. client@example.com, assistant@example.com"
                                value={restrictToEmails}
                                onChange={(e) => setRestrictToEmails(e.target.value)}
                                style={{ height: '80px', padding: '12px' }}
                            />
                        </div>
                    </div>

                    <div className="settings-section">
                        <label className="settings-label">Set-Specific Downloads</label>
                        <p className="settings-desc">Choose which photo sets are available for download.</p>
                        <div className="checkbox-group mt-8">
                            <label className="custom-checkbox">
                                <input
                                    type="checkbox"
                                    checked={selectedDownloadSets.includes('Highlights')}
                                    onChange={() => {
                                        setSelectedDownloadSets(prev =>
                                            prev.includes('Highlights') ? prev.filter(s => s !== 'Highlights') : [...prev, 'Highlights']
                                        );
                                    }}
                                />
                                <span className="checkmark"></span>
                                Highlights (All Photos)
                            </label>
                            {sets.map(set => (
                                <label key={set.id} className="custom-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={selectedDownloadSets.includes(set.name)}
                                        onChange={() => {
                                            setSelectedDownloadSets(prev =>
                                                prev.includes(set.name) ? prev.filter(s => s !== set.name) : [...prev, set.name]
                                            );
                                        }}
                                    />
                                    <span className="checkmark"></span>
                                    {set.name}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="settings-section">
                        <label className="settings-label">PIN Usage Limits</label>
                        <p className="settings-desc">Limit the number of times the download PIN can be used.</p>
                        <div className="settings-input-wrapper">
                            <input
                                type="number"
                                className="settings-input"
                                placeholder="No limit"
                                value={pinUsageLimit}
                                onChange={(e) => setPinUsageLimit(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
