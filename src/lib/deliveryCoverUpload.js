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

/** Warn in the cover chrome when the chosen image is narrower than this. */
export const COVER_MIN_WIDTH_PX = 1600;

const COVER_DROP_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const COVER_DROP_EXT = /\.(jpe?g|png|webp)$/i;
const VIDEO_EXT = /\.(mp4|webm|ogg|mov)$/i;

/** Empty-state primary CTA: upload when the delivery has no photos, else From delivery. */
export function coverEmptyPrimaryAction(photoCount) {
  return Number(photoCount) > 0 ? 'from-delivery' : 'upload';
}

/** Drop accepts JPEG, PNG, and WebP only; other types are ignored. */
export function isAcceptedCoverDropFile(file) {
  if (!file) return false;
  const type = String(file.type || '').toLowerCase().split(';')[0].trim();
  if (COVER_DROP_MIME.has(type)) return true;
  return COVER_DROP_EXT.test(String(file.name || ''));
}

export function isLowResolutionCover(width) {
  const w = Number(width);
  if (!Number.isFinite(w) || w <= 0) return false;
  return w < COVER_MIN_WIDTH_PX;
}

/**
 * Auto-cover after a finished upload batch: only when the slot is empty
 * and the photographer has not already chosen a cover.
 */
export function shouldApplyAutoCover({ coverUrl, coverPhotoId, coverSource } = {}) {
  if (coverSource === 'manual') return false;
  if (coverUrl) return false;
  if (coverPhotoId) return false;
  return true;
}

function isStillPhoto(photo) {
  if (!photo) return false;
  if (photo.media_type === 'video') return false;
  const ref = photo.filename || photo.full_url || photo.web_url || photo.thumbnail_url || '';
  return !VIDEO_EXT.test(ref);
}

function isLandscapePhoto(photo) {
  const width = Number(photo?.width);
  const height = Number(photo?.height);
  return Number.isFinite(width) && Number.isFinite(height) && width > height;
}

/** First landscape still in delivery order; otherwise the first still. */
export function pickAutoCoverPhoto(photos) {
  const stills = (Array.isArray(photos) ? photos : []).filter(isStillPhoto);
  return stills.find(isLandscapePhoto) || stills[0] || null;
}
