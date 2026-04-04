import React from 'react';
import { GridSettingsProps } from './GridSettings.types';
import { cn } from '../../../../../lib/utils';
import {
  GRID_STYLES,
  THUMBNAIL_SIZES,
  GRID_SPACING,
  ASPECT_RATIOS,
  NAVIGATION_STYLES
} from '../../../../../constants/designOptions';

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
          <div
            className={cn('grid-option-card', settings.style === 'vertical' && 'active')}
            onClick={() => updateSetting('style', 'vertical')}
          >
            <div className="grid-card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="7" height="7" rx="0.5" />
                <rect x="4" y="13" width="7" height="7" rx="0.5" />
                <rect x="13" y="4" width="7" height="16" rx="0.5" />
              </svg>
            </div>
            <span className="card-label">Vertical</span>
          </div>
          <div
            className={cn('grid-option-card', settings.style === 'horizontal' && 'active')}
            onClick={() => updateSetting('style', 'horizontal')}
          >
            <div className="grid-card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="7" rx="0.5" />
                <rect x="4" y="13" width="7" height="7" rx="0.5" />
                <rect x="13" y="13" width="7" height="7" rx="0.5" />
              </svg>
            </div>
            <span className="card-label">Horizontal</span>
          </div>
        </div>
      </div>

      {/* Thumbnail Size */}
      <div className="grid-setting-section">
        <label className="grid-section-label">Thumbnail Size</label>
        <div className="grid-option-cards">
          <div
            className={cn('grid-option-card', settings.size === 'regular' && 'active')}
            onClick={() => updateSetting('size', 'regular')}
          >
            <div className="grid-card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="4" height="4" rx="0.2" />
                <rect x="10" y="4" width="4" height="4" rx="0.2" />
                <rect x="16" y="4" width="4" height="4" rx="0.2" />
                <rect x="4" y="10" width="4" height="4" rx="0.2" />
                <rect x="10" y="10" width="4" height="4" rx="0.2" />
                <rect x="16" y="10" width="4" height="4" rx="0.2" />
                <rect x="4" y="16" width="4" height="4" rx="0.2" />
                <rect x="10" y="16" width="4" height="4" rx="0.2" />
                <rect x="16" y="16" width="4" height="4" rx="0.2" />
              </svg>
            </div>
            <span className="card-label">Regular</span>
          </div>
          <div
            className={cn('grid-option-card', settings.size === 'large' && 'active')}
            onClick={() => updateSetting('size', 'large')}
          >
            <div className="grid-card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="5" width="7" height="6" rx="0.5" />
                <rect x="13" y="5" width="7" height="6" rx="0.5" />
                <rect x="4" y="13" width="7" height="6" rx="0.5" />
                <rect x="13" y="13" width="7" height="6" rx="0.5" />
              </svg>
            </div>
            <span className="card-label">Large</span>
          </div>
        </div>
      </div>

      {/* Grid Spacing */}
      <div className="grid-setting-section">
        <label className="grid-section-label">Grid Spacing</label>
        <div className="grid-option-cards">
          <div
            className={cn('grid-option-card', settings.spacing === 'regular' && 'active')}
            onClick={() => updateSetting('spacing', 'regular')}
          >
            <div className="grid-card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="5" width="4" height="4" rx="0.2" />
                <rect x="15" y="5" width="4" height="4" rx="0.2" />
                <rect x="5" y="15" width="4" height="4" rx="0.2" />
                <rect x="15" y="15" width="4" height="4" rx="0.2" />
              </svg>
            </div>
            <span className="card-label">Regular</span>
          </div>
          <div
            className={cn('grid-option-card', settings.spacing === 'large' && 'active')}
            onClick={() => updateSetting('spacing', 'large')}
          >
            <div className="grid-card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="7" y="7" width="4" height="4" rx="0.2" />
                <rect x="13" y="7" width="4" height="4" rx="0.2" />
                <rect x="7" y="13" width="4" height="4" rx="0.2" />
                <rect x="13" y="13" width="4" height="4" rx="0.2" />
              </svg>
            </div>
            <span className="card-label">Large</span>
          </div>
        </div>
      </div>

      {/* Navigation Style */}
      <div className="grid-setting-section">
        <label className="grid-section-label">Navigation Style</label>
        <div className="grid-option-cards">
          <div
            className={cn('grid-option-card', settings.navigation === 'icon' && 'active')}
            onClick={() => updateSetting('navigation', 'icon')}
          >
            <div className="grid-card-icon">
              <div className="icon-only-thumb">
                <div className="thumb-box-rounded"></div>
              </div>
            </div>
            <span className="card-label">Icon Only</span>
          </div>
          <div
            className={cn('grid-option-card', settings.navigation === 'text' && 'active')}
            onClick={() => updateSetting('navigation', 'text')}
          >
            <div className="grid-card-icon">
              <div className="icon-text-thumb">
                <div className="thumb-box-a">A</div>
              </div>
            </div>
            <span className="card-label">Icon & Text</span>
          </div>
        </div>
      </div>
    </div>
  );
};
