import { R2_PUBLIC_URL } from './r2';
import { isRawImageFilename } from './rawImageFormats';
import { isBrowserDisplayableImageUrl } from './rawImagePreview';

/** Ensure grid/lightbox URLs are absolute (legacy rows may store storage paths only). */
export function resolveMediaUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim().split('#')[0];
  if (!trimmed) return '';
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
  // Prefer the larger web derivative (up to 2048px) over the 400px thumb —
  // grid and especially lightbox look blurry when fed the tiny thumb.
  const candidates = [photo.web_url, photo.thumbnail_url];
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
  if (photo.watermarked_url) {
    return resolveMediaUrl(photo.watermarked_url);
  }
  if (isRawMedia(photo)) {
    return getRawPreviewUrl(photo);
  }
  if (isGifMedia(photo)) {
    return resolveMediaUrl(photo.web_url || photo.full_url || photo.thumbnail_url || '');
  }
  const ordered = preferOriginalAspect
    ? [photo.web_url, photo.full_url, photo.thumbnail_url]
    : [photo.thumbnail_url, photo.web_url, photo.full_url];
  for (const url of ordered) {
    const resolved = resolveMediaUrl(url);
    if (resolved && isBrowserDisplayableImageUrl(resolved)) return resolved;
  }
  return '';
}

/**
 * Full-quality URL for lightbox / download.
 */
/** Lightbox / large view — for RAW use JPEG preview, not the original file. */
export function getPhotoFullDisplayUrl(photo) {
  if (!photo) return '';
  if (photo.watermarked_url) {
    return resolveMediaUrl(photo.watermarked_url);
  }
  if (isVideoMedia(photo)) {
    return getPhotoVideoSrc(photo);
  }
  if (isRawMedia(photo)) {
    return getRawPreviewUrl(photo);
  }
  return resolveMediaUrl(photo.web_url || photo.full_url || photo.thumbnail_url || '');
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
    return resolveMediaUrl(photo.full_url || photo.web_url || '');
  }
  if (isRawMedia(photo)) {
    return resolveMediaUrl(photo.full_url || '');
  }
  return resolveMediaUrl(photo.full_url || photo.web_url || photo.thumbnail_url || '');
}

