/** MIME map for files where the browser leaves `file.type` empty (common on Windows). */
const EXT_TO_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
};

export function inferMimeFromFilename(filename) {
  const ext = filename?.split('.').pop()?.toLowerCase();
  return ext ? EXT_TO_MIME[ext] : undefined;
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
