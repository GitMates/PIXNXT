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

/**
 * Responsive column count for public gallery masonry.
 * 4 columns above 1600px keeps collages readable (616px → ~460px per tile).
 */
export function getGalleryMasonryColumnCount(viewportWidth: number): number {
  if (viewportWidth <= 480) return 1;
  if (viewportWidth <= 768) return 2;
  if (viewportWidth <= 1600) return 3;
  return 4;
}
