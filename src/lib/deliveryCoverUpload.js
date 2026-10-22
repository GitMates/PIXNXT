/**
 * Delivery cover uploads from the filesystem must update cover_url only —
 * they must not create a photo row in the delivery.
 */

/** Marker on draft objects returned after a cover-only file upload. */
export const COVER_ONLY_DRAFT_FLAG = '__coverOnly';

/**
 * R2 path for a cover asset (outside photoset/, so it is not delivery media).
 * @param {string} photographerFolder
 * @param {string} collectionFolder
 * @param {string} fileName
 * @param {string} [moduleName='deliveries']
 */
export function buildDeliveryCoverStoragePath(
  photographerFolder,
  collectionFolder,
  fileName,
  moduleName = 'deliveries'
) {
  const folder = String(photographerFolder || 'photographer').replace(/^\/+|\/+$/g, '');
  const collection = String(collectionFolder || 'delivery').replace(/^\/+|\/+$/g, '');
  const name = String(fileName || `cover_${Date.now()}.jpg`).replace(/^\/+/g, '');
  return `users/${folder}/${moduleName}/${collection}/cover/${name}`;
}

/**
 * Card-sized cover derivative (~1200px) stored next to the hero cover file.
 * List cards prefer this URL so they do not download the full cover JPEG.
 */
export function buildDeliveryCoverThumbStoragePath(
  photographerFolder,
  collectionFolder,
  fileName,
  moduleName = 'deliveries'
) {
  const folder = String(photographerFolder || 'photographer').replace(/^\/+|\/+$/g, '');
  const collection = String(collectionFolder || 'delivery').replace(/^\/+|\/+$/g, '');
  let name = String(fileName || `cover_${Date.now()}.jpg`).replace(/^\/+/g, '');
  if (!/\.jpe?g$/i.test(name)) {
    name = name.replace(/\.[^.]+$/, '') + '.jpg';
  }
  return `users/${folder}/${moduleName}/${collection}/cover/thumb/${name}`;
}

/** True when this draft came from a filesystem cover upload, not a delivery photo. */
export function isCoverOnlyDraft(photo) {
  if (!photo || typeof photo !== 'object') return false;
  if (photo[COVER_ONLY_DRAFT_FLAG] === true) return true;
  if (photo.id == null || photo.id === '') return true;
  return false;
}

/**
 * cover_photo_id for save/apply: real delivery photo id, or null for file-based covers.
 * @param {object|null|undefined} photo
 * @param {string|null|undefined} [fallback] previous cover_photo_id when photo is absent
 */
export function resolveCoverPhotoId(photo, fallback = null) {
  if (!photo) return fallback ?? null;
  if (isCoverOnlyDraft(photo)) return null;
  return photo.id;
}

/**
 * Build a modal draft for a cover uploaded outside the delivery photo set.
 * @param {{ url: string, filename?: string, width?: number|null, height?: number|null }} opts
 */
export function buildCoverOnlyDraft({ url, filename = 'cover.jpg', width = null, height = null }) {
  return {
    [COVER_ONLY_DRAFT_FLAG]: true,
    id: null,
    filename,
    full_url: url,
    web_url: url,
    thumbnail_url: url,
    width,
    height,
  };
}
