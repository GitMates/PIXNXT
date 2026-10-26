import { describe, expect, it } from 'vitest';
import {
  deliveryDashboardSeed,
  deliveryManageNavState,
  matchingDeliverySeed,
  shouldBlockDeliveryOpen,
} from './deliveryDashboardSeed';

describe('deliveryDashboardSeed', () => {
  it('returns null without a gallery id', () => {
    expect(deliveryDashboardSeed(null)).toBeNull();
    expect(deliveryDashboardSeed({})).toBeNull();
  });

  it('copies the created gallery and defaults empty photos and sets', () => {
    const seed = deliveryDashboardSeed({
      id: 'g1',
      name: 'Priya Wedding',
      slug: 'priya-wedding',
      status: 'draft',
    });

    expect(seed).toEqual({
      id: 'g1',
      name: 'Priya Wedding',
      slug: 'priya-wedding',
      status: 'draft',
      photos: [],
      sets: [],
    });
  });

  it('keeps photos and sets already on the gallery', () => {
    const photos = [{ id: 'p1' }];
    const sets = [{ id: 's1' }];
    const seed = deliveryDashboardSeed({
      id: 'g1',
      photos,
      sets,
    });

    expect(seed.photos).toEqual(photos);
    expect(seed.sets).toEqual(sets);
  });
});

describe('matchingDeliverySeed', () => {
  const seed = deliveryDashboardSeed({ id: 'g1', name: 'Priya Wedding' });

  it('returns the seed when ids match', () => {
    expect(matchingDeliverySeed(seed, 'g1')).toEqual(seed);
  });

  it('returns null when the seed belongs to another delivery', () => {
    expect(matchingDeliverySeed(seed, 'g2')).toBeNull();
  });

  it('returns null when seed or id is missing', () => {
    expect(matchingDeliverySeed(null, 'g1')).toBeNull();
    expect(matchingDeliverySeed(seed, '')).toBeNull();
  });
});

describe('shouldBlockDeliveryOpen', () => {
  const seed = deliveryDashboardSeed({ id: 'g1', name: 'Priya Wedding' });

  it('does not block when navigation carried a matching seed', () => {
    expect(shouldBlockDeliveryOpen({ collectionId: 'g1', seed })).toBe(false);
  });

  it('does not block when this delivery is already in memory', () => {
    expect(
      shouldBlockDeliveryOpen({
        collectionId: 'g1',
        collection: { id: 'g1', name: 'Priya Wedding' },
      }),
    ).toBe(false);
  });

  it('blocks when opening a delivery with no seed and no current row', () => {
    expect(shouldBlockDeliveryOpen({ collectionId: 'g1' })).toBe(true);
  });

  it('blocks when switching to a different delivery than the one in memory', () => {
    expect(
      shouldBlockDeliveryOpen({
        collectionId: 'g2',
        seed,
        collection: { id: 'g1' },
      }),
    ).toBe(true);
  });
});

describe('deliveryManageNavState', () => {
  it('puts the seed on manage navigation without dropping extra state', () => {
    expect(
      deliveryManageNavState(
        { id: 'g1', name: 'Priya Wedding' },
        { from: '/client-gallery' },
      ),
    ).toEqual({
      seed: {
        id: 'g1',
        name: 'Priya Wedding',
        photos: [],
        sets: [],
      },
      from: '/client-gallery',
    });
  });
});
