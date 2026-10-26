import { describe, expect, it } from 'vitest';
import {
  COVER_MIN_WIDTH_PX,
  COVER_ONLY_DRAFT_FLAG,
  buildCoverOnlyDraft,
  buildDeliveryCoverStoragePath,
  buildDeliveryCoverThumbStoragePath,
  coverEmptyPrimaryAction,
  isAcceptedCoverDropFile,
  isCoverOnlyDraft,
  isLowResolutionCover,
  pickAutoCoverPhoto,
  resolveCoverPhotoId,
  shouldApplyAutoCover,
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

  it('stores card thumbs under cover/thumb/', () => {
    const path = buildDeliveryCoverThumbStoragePath(
      'studio-acme',
      'mca-pongal__ca44e65a',
      'cover_123.png'
    );
    expect(path).toBe(
      'users/studio-acme/deliveries/mca-pongal__ca44e65a/cover/thumb/cover_123.jpg'
    );
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

describe('empty cover actions', () => {
  it('makes Upload primary when the delivery has no photos', () => {
    expect(coverEmptyPrimaryAction(0)).toBe('upload');
  });

  it('makes From delivery primary once photos exist', () => {
    expect(coverEmptyPrimaryAction(1)).toBe('from-delivery');
    expect(coverEmptyPrimaryAction(24)).toBe('from-delivery');
  });
});

describe('cover drop types', () => {
  it('accepts jpeg, png and webp and ignores other files', () => {
    expect(isAcceptedCoverDropFile({ type: 'image/jpeg', name: 'a.jpg' })).toBe(true);
    expect(isAcceptedCoverDropFile({ type: 'image/png', name: 'a.png' })).toBe(true);
    expect(isAcceptedCoverDropFile({ type: 'image/webp', name: 'a.webp' })).toBe(true);
    expect(isAcceptedCoverDropFile({ type: 'image/heic', name: 'a.heic' })).toBe(false);
    expect(isAcceptedCoverDropFile({ type: 'video/mp4', name: 'a.mp4' })).toBe(false);
  });
});

describe('low-resolution cover warning', () => {
  it('warns below 1600px wide and not when unknown or large enough', () => {
    expect(COVER_MIN_WIDTH_PX).toBe(1600);
    expect(isLowResolutionCover(1200)).toBe(true);
    expect(isLowResolutionCover(1600)).toBe(false);
    expect(isLowResolutionCover(null)).toBe(false);
  });
});

describe('auto-cover after a finished batch', () => {
  it('does not apply when a cover is already set or the photographer chose one', () => {
    expect(shouldApplyAutoCover({ coverUrl: 'https://cdn.example/c.jpg' })).toBe(false);
    expect(shouldApplyAutoCover({ coverPhotoId: 'p1' })).toBe(false);
    expect(shouldApplyAutoCover({ coverSource: 'manual' })).toBe(false);
    expect(shouldApplyAutoCover({ coverUrl: null, coverPhotoId: null, coverSource: null })).toBe(true);
    expect(shouldApplyAutoCover({ coverSource: 'auto' })).toBe(true);
  });

  it('picks the first landscape still and skips video', () => {
    const photos = [
      { id: 'v1', media_type: 'video', width: 1920, height: 1080 },
      { id: 'p-portrait', width: 1200, height: 1800, filename: 'a.jpg' },
      { id: 'p-land', width: 2400, height: 1600, filename: 'b.jpg' },
      { id: 'p-later', width: 3000, height: 2000, filename: 'c.jpg' },
    ];
    expect(pickAutoCoverPhoto(photos)?.id).toBe('p-land');
  });

  it('falls back to the first still when nothing is landscape', () => {
    const photos = [
      { id: 'v1', media_type: 'video', width: 1920, height: 1080 },
      { id: 'p1', width: 1200, height: 1800, filename: 'a.jpg' },
    ];
    expect(pickAutoCoverPhoto(photos)?.id).toBe('p1');
  });
});
