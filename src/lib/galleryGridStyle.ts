/**
 * Gallery grid layout styles stored on collections.grid_style.
 *
 * Naming note: `vertical` means column masonry (photos flow down each column).
 * It does NOT mean horizontal rows. Use isRowMasonryGridStyle() for the row layout.
 */
export type GalleryGridStyleDb = 'vertical' | 'horizontal' | 'masonry';

/** DB value for column masonry (legacy name: vertical). */
export const GALLERY_GRID_COLUMN_MASONRY = 'vertical' as const;

/** DB value for row masonry. */
export const GALLERY_GRID_ROW_MASONRY = 'horizontal' as const;

export function isRowMasonryGridStyle(style?: string | null): boolean {
  return style?.toLowerCase() === GALLERY_GRID_ROW_MASONRY;
}

export function isColumnMasonryGridStyle(style?: string | null): boolean {
  return !isRowMasonryGridStyle(style);
}

/** User-facing label for design settings UI. */
export function galleryGridStyleLabel(style?: string | null): string {
  return isRowMasonryGridStyle(style) ? 'Rows' : 'Columns';
}
