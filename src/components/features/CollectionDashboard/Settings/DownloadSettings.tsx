import React from 'react';
import { DownloadSettingsProps } from './Settings.types';

export const DownloadSettings: React.FC<DownloadSettingsProps> = ({
  photoDownload,
  setPhotoDownload,
  photoDownloadSizes,
  setPhotoDownloadSizes,
  downloadPin,
  setDownloadPin,
  pinValue,
  setPinValue,
  activeTab,
  setActiveTab
}) => {
  return (
    <div className="cd-general-settings-view">
      <div className="cd-settings-content-header split">
        <h2 className="cd-settings-main-title">
          Download Settings 
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: '8px'}}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        </h2>
        <span className="activity-link"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg> Download Activity</span>
      </div>

      <div className="settings-tab-nav">
        <span 
          className={`settings-tab-item ${activeTab === 'general' ? 'active' : ''}`} 
          onClick={() => setActiveTab('general')}
        >
          General Settings
        </span>
        <span 
          className={`settings-tab-item ${activeTab === 'advanced' ? 'active' : ''}`} 
          onClick={() => setActiveTab('advanced')}
        >
          Advanced Settings
        </span>
      </div>

      <div className="cd-settings-form">
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
        </div>

        <div className="settings-section">
          <label className="settings-label">Download PIN</label>
          <div className="settings-toggle-row">
             <div className="toggle-control">
                 <label className="cd-toggle">
                    <input type="checkbox" checked={downloadPin} onChange={() => setDownloadPin(!downloadPin)} />
                    <span className="cd-toggle-slider"></span>
                 </label>
             </div>
          </div>
          <div className="settings-input-wrapper with-action mt-12">
            <input 
              type="text" 
              className="settings-input" 
              value={pinValue} 
              onChange={(e) => setPinValue(e.target.value)} 
            />
            <button className="input-action-btn no-icon">
              Reset PIN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
