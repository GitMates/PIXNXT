import { R2_PUBLIC_URL } from './r2';

/** Ensure grid/lightbox URLs are absolute (legacy rows may store storage paths only). */
export function resolveMediaUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (!R2_PUBLIC_URL) return trimmed;
  const base = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL : `${R2_PUBLIC_URL}/`;
  return `${base}${trimmed.replace(/^\//, '')}`;
}

/**
 * Pick the best URL for dashboard / gallery grid thumbnails (smallest available).
 * GIFs use web/full URL so animation is preserved.
 * @param {boolean} [preferOriginalAspect] — dashboard square grid: prefer web/full so aspect isn't lost to square thumbs
 */
export function getPhotoGridDisplayUrl(photo, preferOriginalAspect = false) {
  if (!photo) return '';
  let url = '';
  if (isGifMedia(photo)) {
    url = photo.web_url || photo.full_url || photo.thumbnail_url || '';
  } else if (preferOriginalAspect) {
    url = photo.full_url || photo.web_url || photo.thumbnail_url || '';
  } else {
    url = photo.thumbnail_url || photo.web_url || photo.full_url || '';
  }
  return resolveMediaUrl(url);
}

/**
 * Full-quality URL for lightbox / download.
 */
export function getPhotoFullDisplayUrl(photo) {
  if (!photo) return '';
  return resolveMediaUrl(photo.full_url || photo.web_url || photo.thumbnail_url || '');
}

/**
 * Video source for grid playback (prefer web-optimized).
 */
export function getPhotoVideoSrc(photo) {
  if (!photo) return '';
  return resolveMediaUrl(photo.web_url || photo.full_url || '');
}

export function getPhotoVideoPoster(photo) {
  if (!photo?.thumbnail_url) return undefined;
  return resolveMediaUrl(photo.thumbnail_url);
}

/**
 * Ordered fallbacks when a CDN URL fails.
 * @param {boolean} [preferOriginalAspect] — prefer full/web before thumbnail
 */
export function getPhotoDisplayFallbacks(photo, preferOriginalAspect = false) {
  if (!photo) return [];
  const seen = new Set();
  const urls = isGifMedia(photo)
    ? [photo.web_url, photo.full_url, photo.thumbnail_url]
    : preferOriginalAspect
      ? [photo.full_url, photo.web_url, photo.thumbnail_url]
      : [photo.thumbnail_url, photo.web_url, photo.full_url];
  return urls
    .map((url) => resolveMediaUrl(url))
    .filter((url) => {
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
}

export function isVideoMedia(photo) {
  if (!photo) return false;
  if (photo.media_type === 'video') return true;
  return /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(
    photo.filename || photo.full_url || photo.web_url || ''
  );
}

export function isGifMedia(photo) {
  if (!photo) return false;
  if (photo.media_type === 'gif') return true;
  return /\.gif(\?|#|$)/i.test(
    photo.filename || photo.full_url || photo.web_url || photo.thumbnail_url || ''
  );
}
