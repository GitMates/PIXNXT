/** Face-group id for a PIXNXT delivery (AWS calls this a Collection). */
export function rekognitionDeliveryId(deliveryId) {
  return `pixnxt-${String(deliveryId).replace(/[^a-zA-Z0-9_.-]/g, '-')}`;
}

/** Prefer web derivative — matches Rekognition orientation and loads fast for avatars. */
export function resolvePhotoAiSourceUrl(photo) {
  if (!photo) return null;
  return photo.web_url || photo.full_url || photo.thumbnail_url || null;
}

/** Display URL for people avatars (same priority as indexing source). */
export function resolveFaceAvatarDisplayUrl(photo) {
  return resolvePhotoAiSourceUrl(photo);
}

/** Expand Rekognition bbox into a square portrait crop (forehead + chin). */
export function expandBoundingBoxForPortraitAvatar(bb) {
  if (!bb) return bb;

  const left = bb.Left ?? 0;
  const top = bb.Top ?? 0;
  const width = bb.Width ?? 0.2;
  const height = bb.Height ?? 0.2;

  const padTop = height * 0.95;
  const padBottom = height * 0.42;
  const padSide = Math.max(width, height) * 0.52;

  let x1 = left - padSide;
  let y1 = top - padTop;
  let x2 = left + width + padSide;
  let y2 = top + height + padBottom;

  const cx = left + width / 2;
  const cy = top + height / 2 - height * 0.1;

  const side = Math.max(x2 - x1, y2 - y1, 0.12);
  x1 = cx - side / 2;
  y1 = cy - side / 2;
  x2 = cx + side / 2;
  y2 = cy + side / 2;

  if (x1 < 0) {
    x2 -= x1;
    x1 = 0;
  }
  if (y1 < 0) {
    y2 -= y1;
    y1 = 0;
  }
  if (x2 > 1) {
    const shift = x2 - 1;
    x1 -= shift;
    x2 = 1;
  }
  if (y2 > 1) {
    const shift = y2 - 1;
    y1 -= shift;
    y2 = 1;
  }

  x1 = Math.max(0, x1);
  y1 = Math.max(0, y1);
  x2 = Math.min(1, x2);
  y2 = Math.min(1, y2);

  return {
    Left: x1,
    Top: y1,
    Width: Math.max(x2 - x1, 0.01),
    Height: Math.max(y2 - y1, 0.01),
  };
}

/** @deprecated Use expandBoundingBoxForPortraitAvatar */
export function expandBoundingBoxForDisplay(bb, _padRatio = 0.45) {
  return expandBoundingBoxForPortraitAvatar(bb);
}

/** 0–1 score: how much of the ideal portrait crop fits inside the image. */
export function portraitCropQuality(bb) {
  if (!bb?.Width || !bb?.Height) return 0;

  const left = bb.Left ?? 0;
  const top = bb.Top ?? 0;
  const width = bb.Width ?? 0;
  const height = bb.Height ?? 0;

  const padTop = height * 0.95;
  const padBottom = height * 0.42;
  const padSide = Math.max(width, height) * 0.52;

  let x1 = left - padSide;
  let y1 = top - padTop;
  let x2 = left + width + padSide;
  let y2 = top + height + padBottom;

  const cx = left + width / 2;
  const cy = top + height / 2 - height * 0.1;
  const side = Math.max(x2 - x1, y2 - y1, 0.12);

  const idealX1 = cx - side / 2;
  const idealY1 = cy - side / 2;
  const idealX2 = cx + side / 2;
  const idealY2 = cy + side / 2;

  const clipLeft = Math.max(0, -idealX1);
  const clipTop = Math.max(0, -idealY1);
  const clipRight = Math.max(0, idealX2 - 1);
  const clipBottom = Math.max(0, idealY2 - 1);
  const clipped = clipLeft + clipTop + clipRight + clipBottom;
  const clipRatio = clipped / Math.max(side * 4, 0.01);

  return Math.max(0, Math.min(1, 1 - clipRatio * 2.5));
}

export function isGoodAvatarFace(entry) {
  const bb = entry?.boundingBox || {};
  const width = bb.Width || 0;
  const height = bb.Height || 0;
  const area = width * height;
  if (!area || (entry.confidence || 0) < 80) return false;

  if (portraitCropQuality(bb) < 0.35) return false;

  const cx = (bb.Left || 0) + width / 2;
  const cy = (bb.Top || 0) + height / 2;
  const edgeMargin = Math.min(cx, cy, 1 - cx, 1 - cy);
  if (edgeMargin < 0.16) return false;

  const aspect = width / Math.max(height, 0.001);
  if (aspect < 0.5 || aspect > 1.7) return false;

  return area >= 0.01;
}

/**
 * Score a detected face for use as the cluster avatar thumbnail.
 * Prefers confident, centered, frontal faces that crop cleanly as portraits.
 */
export function scoreAvatarFace(entry) {
  const bb = entry?.boundingBox || {};
  const width = bb.Width || 0;
  const height = bb.Height || 0;
  const area = width * height;
  if (!area) return 0;

  const cx = (bb.Left || 0) + width / 2;
  const cy = (bb.Top || 0) + height / 2;
  const confidence = Math.max(entry.confidence || 0, 1) / 100;

  const edgeMargin = Math.min(cx, cy, 1 - cx, 1 - cy);
  let edgeScore = 1;
  if (edgeMargin < 0.06) edgeScore = 0.1;
  else if (edgeMargin < 0.12) edgeScore = 0.35;
  else if (edgeMargin < 0.18) edgeScore = 0.65;
  else if (edgeMargin < 0.24) edgeScore = 0.85;

  let sizeScore = 1;
  if (area < 0.015) sizeScore = area / 0.015;
  else if (area > 0.35) sizeScore = 0.35 / area;

  const aspect = width / Math.max(height, 0.001);
  const aspectScore = aspect >= 0.6 && aspect <= 1.45 ? 1 : 0.5;

  const centerScore = 1 - Math.hypot(cx - 0.5, cy - 0.5) * 0.3;
  const cropScore = 0.35 + portraitCropQuality(bb) * 0.65;

  return area * confidence * edgeScore * sizeScore * aspectScore * centerScore * cropScore;
}

export function pickBestAvatarFace(current, candidate) {
  if (!candidate) return current;
  if (!current) return candidate;

  const currentGood = isGoodAvatarFace(current);
  const candidateGood = isGoodAvatarFace(candidate);
  if (candidateGood && !currentGood) return candidate;
  if (currentGood && !candidateGood) return current;

  return scoreAvatarFace(candidate) > scoreAvatarFace(current) ? candidate : current;
}

/** Drop low-confidence / tiny / heavily clipped faces before persisting metadata. */
export function filterIndexedFaces(faces) {
  return (faces || []).filter((face) => {
    if (!face?.faceId) return false;
    if ((face.confidence || 0) < 80) return false;
    const bb = face.boundingBox || {};
    const area = (bb.Width || 0) * (bb.Height || 0);
    if (area < 0.006) return false;

    const cx = (bb.Left || 0) + (bb.Width || 0) / 2;
    const cy = (bb.Top || 0) + (bb.Height || 0) / 2;
    const edgeMargin = Math.min(cx, cy, 1 - cx, 1 - cy);
    if (edgeMargin < 0.09) return false;

    return true;
  });
}
