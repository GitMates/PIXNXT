import { describe, expect, it } from 'vitest';
import {
  buildDuplicateCollectionPayload,
  pickUniqueCopyName,
  pickUniqueDeliverySlug,
  slugifyDeliveryName,
} from './deliveryDuplicate';

describe('deliveryDuplicate', () => {
  it('does not reuse the source gallery slug', () => {
    const payload = buildDuplicateCollectionPayload(
      {
        id: 'src-1',
        name: 'MCA Pongal 2k26 Kondaatam',
        slug: 'mca-pongal-2k26-kondaatam',
        status: 'published',
        cover_url: 'https://example.com/c.jpg',
        photos: [{ id: 'p1' }],
        sets: [{ id: 's1' }],
      },
      { usedSlugs: ['mca-pongal-2k26-kondaatam'] },
    );

    expect(payload.slug).not.toBe('mca-pongal-2k26-kondaatam');
    expect(payload.slug).toBe('mca-pongal-2k26-kondaatam-copy');
    expect(payload.name).toBe('MCA Pongal 2k26 Kondaatam (Copy)');
    expect(payload.status).toBe('draft');
    expect(payload).not.toHaveProperty('id');
    expect(payload).not.toHaveProperty('photos');
    expect(payload).not.toHaveProperty('sets');
  });

  it('allocates a numbered slug when the copy slug is already taken', () => {
    expect(
      pickUniqueDeliverySlug('MCA Pongal (Copy)', [
        'mca-pongal-copy',
        'mca-pongal-copy-2',
      ]),
    ).toBe('mca-pongal-copy-3');
  });

  it('allocates Copy 2 when Copy name is taken', () => {
    expect(pickUniqueCopyName('Wedding', ['Wedding (Copy)'])).toBe('Wedding (Copy 2)');
  });

  it('slugifies like the backend', () => {
    expect(slugifyDeliveryName('MCA Pongal 2k26 Kondaatam (Copy)')).toBe(
      'mca-pongal-2k26-kondaatam-copy',
    );
  });
});
