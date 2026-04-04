import { CoverStyleId } from '../../../../../types/design.types';

export interface CoverSettingsProps {
  selectedStyle: CoverStyleId;
  onChange: (id: CoverStyleId) => void;
  onOpenCoverModal: () => void;
  onOpenFocalModal: () => void;
}
