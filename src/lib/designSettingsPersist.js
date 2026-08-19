import {
  GALLERY_GRID_COLUMN_MASONRY,
  GALLERY_GRID_ROW_MASONRY,
  isRowMasonryGridStyle,
} from './galleryGridStyle';
import { navigationStyleToDb, normalizeNavigationStyle } from './navStyle';
import {
  fontIdToDb,
  normalizeFontId,
  normalizePaletteId,
  paletteIdToDb,
} from './normalizeDesignTokens';

/** DB enum: regular | large | small (small added in 20260814180000). */
export function thumbnailSizeToDb(size) {
  if (size === 'large') return 'large';
  if (size === 'small' || size === 'x-small') return 'small';
  return 'regular';
}

export function thumbnailSizeFromDb(size) {
  if (size === 'large') return 'large';
  if (size === 'small' || size === 'x-small') return 'small';
  return 'regular';
}

/** DB enum: tight | regular | large */
export function gridSpacingToDb(spacing) {
  if (spacing === 'large') return 'large';
  if (spacing === 'none' || spacing === 'small' || spacing === 'tight') return 'tight';
  return 'regular';
}

export function gridSpacingFromDb(spacing) {
  return spacing === 'large' ? 'large' : 'regular';
}

export function gridStyleToDb(style) {
  return isRowMasonryGridStyle(style) ? GALLERY_GRID_ROW_MASONRY : GALLERY_GRID_COLUMN_MASONRY;
}

export function gridStyleFromDb(style) {
  return isRowMasonryGridStyle(style) ? GALLERY_GRID_ROW_MASONRY : GALLERY_GRID_COLUMN_MASONRY;
}

export function chromeFromDelivery(row) {
  const extras = row?.design_options && typeof row.design_options === 'object'
    ? row.design_options
    : {};
  return {
    fontFamily: normalizeFontId(extras.font_family || row?.font_family),
    colorPalette: normalizePaletteId(extras.color_palette || row?.color_palette),
  };
}

export function gridSettingsFromDelivery(row) {
  const extras = row?.design_options && typeof row.design_options === 'object'
    ? row.design_options
    : {};
  return {
    style: gridStyleFromDb(extras.grid_style || row?.grid_style),
    size: thumbnailSizeFromDb(extras.thumbnail_size || row?.thumbnail_size),
    spacing: gridSpacingFromDb(extras.grid_spacing || row?.grid_spacing),
    navigation: normalizeNavigationStyle(extras.nav_style || row?.nav_style),
  };
}

/** Payload written to public.deliveries for Design tab grid + chrome. */
export function toDeliveryDesignPatch({
  coverStyle,
  fontFamily,
  colorPalette,
  grid,
}) {
  const fontUi = normalizeFontId(fontFamily);
  const paletteUi = normalizePaletteId(colorPalette);
  const grid_style = gridStyleToDb(grid?.style);
  const thumbnail_size = thumbnailSizeToDb(grid?.size);
  const grid_spacing = gridSpacingToDb(grid?.spacing);
  const nav_style = navigationStyleToDb(normalizeNavigationStyle(grid?.navigation));
  const patch = {
    font_family: fontIdToDb(fontUi),
    color_palette: paletteIdToDb(paletteUi),
    grid_style,
    thumbnail_size,
    grid_spacing,
    nav_style,
    design_options: {
      font_family: fontUi,
      color_palette: paletteUi,
      grid_style,
      thumbnail_size,
      grid_spacing,
      nav_style,
    },
  };
  if (coverStyle && coverStyle !== 'photo' && coverStyle !== 'text_only') {
    patch.cover_layout = coverStyle;
    patch.cover_style = coverStyle === 'none' ? 'text_only' : 'photo';
  }
  return patch;
}
