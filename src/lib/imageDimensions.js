/**
 * Read image dimensions without decoding the full file (fast for JPEG).
 */
import { getFileMime, isImageMime } from './fileMime';
import { isRawImageFile } from './rawImageFormats';

export async function getImageDimensionsFast(file) {
  const mime = getFileMime(file);
  if (isRawImageFile(file) || !isImageMime(mime) || mime === 'image/gif') {
    return { width: null, height: null };
  }

  if (mime === 'image/jpeg') {
    const fromHeader = await readJpegDimensions(file);
    if (fromHeader) return fromHeader;
  }

  if (file.size > 4 * 1024 * 1024) {
    return { width: null, height: null };
  }

  return readDimensionsViaImage(file);
}

async function readJpegDimensions(file) {
  try {
    const buf = await file.slice(0, 128 * 1024).arrayBuffer();
    const view = new DataView(buf);
    if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;

    let offset = 2;
    while (offset < view.byteLength - 9) {
      if (view.getUint8(offset) !== 0xff) break;
      const marker = view.getUint8(offset + 1);
      if (marker === 0xd8 || marker === 0x01) {
        offset += 2;
        continue;
      }
      if (marker === 0xd9 || marker === 0xda) break;

      const segmentLen = view.getUint16(offset + 2);
      if (segmentLen < 2) break;

      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return {
          height: view.getUint16(offset + 5),
          width: view.getUint16(offset + 7),
        };
      }

      offset += 2 + segmentLen;
    }
  } catch {
    /* fall through */
  }
  return null;
}

function readDimensionsViaImage(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    const done = (dimensions) => {
      URL.revokeObjectURL(url);
      resolve(dimensions);
    };
    img.onload = () => done({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => done({ width: null, height: null });
    img.src = url;
  });
}
