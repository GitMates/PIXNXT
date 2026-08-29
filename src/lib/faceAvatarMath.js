/** Shared bbox math for client avatar crops (mirrors server faceUtils). */
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
