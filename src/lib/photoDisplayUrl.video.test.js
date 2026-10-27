import { describe, expect, it } from 'vitest';
import { STREAM_AUTO_MAX_SEC } from './videoDelivery';
import {
  getPhotoStreamPhase,
  getPhotoVideoSrc,
  isVideoPreviewClip,
} from './photoDisplayUrl';

describe('gallery video source', () => {
  it('plays the R2 original while Stream is still preparing', () => {
    const photo = {
      media_type: 'video',
      filename: 'highlight.mp4',
      stream_status: 'processing',
      full_url: 'https://cdn.example/films/highlight.mp4',
    };
    expect(getPhotoStreamPhase(photo)).toBe('preparing');
    expect(getPhotoVideoSrc(photo)).toBe(photo.full_url);
  });

  it('prefers HLS once Stream is ready', () => {
    const photo = {
      media_type: 'video',
      filename: 'highlight.mp4',
      stream_status: 'ready',
      stream_playback_hls: 'https://videodelivery.net/abc/manifest/video.m3u8',
      full_url: 'https://cdn.example/films/highlight.mp4',
    };
    expect(getPhotoVideoSrc(photo)).toBe(photo.stream_playback_hls);
  });

  it('treats a known traditional film as a preview even without a Stream clip', () => {
    const photo = {
      media_type: 'video',
      filename: 'muhurtham.mp4',
      video_duration_seconds: STREAM_AUTO_MAX_SEC + 30,
      full_url: 'https://cdn.example/films/muhurtham.mp4',
    };
    expect(isVideoPreviewClip(photo)).toBe(true);
    expect(getPhotoVideoSrc(photo)).toBe(photo.full_url);
  });

  it('does not mark a short R2 clip as a preview', () => {
    const photo = {
      media_type: 'video',
      filename: 'reel.mp4',
      video_duration_seconds: 45,
      full_url: 'https://cdn.example/films/reel.mp4',
    };
    expect(isVideoPreviewClip(photo)).toBe(false);
  });
});
