import { GridSettings as IGridSettings } from '../../../../../types/design.types';

export interface GridSettingsProps {
  settings: IGridSettings;
  onChange: (settings: IGridSettings) => void;
}
