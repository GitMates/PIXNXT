/**
 * Store / digital-download photo quality helpers.
 * Does not change gallery display helpers in photoDisplayUrl.js.
 *
 * Viewing (frames, digital picker, cart → payment): web_url
 * Delivery (mail download links, free gallery download, lab print): original / full_url
 */
import {
  resolveMediaUrl,
  getPhotoOriginalFileUrl,
  getRawPreviewUrl,
  isRawMedia,
  isVideoMedia,
  isGifMedia,
  deriveStoragePathVariants,
} from './photoDisplayUrl';

/** Fast mid-res URL for on-screen store / purchase UI. */
export function getStoreViewPhotoUrl(photo) {
  if (!photo) return '';
  if (typeof photo === 'string') return resolveMediaUrl(photo);
  if (isVideoMedia(photo)) {
    return resolveMediaUrl(photo.web_url || photo.full_url || photo.url || '');
  }
  if (isRawMedia(photo)) {
    return (
      getRawPreviewUrl(photo) ||
      resolveMediaUrl(photo.web_url || photo.thumbnail_url || photo.display_url || '')
    );
  }
  return resolveMediaUrl(
    photo.web_url ||
      photo.display_url ||
      photo.thumbnail_url ||
      photo.url ||
      photo.full_url ||
      ''
  );
}

/** Original / high-res URL for mail delivery, free downloads, and lab production. */
export function getStoreOriginalPhotoUrl(photo) {
  if (!photo) return '';
  if (typeof photo === 'string') return resolveMediaUrl(photo);
  if (isVideoMedia(photo)) {
    return resolveMediaUrl(photo.full_url || photo.web_url || photo.url || '');
  }
  if (isRawMedia(photo)) {
    // Prefer a displayable JPEG derivative if the original is RAW-only
    const preview = getRawPreviewUrl(photo);
    const original = getPhotoOriginalFileUrl(photo);
    return preview || original || resolveMediaUrl(photo.web_url || photo.url || '');
  }
  return (
    getPhotoOriginalFileUrl(photo) ||
    resolveMediaUrl(photo.full_url || photo.url || photo.web_url || '')
  );
}

/**
 * Shape a photo for cart / customizer / payment previews:
 * - url / display_url point at web (fast viewing)
 * - full_url keeps original for mail + lab
 */
export function toStoreCartPhoto(photo) {
  if (!photo) return null;
  if (typeof photo === 'string') {
    const url = resolveMediaUrl(photo);
    return { url, web_url: url, display_url: url, full_url: url, thumbnail_url: url };
  }
  const viewUrl = getStoreViewPhotoUrl(photo);
  const originalUrl = getStoreOriginalPhotoUrl(photo) || viewUrl;
  return {
    ...photo,
    url: viewUrl,
    display_url: viewUrl,
    web_url: photo.web_url ? resolveMediaUrl(photo.web_url) : viewUrl,
    thumbnail_url: photo.thumbnail_url
      ? resolveMediaUrl(photo.thumbnail_url)
      : viewUrl,
    full_url: photo.full_url ? resolveMediaUrl(photo.full_url) : originalUrl,
  };
}

/** Prefer original first — for free gallery / social downloads (digital purchase off). */
export function getStoreOriginalDownloadUrlCandidates(photo) {
  if (!photo) return [];
  const seen = new Set();
  const out = [];
  const push = (raw) => {
    if (!raw) return;
    const url = resolveMediaUrl(raw);
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push(url);
  };

  if (isVideoMedia(photo)) {
    push(photo.full_url);
    push(photo.web_url);
    push(photo.thumbnail_url);
    return out;
  }
  if (isGifMedia(photo)) {
    push(photo.full_url);
    push(photo.web_url);
    return out;
  }
  if (isRawMedia(photo)) {
    const preview = getRawPreviewUrl(photo);
    if (preview) push(preview);
    push(photo.full_url);
    push(photo.web_url);
    push(photo.thumbnail_url);
    for (const variant of deriveStoragePathVariants(photo.original_storage_path)) {
      push(variant);
    }
    return out;
  }

  push(photo.full_url);
  push(photo.original_storage_path);
  push(photo.web_url);
  push(photo.web_storage_path);
  push(photo.thumbnail_url);
  for (const variant of deriveStoragePathVariants(photo.original_storage_path)) {
    push(variant);
  }
  return out;
}
