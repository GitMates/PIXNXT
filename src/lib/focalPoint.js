/**
 * Focal point helpers for cover photos (DB: cover_focal_x / cover_focal_y, optional #focal= hash on cover_url).
 */

export function stripMediaUrlHash(url) {
  if (!url || typeof url !== 'string') return '';
  return url.split('#')[0];
}

export function parseFocalFromCoverUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/#focal=([\d.]+),([\d.]+)/);
  if (!match) return null;
  const x = parseFloat(match[1]);
  const y = parseFloat(match[2]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

/** Read focal from collection row (supports legacy focal_x / focal_y if present). */
export function getCollectionFocal(collection) {
  const rawX = collection?.cover_focal_x ?? collection?.focal_x;
  const rawY = collection?.cover_focal_y ?? collection?.focal_y;
  if (rawX != null && rawY != null) {
    const x = Number(rawX);
    const y = Number(rawY);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return { x, y };
    }
  }
  const fromUrl = parseFocalFromCoverUrl(collection?.cover_url);
  if (fromUrl) return fromUrl;
  return { x: 50, y: 50 };
}

/** True when Supabase/PostgREST rejects an unknown column (migration not applied yet). */
export function isMissingDbColumnError(err, columnHint = 'cover_focal') {
  const msg = `${err?.message || ''} ${err?.details || ''} ${err?.hint || ''}`.toLowerCase();
  const hint = String(columnHint).toLowerCase();
  return (
    err?.code === 'PGRST204' ||
    (msg.includes('column') && msg.includes(hint)) ||
    msg.includes('schema cache')
  );
}

export function normalizeFocalPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.round(Math.max(0, Math.min(100, n)) * 10) / 10;
}

/** Integer 0–100 for DB columns (safe for numeric(5,2) and smallint). */
export function normalizeFocalForDb(value) {
  return Math.round(normalizeFocalPercent(value));
}

/** Postgres 22003 / Supabase "numeric field overflow" (e.g. numeric(4,2) cannot store 100). */
export function isNumericOverflowError(err) {
  const msg = `${err?.message || ''} ${err?.details || ''}`.toLowerCase();
  return err?.code === '22003' || msg.includes('numeric field overflow') || msg.includes('numeric value out of range');
}

export function appendFocalToCoverUrl(baseUrl, x, y) {
  const base = stripMediaUrlHash(baseUrl);
  if (!base) return '';
  const fx = normalizeFocalPercent(x);
  const fy = normalizeFocalPercent(y);
  return `${base}#focal=${fx},${fy}`;
}

/** Visible image area when img uses object-fit: contain inside its layout box. */
export function getRenderedImageContentRect(img) {
  const rect = img.getBoundingClientRect();
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  if (!nw || !nh || rect.width <= 0 || rect.height <= 0) {
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  }

  const imageAspect = nw / nh;
  const boxAspect = rect.width / rect.height;

  if (imageAspect > boxAspect) {
    const w = rect.width;
    const h = rect.width / imageAspect;
    return {
      left: rect.left,
      top: rect.top + (rect.height - h) / 2,
      width: w,
      height: h,
    };
  }

  const h = rect.height;
  const w = rect.height * imageAspect;
  return {
    left: rect.left + (rect.width - w) / 2,
    top: rect.top,
    width: w,
    height: h,
  };
}

/** Map pointer position to focal percentages on the actual photo (not letterbox padding). */
export function focalPointFromPointer(clientX, clientY, img) {
  const r = getRenderedImageContentRect(img);
  if (r.width <= 0 || r.height <= 0) {
    return { x: 50, y: 50 };
  }
  const x = ((clientX - r.left) / r.width) * 100;
  const y = ((clientY - r.top) / r.height) * 100;
  return {
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
  };
}

/** Position crosshair inside the img element box (object-fit: contain letterboxing). */
export function focalPercentToElementStyle(focalX, focalY, img) {
  const box = img.getBoundingClientRect();
  const content = getRenderedImageContentRect(img);
  if (box.width <= 0 || box.height <= 0) {
    return { left: `${focalX}%`, top: `${focalY}%` };
  }
  const cx = content.left + (focalX / 100) * content.width;
  const cy = content.top + (focalY / 100) * content.height;
  const left = ((cx - box.left) / box.width) * 100;
  const top = ((cy - box.top) / box.height) * 100;
  return { left: `${left}%`, top: `${top}%` };
}
