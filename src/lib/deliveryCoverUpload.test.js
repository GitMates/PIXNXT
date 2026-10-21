import { describe, expect, it } from 'vitest';
import {
  COVER_ONLY_DRAFT_FLAG,
  buildCoverOnlyDraft,
  buildDeliveryCoverStoragePath,
  isCoverOnlyDraft,
  resolveCoverPhotoId,
} from './deliveryCoverUpload';

describe('buildDeliveryCoverStoragePath', () => {
  it('stores covers under cover/, not photoset/', () => {
    const path = buildDeliveryCoverStoragePath(
      'studio-acme',
      'mca-pongal__ca44e65a',
      'cover_123.jpg'
    );
    expect(path).toBe(
      'users/studio-acme/deliveries/mca-pongal__ca44e65a/cover/cover_123.jpg'
    );
    expect(path).not.toMatch(/photoset/);
  });
});

describe('cover-only draft identity', () => {
  it('treats filesystem cover drafts as outside the delivery', () => {
    const draft = buildCoverOnlyDraft({
      url: 'https://cdn.example/cover.jpg',
      filename: 'wedding.jpg',
      width: 2000,
      height: 1333,
    });
    expect(draft[COVER_ONLY_DRAFT_FLAG]).toBe(true);
    expect(draft.id).toBeNull();
    expect(draft.full_url).toBe('https://cdn.example/cover.jpg');
    expect(isCoverOnlyDraft(draft)).toBe(true);
    expect(resolveCoverPhotoId(draft, 'old-photo-id')).toBeNull();
  });

  it('keeps real delivery photo ids when choosing from the gallery', () => {
    const photo = { id: 'photo-42', full_url: 'https://cdn.example/p.jpg' };
    expect(isCoverOnlyDraft(photo)).toBe(false);
    expect(resolveCoverPhotoId(photo, null)).toBe('photo-42');
  });

  it('falls back only when no photo is selected', () => {
    expect(resolveCoverPhotoId(null, 'prev-id')).toBe('prev-id');
    expect(resolveCoverPhotoId(undefined, null)).toBeNull();
  });
});
