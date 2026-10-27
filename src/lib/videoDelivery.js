/** Hybrid video routing. Keep in sync with backend/src/lib/videoDelivery.ts */

export const TIER1_MAX_DURATION_SECONDS = 180;
export const TIER1_MAX_BYTES = 50 * 1024 * 1024;
export const STREAM_AUTO_MAX_SEC = 45 * 60;
export const PREVIEW_LEN_SEC = 90;
export const PREVIEW_DEFAULT_PCT = 0.10;
export const PREVIEW_SNAP_SEC = 30;
export const POOL_DEFAULT_MIN = 120;
export const TOPUP_PACK_MIN = 120;

function durationSeconds(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function isLongFilmDownloadPreview(durationSecondsValue) {
  return durationSeconds(durationSecondsValue) > STREAM_AUTO_MAX_SEC;
}

export function streamMinutesNeeded(durationSecondsValue) {
  const duration = durationSeconds(durationSecondsValue);
  if (duration <= 0) return STREAM_AUTO_MAX_SEC / 60;
  return Math.max(1, Math.ceil(duration / 60));
}

export function snapPreviewStartSec(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n / PREVIEW_SNAP_SEC) * PREVIEW_SNAP_SEC;
}

export function defaultPreviewStartSec(durationSecondsValue) {
  const duration = durationSeconds(durationSecondsValue);
  if (duration <= PREVIEW_LEN_SEC) return 0;
  const raw = duration * PREVIEW_DEFAULT_PCT;
  const maxStart = Math.max(0, duration - PREVIEW_LEN_SEC);
  return Math.min(snapPreviewStartSec(raw), snapPreviewStartSec(maxStart));
}

export function previewWindow(photo) {
  const duration = durationSeconds(photo?.video_duration_seconds);
  const stored = photo?.preview_start_sec;
  const startSec = Number.isFinite(Number(stored)) ? snapPreviewStartSec(stored) : defaultPreviewStartSec(duration);
  const endSec = startSec + PREVIEW_LEN_SEC;
  return { startSec, endSec, duration };
}

export function formatFilmClock(totalSeconds) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function clientSeesPreview(photo) {
  if (photo?.delivery_mode === 'download') return true;
  if (Number(photo?.stream_is_preview) === 1 || photo?.stream_is_preview === true) return true;
  return isLongFilmDownloadPreview(photo?.video_duration_seconds);
}

/** Studio tile chip. Short R2 clips and ready streams stay clean (no chip). */
export function studioVideoChip(photo) {
  if (!photo || photo.media_type === 'photo') return null;
  const status = String(photo.stream_status || '');
  if (photo.delivery_mode === 'download') return 'download';
  if (status === 'pending' || status === 'processing' || status === 'queued') return 'preparing';
  if (photo.delivery_mode === 'stream' && (status === 'ready' || Number(photo.stream_minutes) === 0)) return null;
  if (isLongFilmDownloadPreview(photo.video_duration_seconds)) return 'download';
  if (status === 'error') return 'download';
  return null;
}

export function studioChipLabel(kind) {
  if (kind === 'preparing') return 'Preparing';
  if (kind === 'download') return 'Download + preview';
  return '';
}
