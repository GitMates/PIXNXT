import React from 'react';
import { GridSettingsProps } from './GridSettings.types';
import { cn } from '../../../../../lib/utils';

export const GridSettings: React.FC<GridSettingsProps> = ({ settings, onChange }) => {
  const updateSetting = (key: keyof typeof settings, value: string) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="cd-grid-settings-pane-content">
      {/* Grid Style */}
      <div className="grid-setting-section">
        <label className="grid-section-label">Grid Style</label>
        <div className="grid-option-cards">
          <div className="grid-option-container">
            <div
              className={cn('grid-option-card', settings.style === 'vertical' && 'active')}
              onClick={() => updateSetting('style', 'vertical')}
            >
              <div className="grid-card-icon">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor">
                  <rect x="8" y="8" width="10" height="10" />
                  <rect x="8" y="22" width="10" height="10" />
                  <rect x="22" y="8" width="10" height="24" />
                </svg>
              </div>
            </div>
            <span className="card-label">Vertical</span>
          </div>
          <div className="grid-option-container">
            <div
              className={cn('grid-option-card', settings.style === 'horizontal' && 'active')}
              onClick={() => updateSetting('style', 'horizontal')}
            >
              <div className="grid-card-icon">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor">
                  <rect x="8" y="8" width="24" height="10" />
                  <rect x="8" y="22" width="10" height="10" />
                  <rect x="22" y="22" width="10" height="10" />
                </svg>
              </div>
            </div>
            <span className="card-label">Horizontal</span>
          </div>
        </div>
      </div>

      {/* Thumbnail Size */}
      <div className="grid-setting-section">
        <label className="grid-section-label">Thumbnail Size</label>
        <div className="grid-option-cards">
          <div className="grid-option-container">
            <div
              className={cn('grid-option-card', settings.size === 'regular' && 'active')}
              onClick={() => updateSetting('size', 'regular')}
            >
              <div className="grid-card-icon">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor">
                  <rect x="8" y="11" width="6" height="8" />
                  <rect x="17" y="11" width="6" height="8" />
                  <rect x="26" y="11" width="6" height="8" />
                  <rect x="8" y="21" width="6" height="8" />
                  <rect x="17" y="21" width="6" height="8" />
                  <rect x="26" y="21" width="6" height="8" />
                </svg>
              </div>
            </div>
            <span className="card-label">Regular</span>
          </div>
          <div className="grid-option-container">
            <div
              className={cn('grid-option-card', settings.size === 'large' && 'active')}
              onClick={() => updateSetting('size', 'large')}
            >
              <div className="grid-card-icon">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor">
                  <rect x="10" y="10" width="8" height="8" />
                  <rect x="22" y="10" width="8" height="8" />
                  <rect x="10" y="22" width="8" height="8" />
                  <rect x="22" y="22" width="8" height="8" />
                </svg>
              </div>
            </div>
            <span className="card-label">Large</span>
          </div>
        </div>
      </div>

      {/* Grid Spacing */}
      <div className="grid-setting-section">
        <label className="grid-section-label">Grid Spacing</label>
        <div className="grid-option-cards">
          <div className="grid-option-container">
            <div
              className={cn('grid-option-card', settings.spacing === 'regular' && 'active')}
              onClick={() => updateSetting('spacing', 'regular')}
            >
              <div className="grid-card-icon">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor">
                  <rect x="11" y="11" width="6" height="6" />
                  <rect x="23" y="11" width="6" height="6" />
                  <rect x="11" y="23" width="6" height="6" />
                  <rect x="23" y="23" width="6" height="6" />
                </svg>
              </div>
            </div>
            <span className="card-label">Regular</span>
          </div>
          <div className="grid-option-container">
            <div
              className={cn('grid-option-card', settings.spacing === 'large' && 'active')}
              onClick={() => updateSetting('spacing', 'large')}
            >
              <div className="grid-card-icon">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor">
                  <rect x="14" y="14" width="12" height="12" />
                </svg>
              </div>
            </div>
            <span className="card-label">Large</span>
          </div>
        </div>
      </div>

      {/* Navigation Style */}
      <div className="grid-setting-section">
        <label className="grid-section-label">Navigation Style</label>
        <div className="grid-option-cards">
          <div className="grid-option-container">
            <div
              className={cn('grid-option-card', settings.navigation === 'icon' && 'active')}
              onClick={() => updateSetting('navigation', 'icon')}
            >
              <div className="grid-card-icon">
                <div className="icon-only-thumb">
                  <div className="thumb-box-rounded"></div>
                </div>
              </div>
            </div>
            <span className="card-label">Icon Only</span>
          </div>
          <div className="grid-option-container">
            <div
              className={cn('grid-option-card', settings.navigation === 'text' && 'active')}
              onClick={() => updateSetting('navigation', 'text')}
            >
              <div className="grid-card-icon">
                <div className="icon-text-thumb">
                  <div className="thumb-box-a">A</div>
                </div>
              </div>
            </div>
            <span className="card-label">Icon & Text</span>
          </div>
        </div>
      </div>
    </div>
  );
};
