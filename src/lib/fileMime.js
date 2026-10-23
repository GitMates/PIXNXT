import { getRawExtensionFromFilename, isRawImageFile } from './rawImageFormats';

/** MIME map for files where the browser leaves `file.type` empty (common on Windows). */
const EXT_TO_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  avif: 'image/avif',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  heic: 'image/heic',
  heif: 'image/heif',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  dng: 'image/x-adobe-dng',
  cr2: 'image/x-canon-cr2',
  cr3: 'image/x-canon-cr3',
  nef: 'image/x-nikon-nef',
  nrw: 'image/x-nikon-nrw',
  arw: 'image/x-sony-arw',
  raf: 'image/x-fuji-raf',
  orf: 'image/x-olympus-orf',
  rw2: 'image/x-panasonic-rw2',
  pef: 'image/x-pentax-pef',
  sr2: 'image/x-sony-sr2',
  srw: 'image/x-samsung-srw',
  rwl: 'image/x-leica-rwl',
  x3f: 'image/x-sigma-x3f',
  '3fr': 'image/x-raw',
  fff: 'image/x-raw',
  erf: 'image/x-epson-erf',
  mrw: 'image/x-minolta-mrw',
  mef: 'image/x-mamiya-mef',
  gpr: 'image/x-adobe-dng',
  braw: 'video/x-blackmagic-raw',
  r3d: 'video/x-red-r3d',
  cine: 'application/octet-stream',
  proraw: 'image/heic',
  psd: 'image/vnd.adobe.photoshop',
  psb: 'image/vnd.adobe.photoshop',
};

export function inferMimeFromFilename(filename) {
  const ext = filename?.split('.').pop()?.toLowerCase();
  if (!ext) return undefined;
  if (EXT_TO_MIME[ext]) return EXT_TO_MIME[ext];
  if (getRawExtensionFromFilename(filename)) return 'application/octet-stream';
  return undefined;
}

export function getFileMime(file) {
  if (!file) return 'application/octet-stream';
  const fromType = file.type?.trim();
  if (fromType) return fromType;
  return inferMimeFromFilename(file.name) || 'application/octet-stream';
}

export function isImageMime(mime) {
  return mime.startsWith('image/');
}

export function isVideoMime(mime) {
  return mime.startsWith('video/');
}

const PHOTOSHOP_MIME = new Set([
  'image/vnd.adobe.photoshop',
  'image/x-photoshop',
  'application/x-photoshop',
  'application/photoshop',
  'image/psd',
]);

export function isPhotoshopFilename(filename) {
  return /\.(psd|psb)(\?|#|$)/i.test(String(filename || ''));
}

export function isPhotoshopMime(mime) {
  const normalized = String(mime || '').toLowerCase().split(';')[0].trim();
  return PHOTOSHOP_MIME.has(normalized);
}

export function isPhotoshopFile(file) {
  if (!file) return false;
  if (file.name && isPhotoshopFilename(file.name)) return true;
  if (isPhotoshopMime(file.type)) return true;
  return isPhotoshopMime(getFileMime(file));
}

export function getUploadMediaType(file) {
  if (!file) return 'image';
  if (getRawExtensionFromFilename(file.name)) return 'raw';
  const mime = getFileMime(file);
  if (isVideoMime(mime)) return 'video';
  if (mime === 'image/gif' || /\.gif$/i.test(file.name)) return 'gif';
  return 'image';
}

/** Photos, videos, GIFs, and camera RAW files allowed in the upload flow. */
export function isUploadableMediaFile(file) {
  if (!file?.name) return false;
  if (isPhotoshopFile(file)) return false;
  if (getRawExtensionFromFilename(file.name)) return true;
  const mime = getFileMime(file);
  if (isVideoMime(mime)) return true;
  if (mime === 'image/gif' || /\.gif$/i.test(file.name)) return true;
  return isImageMime(mime);
}

/**
 * Client gallery picker/drop: keep uploadable media, skip Photoshop always,
 * and skip RAW when that studio preference is off.
 */
export function splitClientGalleryUploadFiles(files, { rawSupportEnabled = true } = {}) {
  const accepted = [];
  let photoshopSkipped = 0;
  let rawSkipped = 0;
  for (const file of Array.from(files || [])) {
    if (isPhotoshopFile(file)) {
      photoshopSkipped += 1;
      continue;
    }
    if (!rawSupportEnabled && isRawImageFile(file)) {
      rawSkipped += 1;
      continue;
    }
    if (!isUploadableMediaFile(file)) continue;
    accepted.push(file);
  }
  return { accepted, photoshopSkipped, rawSkipped };
}
