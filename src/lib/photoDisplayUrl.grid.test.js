import { describe, expect, it } from 'vitest';
import {
  getCollectionCardCoverCandidates,
  getPhotoDisplayFallbacks,
  getPhotoGridDisplayUrl,
} from './photoDisplayUrl';

describe('grid and card image URL roles', () => {
  it('prefers thumbnail over web even when preferOriginalAspect is true', () => {
    const photo = {
      thumbnail_url: 'https://cdn.example/thumb/a.jpg',
      web_url: 'https://cdn.example/web/a.jpg',
      full_url: 'https://cdn.example/original/a.jpg',
    };
    expect(getPhotoGridDisplayUrl(photo, true)).toBe(photo.thumbnail_url);
    expect(getPhotoGridDisplayUrl(photo, false)).toBe(photo.thumbnail_url);
  });

  it('lists thumb before web in grid fallbacks', () => {
    const photo = {
      thumbnail_url: 'https://cdn.example/thumb/a.jpg',
      web_url: 'https://cdn.example/web/a.jpg',
      full_url: 'https://cdn.example/original/a.jpg',
    };
    const fallbacks = getPhotoDisplayFallbacks(photo, true);
    expect(fallbacks[0]).toBe(photo.thumbnail_url);
    expect(fallbacks).toContain(photo.web_url);
  });

  it('tries thumb before web for collection card covers', () => {
    const collection = {
      id: 'c1',
      cover_url: 'https://cdn.example/users/x/photos/web/cover.jpg',
    };
    const candidates = getCollectionCardCoverCandidates(collection);
    const thumbIdx = candidates.findIndex((u) => u.includes('/thumb/'));
    const webIdx = candidates.findIndex((u) => u.includes('/web/'));
    expect(thumbIdx).toBeGreaterThanOrEqual(0);
    expect(webIdx).toBeGreaterThanOrEqual(0);
    expect(thumbIdx).toBeLessThan(webIdx);
  });
});
