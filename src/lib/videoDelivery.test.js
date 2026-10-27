import { describe, expect, it } from 'vitest';
import {
  POOL_DEFAULT_MIN,
  PREVIEW_LEN_SEC,
  STREAM_AUTO_MAX_SEC,
  defaultPreviewStartSec,
  formatFilmClock,
  previewWindow,
  streamMinutesNeeded,
  studioVideoChip,
} from './videoDelivery';

describe('video delivery helpers', () => {
  it('hides the studio chip on short R2 clips and ready streams', () => {
    expect(studioVideoChip({
      media_type: 'video',
      filename: 'reel.mp4',
      video_duration_seconds: 40,
      size_bytes: 8 * 1024 * 1024,
      delivery_mode: 'stream',
      stream_status: 'ready',
    })).toBe(null);

    expect(studioVideoChip({
      media_type: 'video',
      filename: 'highlight.mp4',
      video_duration_seconds: 12 * 60,
      delivery_mode: 'stream',
      stream_status: 'ready',
      stream_uid: 'abc',
    })).toBe(null);
  });

  it('shows Download + preview on long or pool-fallback films', () => {
    expect(studioVideoChip({
      media_type: 'video',
      filename: 'muhurtham.mp4',
      video_duration_seconds: STREAM_AUTO_MAX_SEC + 30,
      delivery_mode: 'download',
      fallback_reason: 'long',
    })).toBe('download');
  });

  it('shows Preparing while Stream is encoding a reserved film', () => {
    expect(studioVideoChip({
      media_type: 'video',
      filename: 'highlight.mp4',
      video_duration_seconds: 12 * 60,
      delivery_mode: 'stream',
      stream_status: 'pending',
      stream_minutes: 12,
    })).toBe('preparing');
  });

  it('builds a snapped 90s preview window from stored start', () => {
    const window = previewWindow({
      video_duration_seconds: 2 * 3600,
      preview_start_sec: 720,
    });
    expect(window.startSec).toBe(720);
    expect(window.endSec).toBe(720 + PREVIEW_LEN_SEC);
    expect(streamMinutesNeeded(12 * 60)).toBe(12);
    expect(defaultPreviewStartSec(2 * 3600)).toBe(720);
    expect(formatFilmClock(7200)).toBe('2:00:00');
    expect(POOL_DEFAULT_MIN).toBe(120);
  });
});
