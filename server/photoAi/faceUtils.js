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

/** Expand Rekognition bbox so avatars show full face (forehead/chin), not a tight clip. */
export function expandBoundingBoxForDisplay(bb, padRatio = 0.45) {
  if (!bb) return bb;
  const left = bb.Left ?? 0;
  const top = bb.Top ?? 0;
  const width = bb.Width ?? 0.2;
  const height = bb.Height ?? 0.2;
  const padW = width * padRatio;
  const padH = height * padRatio;
  const x1 = Math.max(0, left - padW);
  const y1 = Math.max(0, top - padH);
  const x2 = Math.min(1, left + width + padW);
  const y2 = Math.min(1, top + height + padH);
  return { Left: x1, Top: y1, Width: x2 - x1, Height: y2 - y1 };
}

export function isGoodAvatarFace(entry) {
  const bb = entry?.boundingBox || {};
  const width = bb.Width || 0;
  const height = bb.Height || 0;
  const area = width * height;
  if (!area || (entry.confidence || 0) < 80) return false;

  const cx = (bb.Left || 0) + width / 2;
  const cy = (bb.Top || 0) + height / 2;
  const edgeMargin = Math.min(cx, cy, 1 - cx, 1 - cy);
  if (edgeMargin < 0.14) return false;

  const aspect = width / Math.max(height, 0.001);
  if (aspect < 0.45 || aspect > 1.8) return false;

  return area >= 0.008;
}

/**
 * Score a detected face for use as the cluster avatar thumbnail.
 * Prefers confident, centered, medium-sized frontal faces over edge partials.
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
  if (edgeMargin < 0.06) edgeScore = 0.15;
  else if (edgeMargin < 0.12) edgeScore = 0.45;
  else if (edgeMargin < 0.18) edgeScore = 0.75;

  let sizeScore = 1;
  if (area < 0.012) sizeScore = area / 0.012;
  else if (area > 0.4) sizeScore = 0.4 / area;

  const aspect = width / Math.max(height, 0.001);
  const aspectScore = aspect >= 0.55 && aspect <= 1.6 ? 1 : 0.55;

  const centerScore = 1 - Math.hypot(cx - 0.5, cy - 0.5) * 0.35;

  return area * confidence * edgeScore * sizeScore * aspectScore * centerScore;
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
