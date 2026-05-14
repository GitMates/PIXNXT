import React from 'react';
import { GeneralSettingsProps } from './Settings.types';

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  collectionUrl,
  setCollectionUrl,
  defaultWatermark,
  setDefaultWatermark,
  autoExpiry,
  setAutoExpiry,
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
}) => {
  return (
    <div className="cd-general-settings-view">
      <div className="cd-settings-content-header">
        <h2 className="cd-settings-main-title">
          General Settings 
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: '8px'}}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        </h2>
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
          <label className="settings-label">Default Watermark</label>
          <div className="settings-select-wrapper">
            <select className="settings-select" value={defaultWatermark} onChange={(e) => setDefaultWatermark(e.target.value)}>
              <option>No watermark</option>
              <option>Center Watermark</option>
              <option>Bottom Right Watermark</option>
            </select>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="select-arrow"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
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
          <p className="settings-desc small">Track email addresses accessing this collection.</p>
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
        </div>

        <div className="settings-toggle-section">
          <div className="settings-toggle-row">
            <div className="toggle-info">
              <label className="settings-label">Social Sharing</label>
            </div>
            <div className="toggle-control">
              <label className="cd-toggle">
                <input type="checkbox" checked={socialSharing} onChange={() => setSocialSharing(!socialSharing)} />
                <span className="cd-toggle-slider"></span>
              </label>
              <span className="toggle-state-label">{socialSharing ? 'On' : 'Off'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
