import { describe, expect, it } from 'vitest';
import {
  getCollectionCardCoverCandidates,
  getFaceAvatarDisplayUrl,
  getPhotoDisplayFallbacks,
  getPhotoFullDisplayUrl,
  getPhotoGridDisplayFallbacks,
  getPhotoGridDisplayUrl,
  isUnpreviewablePhotoshop,
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

  it('does not request fake jpg derivatives for a PSD that never encoded', () => {
    const photo = {
      filename: 'SHA00515.psd',
      thumbnail_url: 'https://cdn.example/thumb/54m.jpg',
      web_url: 'https://cdn.example/web/54m.jpg',
      full_url: 'https://cdn.example/original/54m.psd',
      width: null,
      height: null,
    };
    expect(isUnpreviewablePhotoshop(photo)).toBe(true);
    expect(getPhotoGridDisplayUrl(photo)).toBe('');
    expect(getPhotoGridDisplayFallbacks(photo)).toEqual([]);
    expect(getPhotoFullDisplayUrl(photo)).toBe('');
    expect(getPhotoDisplayFallbacks(photo)).toEqual([]);
  });

  it('uses encoded jpeg thumbs when a PSD actually has raster dimensions', () => {
    const photo = {
      filename: 'layout.psd',
      thumbnail_url: 'https://cdn.example/thumb/layout.jpg',
      web_url: 'https://cdn.example/web/layout.jpg',
      full_url: 'https://cdn.example/original/layout.psd',
      width: 2000,
      height: 1500,
    };
    expect(isUnpreviewablePhotoshop(photo)).toBe(false);
    expect(getPhotoGridDisplayUrl(photo)).toBe(photo.thumbnail_url);
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

  it('prefers sharpened web over thumb for face-crop avatars', () => {
    const photo = {
      thumbnail_url: 'https://cdn.example/thumb/a.jpg',
      web_url: 'https://cdn.example/web/a.jpg',
      full_url: 'https://cdn.example/original/a.jpg',
    };
    expect(getFaceAvatarDisplayUrl(photo)).toBe(photo.web_url);
  });

  it('rewrites a thumb path string to the web derivative for avatars', () => {
    expect(getFaceAvatarDisplayUrl('https://cdn.example/thumb/a.jpg')).toBe(
      'https://cdn.example/web/a.jpg'
    );
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
