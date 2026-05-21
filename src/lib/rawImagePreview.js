import exifr from 'exifr';
import { RAW_IMAGE_EXTENSIONS } from './rawImageFormats';

const PREVIEW_SCAN_BYTES = 32 * 1024 * 1024;
/** Load entire file for IFD1 thumbnail offsets (exifr chunked mode only maps the header). */
const FULL_READ_MAX_BYTES = 48 * 1024 * 1024;

const RAW_EXT_IN_URL_RE = new RegExp(
  `(${RAW_IMAGE_EXTENSIONS.map((e) => e.replace('.', '\\.')).join('|')})(\\?|#|$)`,
  'i'
);

function canvasSizeForOrientation(orientation, w, h) {
  return orientation >= 5 && orientation <= 8 ? [h, w] : [w, h];
}

/** Standard EXIF orientation → canvas transform (canvas size already swapped when needed). */
function applyExifOrientationTransform(ctx, orientation, cw, ch) {
  switch (orientation) {
    case 2:
      ctx.translate(cw, 0);
      ctx.scale(-1, 1);
      break;
    case 3:
      ctx.translate(cw, ch);
      ctx.rotate(Math.PI);
      break;
    case 4:
      ctx.translate(0, ch);
      ctx.scale(1, -1);
      break;
    case 5:
      ctx.translate(cw, 0);
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(1, -1);
      break;
    case 6:
      ctx.translate(cw, 0);
      ctx.rotate(0.5 * Math.PI);
      break;
    case 7:
      ctx.translate(cw, ch);
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(1, -1);
      break;
    case 8:
      ctx.translate(0, ch);
      ctx.rotate(-0.5 * Math.PI);
      break;
    default:
      break;
  }
}

/** URLs the browser can render in `<img>` (JPEG preview sidecar on R2, not original RAW). */
export function isBrowserDisplayableImageUrl(url) {
  if (!url) return false;
  if (url.startsWith('blob:')) return true;
  if (RAW_EXT_IN_URL_RE.test(url)) return false;
  if (/\.(mp4|webm|mov|ogg|m4v)(\?|#|$)/i.test(url)) return false;
  if (/\.(jpe?g|png|gif|webp|avif)(\?|#|$)/i.test(url)) return true;
  // R2 public URLs often omit extensions in the path; still serve image/* from storage.
  if (/^https?:\/\//i.test(url)) return true;
  return /\.(jpe?g|png|gif|webp)(\?|#|$)/i.test(url);
}

async function readFileArrayBuffer(file) {
  if (!file || file.size <= 0 || file.size > FULL_READ_MAX_BYTES) return null;
  return file.arrayBuffer();
}

async function readExifOrientation(input) {
  if (!input) return 1;
  try {
    const value = await exifr.orientation(input);
    return typeof value === 'number' && value >= 1 && value <= 8 ? value : 1;
  } catch {
    return 1;
  }
}

async function bitmapToJpegBlob(bitmap, quality = 0.92) {
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
  });
}

/**
 * Bake EXIF rotation into JPEG pixels so grid/lightbox match the file picker.
 * @param {Blob} jpegBlob — embedded preview extracted from RAW
 * @param {Blob|File} [orientationSource] — parent RAW file (preferred for Orientation tag)
 */
export async function normalizeJpegOrientation(jpegBlob, orientationSource = null) {
  if (!jpegBlob) return null;

  const rawOrientation = orientationSource ? await readExifOrientation(orientationSource) : 1;
  const jpegOrientation = await readExifOrientation(jpegBlob);
  const orientation =
    orientationSource && rawOrientation !== 1 ? rawOrientation : jpegOrientation || rawOrientation;

  if (orientation === 1) {
    try {
      const bitmap = await createImageBitmap(jpegBlob, { imageOrientation: 'from-image' });
      const out = await bitmapToJpegBlob(bitmap);
      bitmap.close();
      if (out) return out;
    } catch {
      /* use original */
    }
    return jpegBlob;
  }

  try {
    const bitmap = await createImageBitmap(jpegBlob, { imageOrientation: 'none' });
    const w = bitmap.width;
    const h = bitmap.height;
    const [cw, ch] = canvasSizeForOrientation(orientation, w, h);
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return jpegBlob;
    }
    applyExifOrientationTransform(ctx, orientation, cw, ch);
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const out = await new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
    });
    return out || jpegBlob;
  } catch (err) {
    console.warn('normalizeJpegOrientation failed:', err);
    return jpegBlob;
  }
}

async function validateJpegBlob(blob) {
  if (!blob || blob.size < 1024) return null;
  try {
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    const ok = bitmap.width >= 80 && bitmap.height >= 80;
    bitmap.close();
    return ok ? blob : null;
  } catch {
    return null;
  }
}

/**
 * Scan the start of a RAW file for an embedded JPEG (many cameras embed a full-size or thumb JPEG).
 */
async function extractEmbeddedJpegFallback(file) {
  const slice = file.slice(0, Math.min(file.size, PREVIEW_SCAN_BYTES));
  const buffer = await slice.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const candidates = [];
  for (let i = 0; i < bytes.length - 3; i += 1) {
    if (bytes[i] !== 0xff || bytes[i + 1] !== 0xd8 || bytes[i + 2] !== 0xff) continue;

    let end = -1;
    for (let j = i + 2; j < bytes.length - 1; j += 1) {
      if (bytes[j] === 0xff && bytes[j + 1] === 0xd9) {
        end = j + 2;
        break;
      }
    }
    if (end <= i) continue;

    const length = end - i;
    if (length < 2048 || length > 12 * 1024 * 1024) continue;
    candidates.push({ start: i, length });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.length - a.length);
  for (const { start, length } of candidates) {
    const blob = new Blob([bytes.slice(start, start + length)], { type: 'image/jpeg' });
    const valid = await validateJpegBlob(blob);
    if (valid) return valid;
  }

  return null;
}

async function extractViaExifr(input) {
  const thumb = await exifr.thumbnail(input, {
    tiff: true,
    ifd1: true,
    mergeOutput: false,
    firstChunkSize: 1024 * 1024,
    chunkSize: 512 * 1024,
    chunkLimit: 20,
  });
  if (!thumb?.byteLength) return null;
  return validateJpegBlob(new Blob([thumb], { type: 'image/jpeg' }));
}

async function finalizeRawPreview(jpegBlob, rawFile) {
  if (!jpegBlob) return null;
  return normalizeJpegOrientation(jpegBlob, rawFile);
}

/**
 * Extract an embedded JPEG preview from a RAW file for grid thumbnails / web_url.
 * @param {File|Blob} file
 * @returns {Promise<Blob|null>}
 */
export async function extractRawPreviewBlob(file) {
  if (!file) return null;

  try {
    const buffer = await readFileArrayBuffer(file);
    const input = buffer ?? file;
    const fromExifr = await extractViaExifr(input);
    if (fromExifr) return finalizeRawPreview(fromExifr, file);
  } catch (err) {
    console.warn('exifr thumbnail failed, trying embedded JPEG scan:', file.name, err);
  }

  try {
    const embedded = await extractEmbeddedJpegFallback(file);
    return finalizeRawPreview(embedded, file);
  } catch (err) {
    console.warn('RAW embedded JPEG scan failed:', file.name, err);
    return null;
  }
}
