/**
 * Shortest-column masonry packing.
 * Preserves photo sequence better than round-robin (i % colCount) because
 * fill stays level across columns instead of stacking tall tiles in one column.
 */
export function distributePhotosToShortestColumns<T>(
  photos: T[],
  colCount: number,
  colWidth: number,
  gap: number,
  getAspectRatio: (photo: T) => number,
): T[][] {
  const count = Math.max(1, colCount);
  const columns = Array.from({ length: count }, () => [] as T[]);
  const heights = new Array(count).fill(0);
  const safeColWidth = Math.max(colWidth, 1);

  for (const photo of photos) {
    const aspectRatio = Math.max(getAspectRatio(photo), 0.01);
    const tileHeight = safeColWidth / aspectRatio;

    let shortestIdx = 0;
    for (let i = 1; i < count; i += 1) {
      if (heights[i] < heights[shortestIdx]) shortestIdx = i;
    }

    columns[shortestIdx].push(photo);
    heights[shortestIdx] += tileHeight + gap;
  }

  return columns;
}

const MOBILE_MASONRY_BREAKPOINT = 768;

export type ThumbnailSizeId = 'large' | 'regular' | 'small' | 'x-small';

/** Images per row: large 4/2, regular 6/3, small 8/4 (web / mobile). */
export function getThumbnailSizeColumnCount(
  size?: string | null,
  isMobile = false,
): number {
  const normalized =
    size === 'large' ? 'large' : size === 'small' || size === 'x-small' ? 'small' : 'regular';
  if (normalized === 'large') return isMobile ? 2 : 4;
  if (normalized === 'small') return isMobile ? 4 : 8;
  return isMobile ? 3 : 6;
}

/**
 * Responsive column count for public gallery masonry, driven by thumbnail size.
 */
export function getGalleryMasonryColumnCount(
  viewportWidth: number,
  size?: string | null,
): number {
  return getThumbnailSizeColumnCount(size, viewportWidth <= MOBILE_MASONRY_BREAKPOINT);
}
