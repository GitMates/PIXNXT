import React from 'react';
import { TypographySettingsProps } from './TypographySettings.types';
import { TYPOGRAPHY_OPTIONS } from '../../../../../constants/designOptions';
import { cn } from '../../../../../lib/utils';

export const TypographySettings: React.FC<TypographySettingsProps> = ({ selectedFont, onChange }) => {
  return (
    <div className="cd-design-settings-pane">
      <div className="cd-design-settings-header">
        <h2 className="cd-design-title">Typography</h2>
      </div>
      <div className="cd-design-settings-content">
        <div className="cd-typography-grid">
          {TYPOGRAPHY_OPTIONS.map(option => (
            <div
              key={option.id}
              className={cn('cd-typography-card', selectedFont === option.id && 'active')}
              onClick={() => onChange(option.id)}
            >
              <div className={cn('cd-typography-preview-box', `font-preview-${option.id}`)}>
                <div className="sample-text">{option.sample}</div>
                <div className="desc-text">{option.desc}</div>
              </div>
              <span className="cd-typography-name">{option.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
