import { expandBoundingBoxForPortraitAvatar } from './faceAvatarMath.js';

const FILL_RATIO = 0.9;
const MIN_ZOOM = 1.6;
const MAX_ZOOM = 4.8;

function portraitZoom(boundingBox) {
  const box = expandBoundingBoxForPortraitAvatar(boundingBox);
  const side = Math.max(box.Width, box.Height, 0.1);
  const zoom = (1 / side) * FILL_RATIO;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/**
 * Layout for an <img> face crop (better browser downscale than CSS background).
 */
export function buildFaceAvatarCrop(imageUrl, boundingBox, size = 72) {
  const wrap = { width: size, height: size };
  if (!imageUrl || !boundingBox?.Width || !boundingBox?.Height) {
    return { wrap, img: null };
  }

  const box = expandBoundingBoxForPortraitAvatar(boundingBox);
  const zoom = portraitZoom(boundingBox);
  const shown = 1 / zoom;
  const cx = box.Left + box.Width / 2;
  const cy = box.Top + box.Height / 2;
  const left = Math.max(0, Math.min(1 - shown, cx - shown / 2));
  const top = Math.max(0, Math.min(1 - shown, cy - shown / 2));

  return {
    wrap,
    img: {
      width: `${zoom * 100}%`,
      height: `${zoom * 100}%`,
      left: `${-left * zoom * 100}%`,
      top: `${-top * zoom * 100}%`,
    },
  };
}

/**
 * Build inline styles for a circular face crop from Rekognition bounding box (0–1).
 * Kept for callers that still paint via CSS background.
 */
export function buildFaceAvatarStyle(imageUrl, boundingBox, size = 72) {
  if (!imageUrl) {
    return { width: size, height: size };
  }

  if (!boundingBox?.Width || !boundingBox?.Height) {
    return { width: size, height: size };
  }

  const box = expandBoundingBoxForPortraitAvatar(boundingBox);
  const cx = (box.Left + box.Width / 2) * 100;
  const cy = (box.Top + box.Height / 2) * 100;
  const zoom = portraitZoom(boundingBox);
  const bgSize = `${zoom * 100}%`;

  return {
    width: size,
    height: size,
    backgroundImage: `url("${String(imageUrl).replace(/"/g, '\\"')}")`,
    backgroundSize: bgSize,
    backgroundPosition: `${cx}% ${cy}%`,
    backgroundRepeat: 'no-repeat',
  };
}
