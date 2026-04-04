import { DesignSettings, CoverStyleId, FontId, PaletteId, GridSettings as IGridSettings } from '../../../../types/design.types';

export interface DesignTabProps {
  activeTab: 'cover' | 'typography' | 'color' | 'grid';
  settings: DesignSettings;
  onSettingsChange: (settings: DesignSettings) => void;
  onOpenCoverModal: () => void;
  onOpenFocalModal: () => void;
}
