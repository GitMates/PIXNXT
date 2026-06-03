/**
 * Shrink photos before upload (28MB → ~2–4MB). One file at a time to avoid memory issues.
 */
import { getFileMime, isImageMime } from './fileMime';
import { isRawImageFile } from './rawImageFormats';

const COMPRESS_MIN_BYTES = 800 * 1024; // 800 KB — compress most gallery photos

let compressQueue = Promise.resolve();

function enqueueCompress(task) {
  const run = compressQueue.then(task, task);
  compressQueue = run.catch(() => {});
  return run;
}

function compressSettings(fileSize) {
  if (fileSize >= 15 * 1024 * 1024) {
    return { maxEdge: 2400, quality: 0.8 };
  }
  if (fileSize >= 6 * 1024 * 1024) {
    return { maxEdge: 2800, quality: 0.84 };
  }
  return { maxEdge: 3200, quality: 0.86 };
}

export async function compressImageForUpload(file) {
  const mime = getFileMime(file);
  if (isRawImageFile(file) || !isImageMime(mime) || mime === 'image/gif' || file.size < COMPRESS_MIN_BYTES) {
    return file;
  }

  const { maxEdge, quality } = compressSettings(file.size);

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

    const longEdge = Math.max(bitmap.width, bitmap.height);
    if (longEdge <= maxEdge && file.size < 2.5 * 1024 * 1024) {
      bitmap.close();
      return file;
    }

    const scale = longEdge > maxEdge ? maxEdge / longEdge : 1;
    const outW = Math.max(1, Math.round(bitmap.width * scale));
    const outH = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, outW, outH);
    bitmap.close();

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });

    if (!blob || blob.size >= file.size * 0.95) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/i, '') || 'photo';
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    });
  } catch (err) {
    console.warn('prepareUploadFile: compression skipped', err);
    return file;
  }
}

/**
 * @param {File} file
 * @param {(percent: number) => void} [onProgress] 0–100 during optimize step
 */
export function prepareUploadFile(file, onProgress) {
  return enqueueCompress(async () => {
    onProgress?.(5);
    const result = await compressImageForUpload(file);
    onProgress?.(100);
    return result;
  });
}
