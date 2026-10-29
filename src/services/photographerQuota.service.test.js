import { describe, expect, test } from 'vitest';
import {
  getAlbumLimit,
  getCreationDeliveryLimit,
  getNormalImageLimit,
  getGuestImageLimit,
} from './photographerQuota.service';

describe('quota tri-state', () => {
  test('disabled (-1) stays disabled instead of becoming unlimited', () => {
    expect(getAlbumLimit({ album_limit: -1 })).toBe(-1);
    expect(getCreationDeliveryLimit({ delivery_limit: -1 })).toBe(-1);
    expect(getNormalImageLimit({ face_normal_image_limit: -1 })).toBe(-1);
    expect(getGuestImageLimit({ face_guest_image_limit: -1 })).toBe(-1);
  });

  test('missing or 0 still means unlimited', () => {
    expect(getAlbumLimit({})).toBe(0);
    expect(getAlbumLimit({ album_limit: 0 })).toBe(0);
    expect(getCreationDeliveryLimit({})).toBe(0);
  });

  test('positive caps are kept', () => {
    expect(getAlbumLimit({ album_limit: 12 })).toBe(12);
    expect(getCreationDeliveryLimit({ delivery_limit: 3 })).toBe(3);
  });
});
