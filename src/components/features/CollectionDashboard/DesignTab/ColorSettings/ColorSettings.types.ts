import { PaletteId } from '../../../../../types/design.types';

export interface ColorSettingsProps {
  selectedPalette: PaletteId;
  onChange: (id: PaletteId) => void;
}
