export const MOBILE_GRID_ROW_HEIGHT = 56;
export const LANDSCAPE_THRESHOLD = 1.05;
export const PORTRAIT_THRESHOLD = 0.95;
export const FULL_WIDTH_LANDSCAPE_AR = 1.35;

export function getPhotoAspectRatio(photo, measured = {}) {
  if (photo?.width && photo?.height) {
    return photo.width / photo.height;
  }
  if (photo?.id && measured[photo.id]) {
    return measured[photo.id];
  }
  return 1.5;
}

export function getPhotoOrientation(photo, measured = {}) {
  const aspectRatio = getPhotoAspectRatio(photo, measured);
  if (aspectRatio > LANDSCAPE_THRESHOLD) return 'landscape';
  if (aspectRatio < PORTRAIT_THRESHOLD) return 'portrait';
  return 'square';
}

/** Portrait-first for vertical grids; landscape-first for horizontal grids. */
export function sortPhotosByGridStyle(photos, gridStyle, measured = {}) {
  const preferLandscape = gridStyle === 'horizontal';

  return [...photos].sort((a, b) => {
    const score = (photo) => {
      const orientation = getPhotoOrientation(photo, measured);
      if (preferLandscape) {
        if (orientation === 'landscape') return 2;
        if (orientation === 'square') return 1;
        return 0;
      }
      if (orientation === 'portrait') return 2;
      if (orientation === 'square') return 1;
      return 0;
    };

    const diff = score(b) - score(a);
    if (diff !== 0) return diff;

    return (
      (a.position ?? 0) - (b.position ?? 0) ||
      String(a.created_at || '').localeCompare(String(b.created_at || '')) ||
      String(a.id || '').localeCompare(String(b.id || ''))
    );
  });
}

export function buildPhotoAspectRatioMap(photos, measured = {}) {
  const map = { ...measured };
  photos.forEach((photo) => {
    if (photo?.width && photo?.height) {
      map[photo.id] = photo.width / photo.height;
    }
  });
  return map;
}

/**
 * Pixieset-style horizontal rows: full-width landscapes, paired portraits,
 * or a 2/3 + 1/3 split when a landscape follows a portrait.
 */
export function buildHorizontalGridRows(photos, measured = {}) {
  const rows = [];
  let index = 0;

  while (index < photos.length) {
    const current = photos[index];
    const currentOrientation = getPhotoOrientation(current, measured);

    if (currentOrientation === 'landscape') {
      rows.push({ layout: 'full', photos: [current] });
      index += 1;
      continue;
    }

    const next = photos[index + 1];
    if (!next) {
      rows.push({ layout: 'single', photos: [current] });
      index += 1;
      continue;
    }

    const nextOrientation = getPhotoOrientation(next, measured);

    if (nextOrientation === 'landscape') {
      rows.push({ layout: 'split', photos: [next, current], wideIndex: 0 });
      index += 2;
      continue;
    }

    rows.push({ layout: 'pair', photos: [current, next] });
    index += 2;
  }

  return rows;
}

export function getHorizontalGridItemStyle(photo, measured, rowHeight = MOBILE_GRID_ROW_HEIGHT) {
  const aspectRatio = getPhotoAspectRatio(photo, measured);

  return {
    aspectRatio: String(aspectRatio),
    width: '100%',
  };
}
