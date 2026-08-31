import { expandBoundingBoxForPortraitAvatar } from './faceAvatarMath.js';

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

  const box = expandBoundingBoxForPortraitAvatar(boundingBox);
  const cx = (box.Left + box.Width / 2) * 100;
  const cy = (box.Top + box.Height / 2) * 100;
  const side = Math.max(box.Width, box.Height, 0.1);
  const fillRatio = 0.9;
  const bgSizePct = (100 / side) * fillRatio;
  const bgSize = `${Math.min(480, Math.max(160, bgSizePct))}%`;

  return {
    width: size,
    height: size,
    backgroundImage: `url("${String(imageUrl).replace(/"/g, '\\"')}")`,
    backgroundSize: bgSize,
    backgroundPosition: `${cx}% ${cy}%`,
    backgroundRepeat: 'no-repeat',
  };
}
