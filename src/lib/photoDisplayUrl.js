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

/** Original file URL (RAW on R2) — used when full-resolution original is required. */
export function getPhotoOriginalFileUrl(photo) {
  if (!photo) return '';
  return resolveMediaUrl(photo.full_url || '');
}

/**
 * Best URL for client download — JPEG preview for RAW when available (avoids 20MB+ hangs).
 */
export function getPhotoDownloadUrl(photo) {
  if (!photo) return '';
  if (isVideoMedia(photo)) {
    return resolveMediaUrl(photo.web_url || photo.full_url || '');
  }
  if (isRawMedia(photo)) {
    const preview = getRawPreviewUrl(photo);
    if (preview) return preview;
    return resolveMediaUrl(photo.full_url || '');
  }
  return resolveMediaUrl(photo.full_url || photo.web_url || photo.thumbnail_url || '');
}

/** Ordered fallbacks when the primary URL fails (R2 paths often have no file extension in the URL). */
export function getPhotoDownloadUrlCandidates(photo) {
  if (!photo) return [];
  const seen = new Set();
  const out = [];
  const push = (raw) => {
    const url = resolveMediaUrl(raw);
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push(url);
  };

  if (isVideoMedia(photo)) {
    push(photo.web_url);
    push(photo.full_url);
    return out;
  }
  if (isRawMedia(photo)) {
    const preview = getRawPreviewUrl(photo);
    if (preview) push(preview);
    push(photo.full_url);
    push(photo.web_url);
    return out;
  }
  if (isGifMedia(photo)) {
    push(photo.web_url);
    push(photo.full_url);
    return out;
  }
  push(photo.full_url);
  push(photo.web_url);
  push(photo.thumbnail_url);
  return out;
}

/** Safe filename for zip / save (unique suffix when needed). */
export function getPhotoDownloadFilename(photo, index = 0, usedNames = null) {
  let base = (photo?.filename || `photo-${index + 1}`).replace(/[/\\:*?"<>|]/g, '_');
  if (isVideoMedia(photo)) {
    if (!/\.(mp4|webm|mov|ogg)$/i.test(base)) {
      base = base.replace(/\.[^.]+$/i, '') + '.mp4';
    }
  } else if (isGifMedia(photo)) {
    if (!/\.gif$/i.test(base)) {
      base = base.replace(/\.[^.]+$/i, '') + '.gif';
    }
  } else if (isRawMedia(photo) && getRawPreviewUrl(photo) && !/\.(jpe?g|png|webp)$/i.test(base)) {
    base = base.replace(/\.[^.]+$/i, '') + '.jpg';
  } else if (!/\.(jpe?g|png|gif|webp|heic|heif)$/i.test(base)) {
    base = base.replace(/\.[^.]+$/i, '') + '.jpg';
  }
  if (!usedNames) return base;
  let name = base;
  let n = 1;
  while (usedNames.has(name.toLowerCase())) {
    const dot = base.lastIndexOf('.');
    if (dot > 0) {
      name = `${base.slice(0, dot)}_${n}${base.slice(dot)}`;
    } else {
      name = `${base}_${n}`;
    }
    n += 1;
  }
  usedNames.add(name.toLowerCase());
  return name;
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
