import { describe, expect, it } from 'vitest';
import { describeGalleryMediaForDelete } from './galleryMediaType';

describe('describeGalleryMediaForDelete', () => {
  it('labels a single video as video, not photo', () => {
    const result = describeGalleryMediaForDelete([
      { id: '1', media_type: 'video', filename: 'clip.mp4' },
    ]);
    expect(result.title).toBe('DELETE VIDEOS');
    expect(result.summary).toBe('1 video');
  });

  it('labels photos as photos', () => {
    const result = describeGalleryMediaForDelete([
      { id: '1', media_type: 'image', filename: 'a.jpg' },
      { id: '2', filename: 'b.jpg' },
    ]);
    expect(result.title).toBe('DELETE PHOTOS');
    expect(result.summary).toBe('2 photos');
  });

  it('labels mixed selections with both counts', () => {
    const result = describeGalleryMediaForDelete([
      { id: '1', media_type: 'video', filename: 'clip.mp4' },
      { id: '2', media_type: 'image', filename: 'a.jpg' },
      { id: '3', filename: 'b.jpg' },
    ]);
    expect(result.title).toBe('DELETE MEDIA');
    expect(result.summary).toBe('1 video and 2 photos');
  });
});
