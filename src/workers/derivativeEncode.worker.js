/**
 * Web + thumb JPEG encode off the main thread so original uploads are not
 * blocked on canvas work. One decode, two OffscreenCanvas encodes.
 */

function fitWithinBounds(width, height, maxWidth, maxHeight) {
  if (!(maxWidth > 0 && maxHeight > 0)) return { width, height, resized: false };
  if (width <= maxWidth && height <= maxHeight) return { width, height, resized: false };
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    resized: scale < 1,
  };
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
  let edgeLimit = maxEdge;
  if (edgeLimit == null && !(maxWidth > 0 && maxHeight > 0)) {
    if (fileSize >= 15 * 1024 * 1024) edgeLimit = 2400;
    else if (fileSize >= 6 * 1024 * 1024) edgeLimit = 2800;
    else edgeLimit = 3200;
  }
  if (edgeLimit > 0 && longEdge > edgeLimit) {
    const scale = edgeLimit / longEdge;
    outW = Math.max(1, Math.round(outW * scale));
    outH = Math.max(1, Math.round(outH * scale));
    resized = true;
  }
  return { outW, outH, resized };
}

function jpegQualityForOutput(srcW, srcH, outW, outH, fileSize) {
  const srcLong = Math.max(srcW, srcH);
  const outLong = Math.max(outW, outH);
  if (outLong >= srcLong * 0.98) return 0.9;
  if (outLong >= 1800) return 0.88;
  if (fileSize >= 10 * 1024 * 1024) return 0.84;
  return 0.86;
}

function applySharpen(ctx, outW, outH) {
  const imageData = ctx.getImageData(0, 0, outW, outH);
  const data = imageData.data;
  const out = new Uint8ClampedArray(data.length);
  const amount = 0.4;
  const w = outW;
  const h = outH;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
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
      for (let c = 0; c < 3; c += 1) {
        const sharpened = 5 * data[idx + c] - data[up + c] - data[down + c] - data[left + c] - data[right + c];
        out[idx + c] = Math.min(255, Math.max(0, data[idx + c] * (1 - amount) + sharpened * amount));
      }
      out[idx + 3] = data[idx + 3];
    }
  }
  imageData.data.set(out);
  ctx.putImageData(imageData, 0, 0);
}

async function encodeVariant(bitmap, outW, outH, quality, enhance, sharpen) {
  const canvas = new OffscreenCanvas(outW, outH);
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return null;
  if (enhance) {
    try {
      ctx.filter = 'contrast(1.07) saturate(1.14) brightness(1.015)';
    } catch {
      /* filter unsupported */
    }
  }
  ctx.drawImage(bitmap, 0, 0, outW, outH);
  try {
    ctx.filter = 'none';
  } catch {
    /* ignore */
  }
  if (enhance || sharpen === 'high' || sharpen === 'optimal') {
    try {
      applySharpen(ctx, outW, outH);
    } catch {
      /* keep the unsharpened encode */
    }
  }
  return canvas.convertToBlob({ type: 'image/jpeg', quality });
}

self.onmessage = async (event) => {
  const { id, file, webMaxEdge, thumbMaxEdge, thumbQuality, enhanceRaw, sharpen } = event.data || {};
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const srcW = bitmap.width;
    const srcH = bitmap.height;
    const webSize = computeOutputSize(srcW, srcH, file.size, { maxEdge: webMaxEdge ?? 2048 });
    const thumbSize = computeOutputSize(srcW, srcH, file.size, { maxEdge: thumbMaxEdge ?? 400 });
    const baseWebQuality = jpegQualityForOutput(srcW, srcH, webSize.outW, webSize.outH, file.size);
    const webQuality = enhanceRaw ? Math.max(baseWebQuality, 0.93) : baseWebQuality;
    const [web, thumb] = await Promise.all([
      encodeVariant(bitmap, webSize.outW, webSize.outH, webQuality, enhanceRaw === true, sharpen),
      encodeVariant(bitmap, thumbSize.outW, thumbSize.outH, thumbQuality ?? 0.6, false, sharpen),
    ]);
    bitmap.close();
    if (!web || !thumb) throw new Error('encode failed');
    self.postMessage({ id, ok: true, web, thumb, width: srcW, height: srcH, webResized: webSize.resized });
  } catch (err) {
    self.postMessage({ id, ok: false, error: err?.message || String(err) });
  }
};
