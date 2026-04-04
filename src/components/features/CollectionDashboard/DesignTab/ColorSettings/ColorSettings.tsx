import React from 'react';
import { ColorSettingsProps } from './ColorSettings.types';
import { COLOR_PALETTES } from '../../../../../constants/designOptions';
import { cn } from '../../../../../lib/utils';

export const ColorSettings: React.FC<ColorSettingsProps> = ({ selectedPalette, onChange }) => {
  return (
    <div className="cd-design-settings-pane">
      <div className="cd-design-settings-header">
        <h2 className="cd-design-title">Color</h2>
      </div>
      <div className="cd-design-settings-content">
        <div className="cd-color-grid">
          {COLOR_PALETTES.map(palette => (
            <div
              key={palette.id}
              className={cn('cd-color-card', selectedPalette === palette.id && 'active')}
              onClick={() => onChange(palette.id)}
            >
              <div className="cd-color-preview-box">
                {palette.colors.map((color, i) => (
                  <div key={i} className="color-swatch" style={{ backgroundColor: color }}></div>
                ))}
              </div>
              <span className="cd-color-name">{palette.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
