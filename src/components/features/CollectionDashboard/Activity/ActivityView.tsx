import React from 'react';
import { ActivityViewProps } from './ActivityView.types';
import { ActivityTab } from '../../../../types/collection.types';

export const ActivityView: React.FC<ActivityViewProps> = ({
  activeTab,
  onTabChange
}) => {
  return (
    <div className="cd-general-settings-view">
      <div className="cd-settings-content-header split">
        <h2 className="cd-settings-main-title">Activity</h2>
      </div>

      <div className="settings-tab-nav">
        {(['download', 'favorite', 'store', 'email', 'share', 'private'] as ActivityTab[]).map(tab => (
          <span 
            key={tab}
            className={`settings-tab-item ${activeTab === tab ? 'active' : ''}`} 
            onClick={() => onTabChange(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </span>
        ))}
      </div>

      <div className="cd-empty-state-section">
        <div className="cd-empty-state-content">
          <h3 className="cd-empty-state-title">No activity yet</h3>
          <p className="cd-empty-state-text">Activity details will show here when visitors interact with your collection.</p>
        </div>
      </div>
    </div>
  );
};
