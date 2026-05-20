/**
 * Camera RAW and related high-bit-depth formats accepted for upload.
 * Stored as-is on R2; grid/lightbox use embedded JPEG previews when available.
 */

export const RAW_IMAGE_EXTENSIONS = [
  '.dng',
  '.raw',
  '.crw',
  '.cr2',
  '.cr3',
  '.nef',
  '.nrw',
  '.arw',
  '.srf',
  '.sr2',
  '.raf',
  '.rw2',
  '.orf',
  '.pef',
  '.ptx',
  '.rwl',
  '.x3f',
  '.3fr',
  '.fff',
  '.iiq',
  '.dcr',
  '.k25',
  '.kdc',
  '.erf',
  '.mrw',
  '.srw',
  '.bay',
  '.mef',
  '.mos',
  '.r3d',
  '.braw',
  '.ari',
  '.cine',
  '.gpr',
  '.heic',
  '.heif',
  '.proraw',
];

const RAW_EXT_SET = new Set(
  RAW_IMAGE_EXTENSIONS.map((ext) => ext.replace(/^\./, '').toLowerCase())
);

/** Comma-separated list for `<input accept>` fallback (extensions + octet-stream). */
export const RAW_IMAGE_ACCEPT_STRING = [
  'application/octet-stream',
  ...RAW_IMAGE_EXTENSIONS,
].join(',');

export function getRawExtensionFromFilename(filename) {
  const ext = filename?.split('.').pop()?.toLowerCase();
  if (!ext || !RAW_EXT_SET.has(ext)) return null;
  return ext;
}

export function isRawImageFilename(filename) {
  return Boolean(getRawExtensionFromFilename(filename));
}

export function isRawImageFile(file) {
  return Boolean(file?.name && isRawImageFilename(file.name));
}
