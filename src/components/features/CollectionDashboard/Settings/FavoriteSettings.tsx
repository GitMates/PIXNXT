import React from 'react';
import { FavoriteSettingsProps } from './Settings.types';

export const FavoriteSettings: React.FC<FavoriteSettingsProps> = ({
  favoritePhotos,
  setFavoritePhotos,
  favoriteNotes,
  setFavoriteNotes,
  setShowCreateFavoriteListModal,
  setActiveSidebarTab,
  setActiveActivitySubTab
}) => {
  return (
    <div className="cd-general-settings-view">
        <div className="cd-settings-content-header split">
            <h2 className="cd-settings-main-title">Favorite Settings</h2>
            <span className="activity-link" onClick={() => { setActiveSidebarTab('activity'); setActiveActivitySubTab('favorite'); }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg> Favorite Activity
            </span>
        </div>

        <div className="cd-settings-form">
            <div className="settings-toggle-section">
                <div className="settings-toggle-row">
                    <div className="toggle-info">
                        <label className="settings-label">Favorite Photos</label>
                    </div>
                    <div className="toggle-control">
                        <label className="cd-toggle">
                            <input type="checkbox" checked={favoritePhotos} onChange={() => setFavoritePhotos(!favoritePhotos)} />
                            <span className="cd-toggle-slider"></span>
                        </label>
                        <span className="toggle-state-label">{favoritePhotos ? 'On' : 'Off'}</span>
                    </div>
                </div>
                <p className="settings-desc small">Allow visitors to favorite photos. You can review these afterwards in Favorite Activity.</p>
            </div>

            <div className="settings-toggle-section">
                <div className="settings-toggle-row">
                    <div className="toggle-info">
                        <label className="settings-label">Favorite Notes</label>
                    </div>
                    <div className="toggle-control">
                        <label className="cd-toggle">
                            <input type="checkbox" checked={favoriteNotes} onChange={() => setFavoriteNotes(!favoriteNotes)} />
                            <span className="cd-toggle-slider"></span>
                        </label>
                        <span className="toggle-state-label">{favoriteNotes ? 'On' : 'Off'}</span>
                    </div>
                </div>
                <p className="settings-desc small">Allow clients to add notes to photos they have favorited. <span className="settings-link">Learn more</span></p>
            </div>

            <div className="settings-info-box">
                <div className="info-box-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </div>
                <div className="info-box-content">
                    <h4 className="info-box-title">Preset Favorite Lists</h4>
                    <p className="info-box-text">Create Favorite lists and set selection limits for your clients to make selections for albums, free downloads, retouching and more.</p>
                    <span className="settings-link" onClick={() => setShowCreateFavoriteListModal(true)} style={{cursor: 'pointer'}}>Create Favorite List</span>
                </div>
            </div>
        </div>
    </div>
  );
};
