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

function hasImageTransform(img) {
  if (!img) return false;
  const t = getComputedStyle(img).transform;
  return Boolean(t && t !== 'none');
}

/**
 * Pin tip position as layer percentages (0–100).
 * Cover photos use the exact click position; contain / transforms use photo mapping.
 */
export function pinPointFromPointer(clientX, clientY, layerEl, imgEl) {
  const layer = layerEl?.getBoundingClientRect?.();
  if (!layer?.width || !layer?.height) {
    return { xPct: 50, yPct: 50 };
  }

  const img = imgEl || findPinLayerImage(layerEl);
  if (
    img &&
    (getImageObjectFit(img) === 'contain' || hasImageTransform(img))
  ) {
    const spot = photoSpotFromPointer(clientX, clientY, layerEl, img);
    return photoSpotToLayerPercent(spot.xPct, spot.yPct, layerEl, img);
  }

  return {
    xPct: clampPercent(((clientX - layer.left) / layer.width) * 100),
    yPct: clampPercent(((clientY - layer.top) / layer.height) * 100),
  };
}

/** Client pixel position for a stored layer pin percent. */
export function pinPointToClient(layerEl, xPct, yPct) {
  const layer = layerEl?.getBoundingClientRect?.();
  if (!layer?.width || !layer?.height) return null;
  return {
    left: layer.left + (clampPercent(xPct) / 100) * layer.width,
    top: layer.top + (clampPercent(yPct) / 100) * layer.height,
  };
}

function spreadPhotoPercentToHalfPlacement(
  spreadXPct,
  spreadYPct,
  spreadLeft,
  totalPages,
  baseSlot
) {
  const isRight = spreadXPct >= 50;
  const rightPage = Math.min(spreadLeft + 1, Math.max(0, totalPages - 1));
  return {
    ...baseSlot,
    pageNum: isRight ? rightPage : spreadLeft,
    cellId: isRight ? 2 : 1,
    xPct: clampPercent(isRight ? (spreadXPct - 50) * 2 : spreadXPct * 2),
    yPct: clampPercent(spreadYPct),
  };
}

/**
 * Map a click on a swap-picker spread thumbnail to a book placement.
 */
export function placementFromSwapThumbClick(
  event,
  targetSlot,
  { spreadLeft, wholeSpread, totalPages, showSpreadFull }
) {
  if (!targetSlot) return null;
  const img = event.target instanceof Element ? event.target.closest('img') : null;
  if (!img) {
    return {
      ...targetSlot,
      xPct: 50,
      yPct: 50,
      pageNum: targetSlot.pageNum,
      cellId: targetSlot.cellId ?? 0,
    };
  }

  const pageEl = img.closest('.ab-overview-page');
  const thumbEl = img.closest('.ab-overview-thumb');
  const layerEl = pageEl || thumbEl || img.parentElement;
  const spot = pinPointFromPointer(event.clientX, event.clientY, layerEl, img);

  if (showSpreadFull && wholeSpread) {
    return spreadPhotoPercentToHalfPlacement(
      spot.xPct,
      spot.yPct,
      spreadLeft,
      totalPages,
      targetSlot
    );
  }

  const pages = thumbEl?.querySelectorAll('.ab-overview-page');
  const pageIndex =
    pages && pageEl ? Array.from(pages).findIndex((node) => node === pageEl) : 0;
  const isRight = pageIndex === 1;
  const rightPage = Math.min(spreadLeft + 1, Math.max(0, totalPages - 1));

  return {
    ...targetSlot,
    pageNum: isRight ? rightPage : spreadLeft,
    cellId: isRight ? 2 : 1,
    xPct: spot.xPct,
    yPct: spot.yPct,
  };
}
