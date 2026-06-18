/**
 * Map pointer / pin positions to the visible photo area inside a pin layer
 * (object-fit cover/contain, CSS transforms, and pano bleed clipping).
 */

import { getRenderedImageContentRect } from './focalPoint';

function clampPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, n));
}

function getImageObjectFit(img) {
  if (!img) return 'cover';
  const fit = getComputedStyle(img).objectFit;
  return fit && fit !== 'fill' ? fit : 'cover';
}

/** Visible image area for object-fit: cover (includes cropped overflow). */
export function getCoverImageContentRect(img) {
  const rect = img.getBoundingClientRect();
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  if (!nw || !nh || rect.width <= 0 || rect.height <= 0) {
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  }

  const imageAspect = nw / nh;
  const boxAspect = rect.width / rect.height;

  if (imageAspect > boxAspect) {
    const h = rect.height;
    const w = h * imageAspect;
    return {
      left: rect.left + (rect.width - w) / 2,
      top: rect.top,
      width: w,
      height: h,
    };
  }

  const w = rect.width;
  const h = w / imageAspect;
  return {
    left: rect.left,
    top: rect.top + (rect.height - h) / 2,
    width: w,
    height: h,
  };
}

export function getImageContentRect(img) {
  if (!img) return null;
  return getImageObjectFit(img) === 'contain'
    ? getRenderedImageContentRect(img)
    : getCoverImageContentRect(img);
}

/** Photo pixels visible inside the pin layer (intersection of image + layer). */
export function getVisiblePhotoRect(layerEl, imgEl) {
  if (!layerEl) return null;
  const layer = layerEl.getBoundingClientRect();
  if (!layer.width || !layer.height) return null;

  if (!imgEl) {
    return { left: layer.left, top: layer.top, width: layer.width, height: layer.height };
  }

  const content = getImageContentRect(imgEl);
  if (!content?.width || !content?.height) {
    return { left: layer.left, top: layer.top, width: layer.width, height: layer.height };
  }

  const left = Math.max(layer.left, content.left);
  const top = Math.max(layer.top, content.top);
  const right = Math.min(layer.left + layer.width, content.left + content.width);
  const bottom = Math.min(layer.top + layer.height, content.top + content.height);
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);

  if (width <= 0 || height <= 0) {
    return { left: layer.left, top: layer.top, width: layer.width, height: layer.height };
  }

  return { left, top, width, height };
}

export function findPinLayerImage(layerEl) {
  if (!layerEl) return null;
  return layerEl.querySelector(
    'img.ab-grid-cell-photo, img.ab-page-photo, img.ab-book-wrap-cover-img'
  );
}

/** Map a click to percentages on the visible photo (0–100). */
export function photoSpotFromPointer(clientX, clientY, layerEl, imgEl) {
  const visible = getVisiblePhotoRect(layerEl, imgEl);
  if (!visible?.width || !visible?.height) {
    return { xPct: 50, yPct: 50 };
  }
  return {
    xPct: clampPercent(((clientX - visible.left) / visible.width) * 100),
    yPct: clampPercent(((clientY - visible.top) / visible.height) * 100),
  };
}

/** Convert stored photo percentages to pin position inside the layer box. */
export function photoSpotToLayerPercent(xPct, yPct, layerEl, imgEl) {
  const layer = layerEl?.getBoundingClientRect?.();
  if (!layer?.width || !layer?.height) {
    return { xPct: clampPercent(xPct), yPct: clampPercent(yPct) };
  }

  const visible = getVisiblePhotoRect(layerEl, imgEl);
  if (!visible?.width || !visible?.height) {
    return { xPct: clampPercent(xPct), yPct: clampPercent(yPct) };
  }

  const cx = visible.left + (clampPercent(xPct) / 100) * visible.width;
  const cy = visible.top + (clampPercent(yPct) / 100) * visible.height;

  return {
    xPct: clampPercent(((cx - layer.left) / layer.width) * 100),
    yPct: clampPercent(((cy - layer.top) / layer.height) * 100),
  };
}
