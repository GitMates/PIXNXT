import React from 'react';

export const StoreSettings: React.FC = () => {
  return (
    <div className="cd-general-settings-view">
      <div className="cd-settings-content-header split">
        <h2 className="cd-settings-main-title">
          Store Settings 
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: '8px'}}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        </h2>
        <span className="activity-link"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg> Store Activity</span>
      </div>

      <div className="cd-settings-form">
        <div className="settings-info-box">
          <div className="info-box-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#593116" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          </div>
          <div className="info-box-content">
            <h4 className="info-box-title">Activate Store</h4>
            <p className="info-box-text">Setup Pixieset Store to start selling prints, digital downloads, and more directly from your collections.</p>
            <span className="settings-link">Get Started</span>
          </div>
        </div>
      </div>
    </div>
  );
};
