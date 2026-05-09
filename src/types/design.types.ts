export type CoverStyleId =
  | 'center'
  | 'left'
  | 'novel'
  | 'vintage'
  | 'frame'
  | 'stripe'
  | 'divider'
  | 'journal'
  | 'stamp'
  | 'outline'
  | 'classic'
  | 'none';

export type FontId = 'sans' | 'serif' | 'modern' | 'timeless' | 'bold' | 'subtle';

export type PaletteId = 'light' | 'gold' | 'rose' | 'terracotta' | 'sand' | 'olive' | 'agave' | 'sea' | 'dark';

export type AspectRatioId = 'original' | 'square' | '3-2' | '4-5' | '16-9';

export interface GridSettings {
  style: 'vertical' | 'horizontal';
  size: 'regular' | 'large' | 'small' | 'x-small';
  spacing: 'none' | 'small' | 'regular' | 'large';
  aspectRatio: AspectRatioId;
  navigation: 'icon' | 'text';
}

export interface DesignSettings {
  coverStyle: CoverStyleId;
  fontFamily: FontId;
  colorPalette: PaletteId;
  grid: GridSettings;
}
