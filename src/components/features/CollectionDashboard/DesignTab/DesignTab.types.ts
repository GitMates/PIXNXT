import { DesignSettings } from '../../../../types/design.types';

export interface DesignTabProps {
  settings: DesignSettings;
  coverPhotoUrl?: string | null;
  onSettingsChange: (settings: DesignSettings) => void;
  onOpenCoverModal: () => void;
  onOpenFocalModal: () => void;
}
