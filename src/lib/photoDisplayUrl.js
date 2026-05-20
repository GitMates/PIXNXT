import { R2_PUBLIC_URL } from './r2';
import { isRawImageFilename } from './rawImageFormats';
import { isBrowserDisplayableImageUrl } from './rawImagePreview';

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
function urlLooksLikeRawFile(url) {
  if (!url) return false;
  return isRawImageFilename(url) || /\.(dng|raw|cr2|cr3|nef|arw|raf|orf|rw2|pef|srw|heic|heif|proraw)(\?|#|$)/i.test(url);
}

export function isRawMedia(photo) {
  if (!photo) return false;
  if (photo.media_type === 'raw') return true;
  if (isRawImageFilename(photo.filename || '')) return true;
  return urlLooksLikeRawFile(photo.full_url || photo.web_url || photo.original_storage_path || '');
}

/** JPEG/PNG preview stored separately from the original RAW file. */
export function getRawPreviewUrl(photo) {
  if (!photo) return '';
  const original = resolveMediaUrl(photo.full_url || '');
  const candidates = [photo.thumbnail_url, photo.web_url];
  const preview = candidates.find((url) => {
    if (!url) return false;
    const resolved = resolveMediaUrl(url);
    if (!resolved || !isBrowserDisplayableImageUrl(resolved)) return false;
    if (original && resolved === original) return false;
    return true;
  });
  return preview ? resolveMediaUrl(preview) : '';
}

export function hasRawDisplayPreview(photo) {
  return Boolean(getRawPreviewUrl(photo));
}

function pickDisplayableUrl(...urls) {
  for (const url of urls) {
    const resolved = resolveMediaUrl(url);
    if (resolved && isBrowserDisplayableImageUrl(resolved)) return resolved;
  }
  return '';
}

export function getPhotoGridDisplayUrl(photo, preferOriginalAspect = false) {
  if (!photo) return '';
  if (isRawMedia(photo)) {
    return getRawPreviewUrl(photo);
  }
  if (isGifMedia(photo)) {
    return pickDisplayableUrl(photo.web_url, photo.full_url, photo.thumbnail_url);
  }
  if (preferOriginalAspect) {
    return pickDisplayableUrl(photo.full_url, photo.web_url, photo.thumbnail_url);
  }
  return pickDisplayableUrl(photo.thumbnail_url, photo.web_url, photo.full_url);
}

/**
 * Full-quality URL for lightbox / download.
 */
/** Lightbox / large view — for RAW use JPEG preview, not the original file. */
export function getPhotoFullDisplayUrl(photo) {
  if (!photo) return '';
  if (isRawMedia(photo)) {
    return getRawPreviewUrl(photo);
  }
  return pickDisplayableUrl(photo.full_url, photo.web_url, photo.thumbnail_url);
}

/** Original file URL (RAW on R2) — used for download. */
export function getPhotoOriginalFileUrl(photo) {
  if (!photo) return '';
  return resolveMediaUrl(photo.full_url || '');
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
  if (isRawMedia(photo)) {
    const preview = getRawPreviewUrl(photo);
    return preview ? [preview] : [];
  }
  const urls = isGifMedia(photo)
    ? [photo.web_url, photo.full_url, photo.thumbnail_url]
    : preferOriginalAspect
      ? [photo.full_url, photo.web_url, photo.thumbnail_url]
      : [photo.thumbnail_url, photo.web_url, photo.full_url];
  return urls
    .map((url) => resolveMediaUrl(url))
    .filter((url) => {
      if (!url || seen.has(url)) return false;
      if (!isBrowserDisplayableImageUrl(url)) return false;
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
