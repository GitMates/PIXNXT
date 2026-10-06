/** Rubber-band selection math for the delivery photo grid. */

export const MARQUEE_DRAG_PX = 6;

export function marqueeBox(x1, y1, x2, y2) {
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  return {
    left,
    top,
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
    right: Math.max(x1, x2),
    bottom: Math.max(y1, y2),
  };
}

export function marqueeActivated(dx, dy, threshold = MARQUEE_DRAG_PX) {
  return Math.abs(dx) > threshold || Math.abs(dy) > threshold;
}

export function rectHitsBox(rect, box) {
  if (!rect || !box) return false;
  const right = box.right ?? box.left + box.width;
  const bottom = box.bottom ?? box.top + box.height;
  return rect.left < right && rect.right > box.left && rect.top < bottom && rect.bottom > box.top;
}

export function idsHittingMarquee(items, box) {
  const ids = [];
  for (const item of items) {
    if (rectHitsBox(item.rect, box)) ids.push(item.id);
  }
  return ids;
}

export function mergeMarqueeSelection(base, hitIds, additive) {
  if (!additive) return hitIds.slice();
  const set = new Set(base || []);
  for (const id of hitIds) set.add(id);
  return [...set];
}
