/** Custom drag type: photo id from collection grid (Highlights / in-app only). */
export const COVER_PHOTO_DRAG_TYPE = 'application/x-pixnxt-photo-id';
const COVER_PLAIN_PREFIX = 'pixnxt-cover:';

/** Browsers often hide custom MIME types until drop — track active cover drags for dragover. */
let coverPhotoDragActive = false;

export function setCoverPhotoDragData(dataTransfer, photoId) {
  if (!dataTransfer || photoId == null) return;
  const id = String(photoId);
  coverPhotoDragActive = true;
  try {
    dataTransfer.setData(COVER_PHOTO_DRAG_TYPE, id);
  } catch {
    /* ignored */
  }
  dataTransfer.setData('text/plain', `${COVER_PLAIN_PREFIX}${id}`);
  dataTransfer.effectAllowed = 'copy';
}

export function endCoverPhotoDrag() {
  coverPhotoDragActive = false;
}

export function getCoverPhotoIdFromDataTransfer(dataTransfer) {
  if (!dataTransfer) return null;
  try {
    const custom = dataTransfer.getData(COVER_PHOTO_DRAG_TYPE);
    if (custom) return custom;
  } catch {
    /* ignored */
  }
  const plain = dataTransfer.getData('text/plain');
  if (plain?.startsWith(COVER_PLAIN_PREFIX)) {
    return plain.slice(COVER_PLAIN_PREFIX.length);
  }
  return null;
}

export function isCoverPhotoDrag(dataTransfer) {
  if (coverPhotoDragActive) return true;
  if (!dataTransfer) return false;
  const types = Array.from(dataTransfer.types || []);
  if (types.includes(COVER_PHOTO_DRAG_TYPE)) return true;
  return types.includes('text/plain');
}

export function isGalleryImagePhoto(photo) {
  const ref = photo?.filename || photo?.full_url || photo?.thumbnail_url || '';
  return !/\.(mp4|webm|ogg|mov)$/i.test(ref);
}
