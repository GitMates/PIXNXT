/**
 * Shrink photos before upload to the pixel size needed for album display.
 * One file at a time to avoid memory issues.
 */
import { getFileMime, isImageMime } from './fileMime';
import { isRawImageFile } from './rawImageFormats';

const COMPRESS_MIN_BYTES = 400 * 1024; // re-encode large files even when already small

let compressQueue = Promise.resolve();

function enqueueCompress(task) {
  const run = compressQueue.then(task, task);
  compressQueue = run.catch(() => {});
  return run;
}

function fallbackMaxEdge(fileSize) {
  if (fileSize >= 15 * 1024 * 1024) {
    return 2400;
  }
  if (fileSize >= 6 * 1024 * 1024) {
    return 2800;
  }
  return 3200;
}

function fitWithinBounds(width, height, maxWidth, maxHeight) {
  if (!(maxWidth > 0 && maxHeight > 0)) {
    return { width, height, resized: false };
  }
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height, resized: false };
  }
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    resized: scale < 1,
  };
}

function jpegQualityForOutput(srcW, srcH, outW, outH, fileSize) {
  const srcLong = Math.max(srcW, srcH);
  const outLong = Math.max(outW, outH);
  if (outLong >= srcLong * 0.98) {
    return 0.9;
  }
  if (outLong >= 1800) {
    return 0.88;
  }
  if (fileSize >= 10 * 1024 * 1024) {
    return 0.84;
  }
  return 0.86;
}

/**
 * @param {File} file
 * @param {{ maxWidth?: number, maxHeight?: number, maxEdge?: number }} [options]
 */
export async function compressImageForUpload(file, options = {}) {
  const mime = getFileMime(file);
  if (isRawImageFile(file) || !isImageMime(mime) || mime === 'image/gif') {
    return file;
  }

  const { maxWidth, maxHeight, maxEdge } = options;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const srcW = bitmap.width;
    const srcH = bitmap.height;

    let outW = srcW;
    let outH = srcH;
    let resized = false;

    if (maxWidth > 0 && maxHeight > 0) {
      const fitted = fitWithinBounds(srcW, srcH, maxWidth, maxHeight);
      outW = fitted.width;
      outH = fitted.height;
      resized = fitted.resized;
    } else {
      const longEdge = Math.max(srcW, srcH);
      const edgeLimit = maxEdge ?? fallbackMaxEdge(file.size);
      if (longEdge > edgeLimit) {
        const scale = edgeLimit / longEdge;
        outW = Math.max(1, Math.round(srcW * scale));
        outH = Math.max(1, Math.round(srcH * scale));
        resized = true;
      }
    }

    if (!resized && file.size < COMPRESS_MIN_BYTES) {
      bitmap.close();
      return file;
    }

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

    const quality = jpegQualityForOutput(srcW, srcH, outW, outH, file.size);
    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });

    if (!blob || (!resized && blob.size >= file.size * 0.95)) {
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
 * @param {{ maxWidth?: number, maxHeight?: number, maxEdge?: number }} [options]
 */
export function prepareUploadFile(file, onProgress, options = {}) {
  return enqueueCompress(async () => {
    onProgress?.(5);
    const result = await compressImageForUpload(file, options);
    onProgress?.(100);
    return result;
  });
}
