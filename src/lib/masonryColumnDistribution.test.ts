import { describe, expect, it } from 'vitest';
import {
  MASONRY_EAGER_TILE_COUNT,
  isMasonryEagerTile,
  isMasonryHighPriorityTile,
} from './masonryColumnDistribution';

describe('masonry eager loading', () => {
  it('eager-loads the first N photos in gallery order, not per column', () => {
    expect(isMasonryEagerTile(0)).toBe(true);
    expect(isMasonryEagerTile(MASONRY_EAGER_TILE_COUNT - 1)).toBe(true);
    expect(isMasonryEagerTile(MASONRY_EAGER_TILE_COUNT)).toBe(false);
    expect(isMasonryEagerTile(107)).toBe(false);
  });

  it('does not treat a column-local index of 0 as eager when the photo is later in the gallery', () => {
    const columnLocalIndex = 0;
    const originalIndex = 120;
    expect(isMasonryEagerTile(columnLocalIndex)).toBe(true);
    expect(isMasonryEagerTile(originalIndex)).toBe(false);
  });

  it('marks only the first visual row as high priority', () => {
    expect(isMasonryHighPriorityTile(0, 6)).toBe(true);
    expect(isMasonryHighPriorityTile(5, 6)).toBe(true);
    expect(isMasonryHighPriorityTile(6, 6)).toBe(false);
  });

  it('allows a larger eager window for scaled preview', () => {
    expect(isMasonryEagerTile(18, 36)).toBe(true);
    expect(isMasonryEagerTile(36, 36)).toBe(false);
  });
});
