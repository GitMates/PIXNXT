import { describe, expect, it } from 'vitest';
import {
  getCollectionCardCoverCandidates,
  getPhotoDisplayFallbacks,
  getPhotoGridDisplayFallbacks,
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

  it('uses web when thumb is missing and never returns original for grid tiles', () => {
    const photo = {
      web_url: 'https://cdn.example/web/a.jpg',
      full_url: 'https://cdn.example/original/a.jpg',
    };
    expect(getPhotoGridDisplayUrl(photo)).toBe(photo.web_url);
  });

  it('returns empty grid src when only original exists so the tile does not download the raw file', () => {
    const photo = {
      full_url: 'https://cdn.example/original/a.jpg',
    };
    expect(getPhotoGridDisplayUrl(photo)).toBe('');
  });

  it('lists thumb then web in grid fallbacks and omits original', () => {
    const photo = {
      thumbnail_url: 'https://cdn.example/thumb/a.jpg',
      web_url: 'https://cdn.example/web/a.jpg',
      full_url: 'https://cdn.example/original/a.jpg',
    };
    const fallbacks = getPhotoGridDisplayFallbacks(photo);
    expect(fallbacks[0]).toBe(photo.thumbnail_url);
    expect(fallbacks).toEqual([photo.thumbnail_url, photo.web_url]);
    expect(fallbacks.some((url) => /\/original\//.test(url))).toBe(false);
  });

  it('keeps original in lightbox fallbacks', () => {
    const photo = {
      thumbnail_url: 'https://cdn.example/thumb/a.jpg',
      web_url: 'https://cdn.example/web/a.jpg',
      full_url: 'https://cdn.example/original/a.jpg',
    };
    const fallbacks = getPhotoDisplayFallbacks(photo, true);
    expect(fallbacks).toContain(photo.full_url);
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

  it('maps dedicated /cover/ files to /cover/thumb/ for list cards', () => {
    const collection = {
      id: 'c2',
      cover_url: 'https://cdn.example/users/x/deliveries/demo/cover/cover_123.jpg',
    };
    const candidates = getCollectionCardCoverCandidates(collection);
    expect(candidates[0]).toContain('/cover/thumb/');
    expect(candidates.some((u) => u.includes('/cover/cover_123.jpg'))).toBe(true);
  });
});
