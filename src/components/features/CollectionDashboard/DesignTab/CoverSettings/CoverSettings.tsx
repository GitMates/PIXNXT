import React from 'react';
import { CoverSettingsProps } from './CoverSettings.types';
import { COVER_STYLES } from '../../../../../constants/designOptions';
import { cn } from '../../../../../lib/utils';

export const CoverSettings: React.FC<CoverSettingsProps> = ({
  selectedStyle,
  onChange,
  onOpenCoverModal,
  onOpenFocalModal
}) => {
  return (
    <div className="cd-design-settings-pane">
      <div className="cd-design-settings-header">
        <h2 className="cd-design-title">Cover</h2>
        <div className="cd-design-tabs">
          <button className="cd-design-tab-btn active" onClick={onOpenCoverModal}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
            Cover Photo
          </button>
          <button className="cd-design-tab-btn" onClick={onOpenFocalModal}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>
            Focal
          </button>
        </div>
      </div>

      <div className="cd-design-settings-content">
        <div className="cd-cover-grid">
          {COVER_STYLES.map(style => (
            <div
              key={style.id}
              className={cn('cd-cover-card', selectedStyle === style.id && 'active')}
              onClick={() => onChange(style.id)}
            >
              <div className="cd-cover-card-preview">
                <div className={cn('preview-box', `style-${style.id}`)}>
                  <div className="preview-content">
                    <div className="preview-image"></div>
                    {style.id === 'divider' && <div className="preview-image"></div>}
                    <div className="preview-title">TITLE</div>
                  </div>
                </div>
              </div>
              <span className="cd-cover-card-name">{style.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
