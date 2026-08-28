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

/** Safe CSS background for a cover photo. Hashed cover_url values break unquoted url(). */
export function coverImageCssStyle(url, focalX = 50, focalY = 50) {
  const src = stripMediaUrlHash(url);
  if (!src) return {};
  const escaped = src.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return {
    backgroundImage: `url("${escaped}")`,
    backgroundSize: 'cover',
    backgroundPosition: `${normalizeFocalPercent(focalX)}% ${normalizeFocalPercent(focalY)}%`,
    backgroundRepeat: 'no-repeat',
  };
}

/**
 * Persistable focal 0–99.99.
 * numeric(4,2) overflows at 100; integer columns also reject 100.00.
 */
export function normalizeFocalForDb(value) {
  const n = normalizeFocalPercent(value);
  return Math.min(99.99, Math.max(0, Math.round(n * 100) / 100));
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

export function parseCoverFocalsFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const hash = url.split('#')[1];
  if (!hash) return null;
  const match = hash.match(/(?:^|&)coverFocals=([^&]+)/);
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

export function appendCoverFocalsToCoverUrl(baseUrl, focals) {
  const payload = focalsToDbPayload(focals);
  const primary = payload.desktop || payload.website || { x: 50, y: 50 };
  const withLegacy = appendFocalToCoverUrl(baseUrl, primary.x, primary.y);
  if (!withLegacy) return '';
  return `${withLegacy}&coverFocals=${encodeURIComponent(JSON.stringify(payload))}`;
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

/**
 * Visible crop region (object-fit: cover + object-position) in image space, as % of natural size.
 * Used to draw the crop guide on the delivery cover focal editor.
 */
export function computeCoverCropPercentRect(
  naturalWidth,
  naturalHeight,
  aspectRatio,
  focalX = 50,
  focalY = 50
) {
  const nw = Number(naturalWidth);
  const nh = Number(naturalHeight);
  const targetAspect = Number(aspectRatio);
  if (!nw || !nh || !targetAspect || targetAspect <= 0) return null;

  const imgAspect = nw / nh;
  let visibleW;
  let visibleH;

  if (imgAspect > targetAspect) {
    visibleH = nh;
    visibleW = nh * targetAspect;
  } else {
    visibleW = nw;
    visibleH = nw / targetAspect;
  }

  const left = (normalizeFocalPercent(focalX) / 100) * Math.max(0, nw - visibleW);
  const top = (normalizeFocalPercent(focalY) / 100) * Math.max(0, nh - visibleH);

  return {
    left: (left / nw) * 100,
    top: (top / nh) * 100,
    width: (visibleW / nw) * 100,
    height: (visibleH / nh) * 100,
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

/** Crops that each store their own cover focal (0–100). */
export const COVER_FOCAL_SURFACE_IDS = ['website', 'desktop', 'phone', 'card', 'email'];

/** Crops shown in the Delivery cover modal, matching where the photograph actually appears. */
export const COVER_FOCAL_SURFACES = [
  {
    id: 'desktop',
    label: 'Desktop cover · wide',
    kicker: 'Desktop cover · wide',
    aspect: '16 / 10',
    hint: 'Laptop hero — about 16:10. Wide and short, so a portrait loses the top and bottom. Put the point on the faces.',
  },
  {
    id: 'email',
    label: 'Email and WhatsApp preview',
    kicker: 'Email and WhatsApp preview',
    aspect: '1.91 / 1',
    hint: 'The thumbnail when this link is pasted in WhatsApp or sits in an email header. About 1.91:1 — often the first look in India.',
  },
  {
    id: 'phone',
    label: 'Phone',
    kicker: 'Phone',
    aspect: '9 / 19.5',
    hint: 'Phone cover, full-bleed, about 9:19.5. Tall and narrow, so a landscape loses the left and right. Keep the couple in frame.',
  },
  {
    id: 'card',
    label: 'Card & app icon',
    kicker: 'Card & app icon',
    aspect: '1 / 1',
    hint: 'Square 1:1 — the delivery tile in a list, and the icon if they save the gallery to the home screen. Keep the subject centred and large.',
  },
];

const DEFAULT_FOCAL_POINT = { x: 50, y: 50 };

export function parseFocalPoint(value) {
  if (!value || typeof value !== 'object') return null;
  const x = Number(value.x);
  const y = Number(value.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x: normalizeFocalPercent(x), y: normalizeFocalPercent(y) };
}

export function getDefaultCoverFocals(legacy = DEFAULT_FOCAL_POINT) {
  const point = parseFocalPoint(legacy) || { ...DEFAULT_FOCAL_POINT };
  return Object.fromEntries(COVER_FOCAL_SURFACE_IDS.map((id) => [id, { ...point }]));
}

function parseCoverFocalsJson(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') {
    if (Array.isArray(raw) || Object.keys(raw).length === 0) return null;
    return raw;
  }
  return null;
}

function applyFocalMap(target, source) {
  if (!source || typeof source !== 'object') return target;
  for (const id of COVER_FOCAL_SURFACE_IDS) {
    const point = parseFocalPoint(source[id]);
    if (point) target[id] = point;
  }
  return target;
}

/** Per-surface focals, falling back to cover_focal_x/y and #coverFocals= on cover_url. */
export function getCollectionFocals(collection) {
  const legacy = getCollectionFocal(collection);
  const out = getDefaultCoverFocals(legacy);
  applyFocalMap(out, parseCoverFocalsFromUrl(collection?.cover_url));
  applyFocalMap(out, parseCoverFocalsJson(collection?.cover_focals));
  if (!parseFocalPoint(out.website) || (out.website.x === legacy.x && out.website.y === legacy.y)) {
    if (parseFocalPoint(out.desktop)) out.website = { ...out.desktop };
  }
  return out;
}

export function getCoverFocalForSurface(collection, surfaceId) {
  const focals = getCollectionFocals(collection);
  return focals[surfaceId] || focals.website || { ...DEFAULT_FOCAL_POINT };
}

export function focalsToDbPayload(focals) {
  const src = focals && typeof focals === 'object' ? focals : {};
  const primary =
    parseFocalPoint(src.desktop) ||
    parseFocalPoint(src.website) ||
    DEFAULT_FOCAL_POINT;
  const normalized = getDefaultCoverFocals(primary);
  for (const id of COVER_FOCAL_SURFACE_IDS) {
    const point = parseFocalPoint(src[id]) || (id === 'website' ? primary : normalized[id]);
    normalized[id] = {
      x: normalizeFocalForDb(point.x),
      y: normalizeFocalForDb(point.y),
    };
  }
  if (!parseFocalPoint(src.website) && parseFocalPoint(src.desktop)) {
    normalized.website = { ...normalized.desktop };
  }
  return normalized;
}
