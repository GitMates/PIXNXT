import { CoverStyleId } from '../../../../../types/design.types';

export interface CoverSettingsProps {
  selectedStyle: CoverStyleId;
  coverPhotoUrl?: string;
  onChange: (id: CoverStyleId) => void;
  onOpenCoverModal: () => void;
  onOpenFocalModal: () => void;
}
