import { DesignSettings } from '../../../../types/design.types';

export interface DesignTabProps {
  settings: DesignSettings;
  coverPhotoUrl?: string | null;
  coverFocalX?: number;
  coverFocalY?: number;
  onSettingsChange: (settings: DesignSettings) => void;
  onOpenCoverModal: () => void;
  onOpenFocalModal: () => void;
  onCoverFileSelect?: (file: File) => void | Promise<void>;
}
