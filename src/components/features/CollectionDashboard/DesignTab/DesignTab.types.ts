import { DesignSettings, CoverStyleId, FontId, PaletteId, GridSettings as IGridSettings } from '../../../../types/design.types';

export interface DesignTabProps {
  activeTab: 'cover' | 'typography' | 'color' | 'grid';
  settings: DesignSettings;
  coverPhotoUrl?: string | null;
  onSettingsChange: (settings: DesignSettings) => void;
  onOpenCoverModal: () => void;
  onOpenFocalModal: () => void;
}
