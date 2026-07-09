import React from 'react';
import { StoreSettingsProps } from './Settings.types';

export const StoreSettings: React.FC<StoreSettingsProps> = ({
  storeEnabled,
  setStoreEnabled,
  setActiveSidebarTab,
  setActiveActivitySubTab
}) => {
  return (
    <div className="cd-general-settings-view">
      <div className="cd-settings-content-header split">
        <h2 className="cd-settings-main-title">
          Print Lab Settings
        </h2>
        <span className="activity-link" onClick={() => { setActiveSidebarTab('activity'); setActiveActivitySubTab('store'); }} style={{ cursor: 'pointer' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg> Print Lab Activity
        </span>
      </div>

      <div className="cd-settings-form">
        <div className="settings-toggle-section">
          <div className="settings-toggle-row">
            <div className="toggle-info">
              <label className="settings-label">Print Lab </label>
            </div>
            <div className="toggle-control">
              <label className="cd-toggle">
                <input type="checkbox" checked={storeEnabled} onChange={() => setStoreEnabled(!storeEnabled)} />
                <span className="cd-toggle-slider"></span>
              </label>
              <span className="toggle-state-label">{storeEnabled ? 'On' : 'Off'}</span>
            </div>
          </div>
          <p className="settings-desc small">Activate Print Lab to allow visitors to purchase prints and products directly from your collections.</p>
        </div>
      </div>
    </div>
  );
};
