import React from 'react';
import { DesignTabProps } from './DesignTab.types';
import { CoverSettings } from './CoverSettings/CoverSettings';
import { TypographySettings } from './TypographySettings/TypographySettings';
import { ColorSettings } from './ColorSettings/ColorSettings';
import { GridSettings } from './GridSettings/GridSettings';
import { DesignSettings, CoverStyleId, FontId, PaletteId, GridSettings as IGridSettings } from '../../../../types/design.types';

export const DesignTab: React.FC<DesignTabProps> = ({ 
  activeTab, 
  settings, 
  coverPhotoUrl,
  onSettingsChange,
  onOpenCoverModal,
  onOpenFocalModal
}) => {
  const handleCoverChange = (id: CoverStyleId) => {
    onSettingsChange({ ...settings, coverStyle: id });
  };

  const handleFontChange = (id: FontId) => {
    onSettingsChange({ ...settings, fontFamily: id });
  };

  const handlePaletteChange = (id: PaletteId) => {
    onSettingsChange({ ...settings, colorPalette: id });
  };

  const handleGridChange = (grid: IGridSettings) => {
    onSettingsChange({ ...settings, grid });
  };

  return (
    <>
      {activeTab === 'cover' && (
        <CoverSettings 
          selectedStyle={settings.coverStyle} 
          coverPhotoUrl={coverPhotoUrl}
          onChange={handleCoverChange}
          onOpenCoverModal={onOpenCoverModal}
          onOpenFocalModal={onOpenFocalModal}
        />
      )}
      {activeTab === 'typography' && (
        <TypographySettings 
          selectedFont={settings.fontFamily} 
          onChange={handleFontChange} 
        />
      )}
      {activeTab === 'color' && (
        <ColorSettings 
          selectedPalette={settings.colorPalette} 
          onChange={handlePaletteChange} 
        />
      )}
      {activeTab === 'grid' && (
        <div className="cd-design-settings-pane">
          <div className="cd-design-settings-header">
            <h2 className="cd-design-title">Grid</h2>
          </div>
          <div className="cd-design-settings-content">
            <GridSettings 
                settings={settings.grid} 
                onChange={handleGridChange} 
            />
          </div>
        </div>
      )}
    </>
  );
};
