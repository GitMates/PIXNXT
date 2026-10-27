/** Hybrid video routing. Keep in sync with backend/src/lib/videoDelivery.ts */

export const TIER1_MAX_DURATION_SECONDS = 180;
export const TIER1_MAX_BYTES = 50 * 1024 * 1024;
export const STREAM_AUTO_MAX_SEC = 45 * 60;
export const PREVIEW_LEN_SEC = 90;

export function isLongFilmDownloadPreview(durationSeconds) {
  const n = Number(durationSeconds);
  return Number.isFinite(n) && n > STREAM_AUTO_MAX_SEC;
}