/** R2 keys derived from the original upload path (RAW preview, video thumb, etc.). */
export function deriveStoragePathVariants(storagePath) {
  if (!storagePath || typeof storagePath !== 'string') return [];
  const trimmed = storagePath.trim().replace(/^\//, '');
  if (!trimmed) return [];
  const variants = [trimmed];
  const base = trimmed.replace(/\.[^.]+$/, '');
  if (base !== trimmed) {
    variants.push(`${base}_preview.jpg`);
    variants.push(`${base}_thumb.jpg`);
    variants.push(trimmed.replace(/\.[^.]+$/, '_thumb.jpg'));
  }
  return [...new Set(variants)];
}

/** Ordered fallbacks when the primary URL fails (R2 paths often have no file extension in the URL). */
export function getPhotoDownloadUrlCandidates(photo) {
  if (!photo) return [];
  const seen = new Set();
  const out = [];
  const push = (raw) => {
    if (!raw) return;
    const url = resolveMediaUrl(raw);
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push(url);
    try {
      const decoded = decodeURIComponent(url);
      if (decoded !== url && !seen.has(decoded)) {
        seen.add(decoded);
        out.push(decoded);
      }
    } catch {
      /* ignore */
    }
  };

  if (isVideoMedia(photo)) {
    push(photo.full_url);
    push(photo.web_url);
    push(photo.thumbnail_url);
    return out;
  }
  if (isRawMedia(photo)) {
    push(photo.full_url);
    const preview = getRawPreviewUrl(photo);
    if (preview) push(preview);
    push(photo.web_url);
    push(photo.thumbnail_url);
    push(photo.web_storage_path);
    push(photo.thumbnail_storage_path);
    for (const variant of deriveStoragePathVariants(photo.original_storage_path)) {
      push(variant);
    }
    return out;
  }
  if (isGifMedia(photo)) {
    push(photo.full_url);
    push(photo.web_url);
    push(photo.thumbnail_url);
    return out;
  }
  /* Original high-resolution file first! */
  push(photo.full_url);
  push(photo.original_storage_path);
  push(photo.web_url);
  push(photo.thumbnail_url);
  push(photo.web_storage_path);
  push(photo.thumbnail_storage_path);
  for (const variant of deriveStoragePathVariants(photo.original_storage_path)) {
    push(variant);
  }
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
  if (photo.watermarked_url) {
    return [resolveMediaUrl(photo.watermarked_url)];
  }
  if (isVideoMedia(photo)) {
    return getPhotoDownloadUrlCandidates(photo);
  }
  if (isRawMedia(photo)) {
    const preview = getRawPreviewUrl(photo);
    return preview ? [preview] : [];
  }
  const urls = isGifMedia(photo)
    ? [photo.web_url, photo.full_url, photo.thumbnail_url]
    : preferOriginalAspect
      ? [photo.web_url, photo.full_url, photo.thumbnail_url]
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

export function getWebResolutionUrl(photo) {
  if (!photo) return '';
  if (photo.watermarked_url) {
    return resolveMediaUrl(photo.watermarked_url);
  }
  if (photo.web_url) {
    return resolveMediaUrl(photo.web_url);
  }
  if (photo.full_url) {
    const resolvedFull = resolveMediaUrl(photo.full_url);
    if (resolvedFull.includes('/original/')) {
      return resolvedFull.replace('/original/', '/web/');
    }
    return resolvedFull;
  }
  if (photo.thumbnail_url) {
    const resolvedThumb = resolveMediaUrl(photo.thumbnail_url);
    if (resolvedThumb.includes('/thumb/')) {
      return resolvedThumb.replace('/thumb/', '/web/');
    }
    return resolvedThumb;
  }
  return '';
}

/**
 * Prefer the /thumb/ derivative for small collection/folder cover cards.
 * Stored cover_url often points at /original/ (8–15 MB) or /web/.
 * Thumbs are always stored as .jpg (same stem as the original filename).
 */
export function toThumbDerivativeUrl(url) {
  if (!url) return '';
  const resolved = resolveMediaUrl(stripHash(url));
  if (!resolved) return '';
  if (resolved.includes('/thumb/')) return resolved;

  if (resolved.includes('/web/')) {
    // Keep filename/casing exactly — web + thumb share the same stem.
    return resolved.replace('/web/', '/thumb/');
  }

  if (resolved.includes('/original/')) {
    let next = resolved.replace('/original/', '/thumb/');
    // Original may be RAW/HEIC; derivatives are always .jpg. Preserve .jpg/.jpeg casing.
    if (!/\.jpe?g(\?|#|$)/i.test(next)) {
      next = next.replace(/(\/[^/?#]+)\.[^.\/?#]+/, '$1.jpg');
    }
    return next;
  }

  return resolved;
}

export function toWebDerivativeUrl(url) {
  if (!url) return '';
  const resolved = resolveMediaUrl(stripHash(url));
  if (!resolved) return '';
  if (resolved.includes('/web/')) return resolved;
  if (resolved.includes('/thumb/')) return resolved.replace('/thumb/', '/web/');
  if (resolved.includes('/original/')) {
    let next = resolved.replace('/original/', '/web/');
    if (!/\.jpe?g(\?|#|$)/i.test(next)) {
      next = next.replace(/(\/[^/?#]+)\.[^.\/?#]+/, '$1.jpg');
    }
    return next;
  }
  return resolved;
}

function stripHash(url) {
  return String(url).split('#')[0];
}

/**
 * Ordered cover candidates for list cards: web → thumb → stored URL.
 * Deliveries board uses R2 /web/ images; /thumb/ is a fallback if web is missing.
 * Callers should advance on <img onError> so a missing derivative does not blank the card.
 */
export function getCollectionCardCoverCandidates(collection) {
  if (!collection) return [];

  const sources = [
    collection.cover_url,
    collection.cover,
    collection.list_cover_url,
  ].filter(Boolean);

  const out = [];
  const push = (u) => {
    if (u && !out.includes(u)) out.push(u);
  };

  for (const raw of sources) {
    const resolved = resolveMediaUrl(stripHash(raw));
    if (!resolved) continue;
    push(toWebDerivativeUrl(resolved));
    push(toThumbDerivativeUrl(resolved));
    if (!resolved.includes('/original/')) push(resolved);
  }

  return out;
}

/** Cover src for Client Gallery / Starred list cards (~227×124). */
export function getCollectionCardCoverSrc(collection) {
  return getCollectionCardCoverCandidates(collection)[0] || '';
}
