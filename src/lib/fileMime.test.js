import { describe, expect, it } from 'vitest';
import {
  isPhotoshopFile,
  isUploadableMediaFile,
  splitClientGalleryUploadFiles,
} from './fileMime';

function fakeFile(name, type = '') {
  return { name, type };
}

describe('isPhotoshopFile', () => {
  it('detects .psd and .psb by filename', () => {
    expect(isPhotoshopFile(fakeFile('layout.psd'))).toBe(true);
    expect(isPhotoshopFile(fakeFile('comp.PSB'))).toBe(true);
  });

  it('detects Adobe Photoshop MIME even without an extension', () => {
    expect(isPhotoshopFile(fakeFile('untitled', 'image/vnd.adobe.photoshop'))).toBe(true);
  });

  it('does not flag JPEGs', () => {
    expect(isPhotoshopFile(fakeFile('photo.jpg', 'image/jpeg'))).toBe(false);
  });
});

describe('isUploadableMediaFile', () => {
  it('accepts photos, video, gif, and camera RAW', () => {
    expect(isUploadableMediaFile(fakeFile('photo.jpg', 'image/jpeg'))).toBe(true);
    expect(isUploadableMediaFile(fakeFile('clip.mp4', 'video/mp4'))).toBe(true);
    expect(isUploadableMediaFile(fakeFile('loop.gif', 'image/gif'))).toBe(true);
    expect(isUploadableMediaFile(fakeFile('scene.cr3'))).toBe(true);
  });

  it('rejects Photoshop files so they cannot be uploaded to the client gallery', () => {
    expect(isUploadableMediaFile(fakeFile('layout.psd', 'image/vnd.adobe.photoshop'))).toBe(false);
    expect(isUploadableMediaFile(fakeFile('layout.psb'))).toBe(false);
  });
});

describe('splitClientGalleryUploadFiles', () => {
  it('skips Photoshop files and reports how many were dropped', () => {
    const result = splitClientGalleryUploadFiles([
      fakeFile('keep.jpg', 'image/jpeg'),
      fakeFile('layout.psd', 'image/vnd.adobe.photoshop'),
      fakeFile('comp.psb'),
    ]);
    expect(result.accepted.map((f) => f.name)).toEqual(['keep.jpg']);
    expect(result.photoshopSkipped).toBe(2);
    expect(result.rawSkipped).toBe(0);
  });

  it('still skips RAW when that support is off', () => {
    const result = splitClientGalleryUploadFiles(
      [fakeFile('photo.jpg', 'image/jpeg'), fakeFile('scene.cr3')],
      { rawSupportEnabled: false }
    );
    expect(result.accepted.map((f) => f.name)).toEqual(['photo.jpg']);
    expect(result.rawSkipped).toBe(1);
  });
});
