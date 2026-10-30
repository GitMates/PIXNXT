import { describe, expect, it } from 'vitest';
import { buildFaceAvatarCrop } from './faceAvatar';

describe('buildFaceAvatarCrop', () => {
  it('sizes the img larger than the circle so the face fills it', () => {
    const { wrap, img } = buildFaceAvatarCrop(
      'https://cdn.example/web/a.jpg',
      { Left: 0.4, Top: 0.3, Width: 0.2, Height: 0.2 },
      64
    );
    expect(wrap).toEqual({ width: 64, height: 64 });
    expect(img).toBeTruthy();
    const widthPct = parseFloat(img.width);
    expect(widthPct).toBeGreaterThan(100);
    expect(widthPct).toBeLessThanOrEqual(480);
  });

  it('returns no img layout without a bounding box', () => {
    const { img } = buildFaceAvatarCrop('https://cdn.example/web/a.jpg', null, 64);
    expect(img).toBeNull();
  });
});
