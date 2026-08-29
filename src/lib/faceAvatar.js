import { expandBoundingBoxForDisplay } from './faceAvatarMath.js';

/**
 * Build inline styles for a circular face crop from Rekognition bounding box (0–1).
 */
export function buildFaceAvatarStyle(imageUrl, boundingBox, size = 72) {
  if (!imageUrl) {
    return { width: size, height: size };
  }

  if (!boundingBox?.Width || !boundingBox?.Height) {
    return { width: size, height: size };
  }

  const box = expandBoundingBoxForDisplay(boundingBox);
  const cx = (box.Left + box.Width / 2) * 100;
  const cy = (box.Top + box.Height / 2) * 100;
  const faceSpan = Math.max(box.Width, box.Height, 0.2);
  const padding = 2.15;
  const rawPercent = (100 / faceSpan) * padding;
  const bgSize = `${Math.min(360, Math.max(210, rawPercent))}%`;

  return {
    width: size,
    height: size,
    backgroundImage: `url("${String(imageUrl).replace(/"/g, '\\"')}")`,
    backgroundSize: bgSize,
    backgroundPosition: `${cx}% ${cy}%`,
    backgroundRepeat: 'no-repeat',
  };
}
