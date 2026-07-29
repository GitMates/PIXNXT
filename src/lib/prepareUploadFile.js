/**
 * Shrink photos before upload to the pixel size needed for album display.
 * Parallel encode is capped so the main thread stays responsive under batch uploads.
 */
import { getFileMime, isImageMime } from './fileMime';
import { isRawImageFile } from './rawImageFormats';

const COMPRESS_MIN_BYTES = 400 * 1024; // re-encode large files even when already small
/** Max simultaneous canvas encode jobs (Pixieset-style: network-heavy, CPU-bounded prep). */
const MAX_PARALLEL_COMPRESS = 4;

let compressQueue = Promise.resolve();
let activeCompress = 0;
const compressWaiters = [];

function enqueueCompress(task) {
  const run = compressQueue.then(task, task);
  compressQueue = run.catch(() => {});
  return run;
}

function acquireCompressSlot() {
  if (activeCompress < MAX_PARALLEL_COMPRESS) {
    activeCompress += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    compressWaiters.push(resolve);
  }).then(() => {
    activeCompress += 1;
  });
}

function releaseCompressSlot() {
  activeCompress = Math.max(0, activeCompress - 1);
  const next = compressWaiters.shift();
  if (next) next();
}

async function withCompressSlot(fn) {
  await acquireCompressSlot();
  try {
    return await fn();
  } finally {
    releaseCompressSlot();
  }
}

function canvasToJpegFile(canvas, quality, baseName, lastModified) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(null);
        return;
      }
      resolve(
        new File([blob], `${baseName}.jpg`, {
          type: 'image/jpeg',
          lastModified,
        })
      );
    }, 'image/jpeg', quality);
  });
}

function applySharpening(ctx, outW, outH) {
  const sharpeningLevel = localStorage.getItem('sharpening_level');
  if (sharpeningLevel !== 'high') return;
  try {
    const imageData = ctx.getImageData(0, 0, outW, outH);
    const data = imageData.data;
    const w = outW;
    const h = outH;
    const out = new Uint8ClampedArray(data.length);
    const amount = 0.4;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        if (y === 0 || y === h - 1 || x === 0 || x === w - 1) {
          out[idx] = data[idx];
          out[idx + 1] = data[idx + 1];
          out[idx + 2] = data[idx + 2];
          out[idx + 3] = data[idx + 3];
          continue;
        }
        const up = idx - w * 4;
        const down = idx + w * 4;
        const left = idx - 4;
        const right = idx + 4;
        for (let c = 0; c < 3; c++) {
          const sharpened =
            5 * data[idx + c] - data[up + c] - data[down + c] - data[left + c] - data[right + c];
          out[idx + c] = Math.min(
            255,
            Math.max(0, data[idx + c] * (1 - amount) + sharpened * amount)
          );
        }
        out[idx + 3] = data[idx + 3];
      }
    }
    imageData.data.set(out);
    ctx.putImageData(imageData, 0, 0);
  } catch (err) {
    console.warn('Sharpening failed:', err);
  }
}

function computeOutputSize(srcW, srcH, fileSize, options = {}) {
  const { maxWidth, maxHeight, maxEdge } = options;
  let outW = srcW;
  let outH = srcH;
  let resized = false;

  if (maxWidth > 0 && maxHeight > 0) {
    const fitted = fitWithinBounds(srcW, srcH, maxWidth, maxHeight);
    outW = fitted.width;
    outH = fitted.height;
    resized = fitted.resized;
  }

  const longEdge = Math.max(outW, outH);
  const edgeLimit = maxEdge ?? (maxWidth > 0 && maxHeight > 0 ? null : fallbackMaxEdge(fileSize));
  if (edgeLimit > 0 && longEdge > edgeLimit) {
    const scale = edgeLimit / longEdge;
    outW = Math.max(1, Math.round(outW * scale));
    outH = Math.max(1, Math.round(outH * scale));
    resized = true;
  }

  return { outW, outH, resized };
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
 * @param {{ maxWidth?: number, maxHeight?: number, maxEdge?: number, quality?: number }} [options]
 */
export async function compressImageForUpload(file, options = {}) {
  const mime = getFileMime(file);
  if (isRawImageFile(file) || !isImageMime(mime) || mime === 'image/gif') {
    return file;
  }

  return withCompressSlot(async () => {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const srcW = bitmap.width;
      const srcH = bitmap.height;
      const { outW, outH, resized } = computeOutputSize(srcW, srcH, file.size, options);

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
      applySharpening(ctx, outW, outH);

      const quality = options.quality ?? jpegQualityForOutput(srcW, srcH, outW, outH, file.size);
      const baseName = file.name.replace(/\.[^.]+$/i, '') || 'photo';
      const outFile = await canvasToJpegFile(canvas, quality, baseName, file.lastModified);

      if (!outFile || (!resized && outFile.size >= file.size * 0.95)) {
        return file;
      }
      return outFile;
    } catch (err) {
      console.warn('prepareUploadFile: compression skipped', err);
      return file;
    }
  });
}

/**
 * One decode → web + thumb JPEGs (avoids double createImageBitmap per photo).
 * @param {File} file
 * @param {{ webMaxEdge?: number, thumbMaxEdge?: number, thumbQuality?: number }} [options]
 * @returns {Promise<{ webFile: File, thumbFile: File }>}
 */
export async function compressImageVariants(file, options = {}) {
  const mime = getFileMime(file);
  if (isRawImageFile(file) || !isImageMime(mime) || mime === 'image/gif') {
    return { webFile: file, thumbFile: file };
  }

  const webMaxEdge = options.webMaxEdge ?? 2048;
  const thumbMaxEdge = options.thumbMaxEdge ?? 400;
  const thumbQuality = options.thumbQuality ?? 0.6;

  return withCompressSlot(async () => {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const srcW = bitmap.width;
      const srcH = bitmap.height;
      const baseName = file.name.replace(/\.[^.]+$/i, '') || 'photo';

      const webSize = computeOutputSize(srcW, srcH, file.size, { maxEdge: webMaxEdge });
      const thumbSize = computeOutputSize(srcW, srcH, file.size, { maxEdge: thumbMaxEdge });

      const encodeVariant = async (outW, outH, quality) => {
        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return null;
        ctx.drawImage(bitmap, 0, 0, outW, outH);
        applySharpening(ctx, outW, outH);
        return canvasToJpegFile(canvas, quality, baseName, file.lastModified);
      };

      const webQuality = jpegQualityForOutput(srcW, srcH, webSize.outW, webSize.outH, file.size);
      const [webFileRaw, thumbFileRaw] = await Promise.all([
        encodeVariant(webSize.outW, webSize.outH, webQuality),
        encodeVariant(thumbSize.outW, thumbSize.outH, thumbQuality),
      ]);

      bitmap.close();

      const webFile =
        webFileRaw && (webSize.resized || webFileRaw.size < file.size * 0.95) ? webFileRaw : file;
      const thumbFile = thumbFileRaw || webFile;

      return { webFile, thumbFile };
    } catch (err) {
      console.warn('prepareUploadFile: variant compression skipped', err);
      return { webFile: file, thumbFile: file };
    }
  });
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
