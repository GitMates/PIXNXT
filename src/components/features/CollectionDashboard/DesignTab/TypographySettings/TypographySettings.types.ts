import { FontId } from '../../../../../types/design.types';

export interface TypographySettingsProps {
  selectedFont: FontId;
  onChange: (id: FontId) => void;
}
