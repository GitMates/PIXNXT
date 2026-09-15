import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Embedded serif — Sharp/librsvg has no Georgia on Vercel. */
let frauncesFontBase64 = null;
function getFrauncesFontBase64() {
  if (frauncesFontBase64) return frauncesFontBase64;
  const candidates = [
    path.join(process.cwd(), 'public', 'fonts', 'Fraunces-Var-latin.woff2'),
    path.join(__dirname, '..', '..', 'public', 'fonts', 'Fraunces-Var-latin.woff2'),
  ];
  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) {
        frauncesFontBase64 = fs.readFileSync(file).toString('base64');
        return frauncesFontBase64;
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

/** Square JPEG — fills the WhatsApp share thumbnail (the N-logo slot). */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 1200;

const LEATHER_PRESETS = {
  tan: { base: '#e07b32', highlight: '#f0a060', shadow: '#b85c28', text: '#8a4018' },
  sky: { base: '#1a3d66', highlight: '#2a5588', shadow: '#0f2844', text: '#8eb8dc' },
  cream: { base: '#f8f8f8', highlight: '#ffffff', shadow: '#d6d6d6', text: '#6e6e6e' },
  charcoal: { base: '#3a3a3a', highlight: '#525252', shadow: '#222222', text: '#141414' },
  burgundy: { base: '#7a4f2a', highlight: '#a87248', shadow: '#523218', text: '#3d2410' },
};

const VALID_PRESET_IDS = new Set(Object.keys(LEATHER_PRESETS));

export function getRequestOrigin(req) {
  const forwardedProto = req.headers?.['x-forwarded-proto'];
  const host = req.headers?.host;
  if (host) return `${forwardedProto || 'https'}://${host}`;
  const fromEnv = process.env.VITE_PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL || '';
  if (fromEnv) return String(fromEnv).replace(/\/$/, '');
  return 'https://www.pixnxt.in';
}

function getWorkersBase() {
  const base =
    process.env.VITE_API_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || '';
  return String(base || '').trim().replace(/\/+$/, '');
}

function workersMediaUrl(storagePath) {
  const base = getWorkersBase();
  if (!base) return null;
  const key = String(storagePath || '').trim().replace(/^\//, '').split('#')[0];
  if (!key) return null;
  return `${base}/v1/r2/media?path=${encodeURIComponent(key)}`;
}

async function fetchWorkersJson(path, { timeoutMs = 5000, authHeader } = {}) {
  const base = getWorkersBase();
  if (!base) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = { Accept: 'application/json' };
    if (authHeader) headers.Authorization = authHeader;
    const res = await fetch(`${base}${path}`, { headers, signal: controller.signal });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '')
  );
}

function publicStorageUrl(storagePath) {
  if (!storagePath || typeof storagePath !== 'string') return null;
  const trimmed = storagePath.trim();
  if (/^(https?:|data:image)/i.test(trimmed)) return trimmed.split('#')[0];
  return workersMediaUrl(trimmed);
}

function storedUrl(stored, collection = []) {
  if (!stored) return null;
  if (typeof stored === 'string') {
    if (/^(https?:|data:image)/i.test(stored)) return stored;
    const byId = collection.find((entry) => entry?.id === stored);
    return byId ? storedUrl(byId, collection) : publicStorageUrl(stored);
  }
  if (stored.storagePath) {
    const fromPath = publicStorageUrl(stored.storagePath);
    if (fromPath) return fromPath;
  }
  const linkedId = stored.collectionItemId || stored.id;
  if (linkedId) {
    const item = collection.find((entry) => entry?.id === linkedId);
    if (item && item !== stored) {
      const fromItem = storedUrl(item, collection);
      if (fromItem) return fromItem;
    }
  }
  for (const key of ['dataUrl', 'url', 'src', 'publicUrl', 'full_url', 'cover_url']) {
    const value = stored[key];
    if (typeof value === 'string' && /^(https?:|data:image)/i.test(value)) return value;
  }
  return null;
}

function firstImageUrl(...candidates) {
  for (const value of candidates) {
    if (typeof value === 'string' && /^(https?:|data:image)/i.test(value)) return value;
  }
  return null;
}

function truthyFlag(value) {
  return value === true || value === 'true';
}

export function normalizePreviewData(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' ? raw : {};
}

function pageStored(pages, key) {
  if (!pages || typeof pages !== 'object') return null;
  if (pages[key] != null) return pages[key];
  const match = Object.keys(pages).find((k) => k.toLowerCase() === String(key).toLowerCase());
  return match ? pages[match] : null;
}

function coverWrapItemUrl(collection) {
  const wrap = collection.find((item) => item?.role === 'cover-wrap' || item?.role === 'cover_wrap');
  return storedUrl(wrap, collection);
}

export function resolveAlbumCoverPhotoUrl(album) {
  if (!album) return null;
  const preview = normalizePreviewData(album.preview_data);
  const collection = Array.isArray(preview.collection) ? preview.collection : [];
  const pages = preview.pages && typeof preview.pages === 'object' ? preview.pages : {};
  const innerPhotos = collection.filter(
    (item) => item?.role !== 'cover-wrap' && item?.role !== 'cover_wrap'
  );

  // Any album: a photo actually placed on the cover wrap always wins (leather or photo cover).
  const placedCover = firstImageUrl(
    storedUrl(pageStored(pages, 'spread:0'), collection),
    storedUrl(pageStored(pages, '0'), collection),
    coverWrapItemUrl(collection)
  );
  if (placedCover) return placedCover;

  const listed =
    firstImageUrl(album.cover_image_url, preview.cover_url) ||
    publicStorageUrl(album.cover_image_url) ||
    publicStorageUrl(preview.cover_url);
  const blankCovers = truthyFlag(album.blank_covers) || truthyFlag(preview.blank_covers);
  if (blankCovers) {
    const innerFirst = storedUrl(innerPhotos[0], collection);
    // Uploaded wrap often lands in cover_image_url while blank_covers stays true.
    if (listed && listed !== innerFirst) return listed;
    return null;
  }

  return firstImageUrl(
    listed,
    storedUrl(pageStored(pages, '1'), collection),
    storedUrl(innerPhotos[0], collection)
  );
}

export function resolveAlbumCoverMeta(album) {
  const preview = normalizePreviewData(album?.preview_data);
  const presetRaw = preview.cover_color_preset;
  const presetIdRaw =
    typeof presetRaw === 'string'
      ? presetRaw
      : String(presetRaw?.id || presetRaw?.presetId || 'sky');
  const presetId = VALID_PRESET_IDS.has(presetIdRaw) ? presetIdRaw : 'sky';
  const preset = LEATHER_PRESETS[presetId];
  const title = String(preview.cover_text || album?.name || 'Album').trim() || 'Album';
  const photoUrl = resolveAlbumCoverPhotoUrl(album);
  const kind = photoUrl ? 'p' : 'l';
  const photoBit = photoUrl ? String(photoUrl).replace(/[^\w]/g, '').slice(-16) : 'none';
  const stamp = String(preview.updated_at || album?.updated_at || album?.created_at || Date.now())
    .replace(/[^\w.-]/g, '')
    .slice(0, 24);
  return { title, preset, updated: `${kind}${presetId}${photoBit}${stamp}`, presetId, photoUrl };
}

export function albumCoverImageUrl(origin, slug, updated) {
  const encodedSlug = encodeURIComponent(String(slug || '').trim());
  const cacheKey = String(updated || Date.now()).replace(/[^\w.-]/g, '').slice(0, 40) || '1';
  return `${origin}/album-preview/${encodedSlug}/og-${cacheKey}.jpg`;
}

export async function loadPublicAlbum(slugOrId, authHeader) {
  const key = decodeURIComponent(String(slugOrId || '')).trim();
  if (!key) return null;
  if (!getWorkersBase()) {
    console.error('[album-preview-og] missing VITE_API_URL');
    return null;
  }
  const header =
    typeof authHeader === 'string' ? authHeader : authHeader?.headers?.authorization || null;
  try {
    const data = await fetchWorkersJson(`/v1/proofer/public/${encodeURIComponent(key)}`, {
      authHeader: header,
    });
    const album = data?.album || null;
    if (!album) return null;
    return hydrateAlbum(album);
  } catch (err) {
    console.error('[album-preview-og] fetch failed', err?.message || err);
    return null;
  }
}

function hydrateAlbum(row) {
  if (!row) return null;
  const preview = normalizePreviewData(row.preview_data);
  if (!preview.cover_text && row.cover_text) preview.cover_text = row.cover_text;
  if (preview.blank_covers == null && row.blank_covers != null) {
    preview.blank_covers = truthyFlag(row.blank_covers);
  }
  if (!preview.cover_color_preset && row.cover_color_preset) {
    preview.cover_color_preset = row.cover_color_preset;
  }
  if (!preview.cover_url && row.cover_url) preview.cover_url = row.cover_url;
  if (preview.has_covers == null && row.has_covers != null) {
    preview.has_covers = row.has_covers !== false && row.has_covers !== 'false';
  }
  return { ...row, preview_data: preview };
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapTitleLines(title, maxChars = 18) {
  const words = String(title || '')
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return ['ALBUM'];
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

function parseHexColor(hex) {
  const raw = String(hex || '').replace('#', '');
  if (raw.length !== 6) return { r: 200, g: 200, b: 200 };
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

function mixRgb(a, b, t) {
  const k = Math.max(0, Math.min(1, t));
  return {
    r: Math.round(a.r + (b.r - a.r) * k),
    g: Math.round(a.g + (b.g - a.g) * k),
    b: Math.round(a.b + (b.b - a.b) * k),
  };
}

function rgbToHex({ r, g, b }) {
  const clamp = (n) => Math.max(0, Math.min(255, n));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('')}`;
}

function grooveTitleColor(preset) {
  if (preset?.text) return preset.text;
  const baseRgb = parseHexColor(preset?.base);
  const shadowRgb = parseHexColor(preset?.shadow);
  return rgbToHex(mixRgb(baseRgb, shadowRgb, 0.68));
}

function titleFontSize(lines) {
  const longest = Math.max(...lines.map((line) => line.length), 1);
  if (longest > 22) return 42;
  if (longest > 16) return 52;
  if (longest > 12) return 60;
  return 70;
}

function buildDebossedTitleMarkup(title, preset) {
  const lines = wrapTitleLines(title, 18);
  const fontSize = titleFontSize(lines);
  const lineGap = fontSize * 1.22;
  const startY = OG_HEIGHT / 2 - ((lines.length - 1) * lineGap) / 2;
  const depth = Math.max(2, fontSize * 0.042);
  const groove = grooveTitleColor(preset);
  const baseRgb = parseHexColor(preset.base);
  const shadowFill = rgbToHex(mixRgb(baseRgb, { r: 0, g: 0, b: 0 }, 0.48));
  const strokeFill = rgbToHex(mixRgb(baseRgb, { r: 0, g: 0, b: 0 }, 0.55));

  const tspans = (dyFirst) =>
    lines
      .map((line, index) => {
        const dy = index === 0 ? dyFirst : lineGap;
        return `<tspan x="${OG_WIDTH / 2}" dy="${dy}">${escapeXml(line)}</tspan>`;
      })
      .join('');

  const fontFamily = getFrauncesFontBase64() ? 'PixNxtFraunces, Georgia, serif' : 'Georgia, serif';
  const common = `font-family="${fontFamily}" font-size="${fontSize}" font-weight="500" letter-spacing="0.08em" text-anchor="middle"`;

  return `
  <text x="${OG_WIDTH / 2 - depth * 1.1}" y="${startY - depth * 1.1}" fill="${shadowFill}" fill-opacity="0.62" ${common}>${tspans(0)}</text>
  <text x="${OG_WIDTH / 2 + depth * 0.75}" y="${startY + depth * 0.75}" fill="#ffffff" fill-opacity="0.5" ${common}>${tspans(0)}</text>
  <text x="${OG_WIDTH / 2}" y="${startY}" fill="${groove}" stroke="${strokeFill}" stroke-width="${Math.max(
    0.5,
    fontSize * 0.011
  )}" stroke-opacity="0.42" paint-order="stroke fill" ${common}>${tspans(0)}</text>`;
}

function leatherSurfaceDefs(preset) {
  const fontBase64 = getFrauncesFontBase64();
  const fontFace = fontBase64
    ? `<style>@font-face{font-family:'PixNxtFraunces';src:url('data:font/woff2;base64,${fontBase64}') format('woff2');font-weight:100 900;font-style:normal;}</style>`
    : '';

  return `${fontFace}
    <linearGradient id="leatherBase" x1="12%" y1="0%" x2="88%" y2="100%">
      <stop offset="0%" stop-color="${preset.highlight}"/>
      <stop offset="35%" stop-color="${preset.base}"/>
      <stop offset="100%" stop-color="${preset.base}"/>
    </linearGradient>
    <radialGradient id="leatherSpot" cx="36%" cy="20%" r="72%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.16)"/>
      <stop offset="40%" stop-color="rgba(255,255,255,0.05)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
    <filter id="leatherGrain" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" seed="14" result="noise"/>
      <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.28 0" result="alphaNoise"/>
      <feBlend in="SourceGraphic" in2="alphaNoise" mode="multiply"/>
    </filter>`;
}

export function buildLeatherCoverSvg(title, preset) {
  const groove = grooveTitleColor(preset);
  const titleMarkup = buildDebossedTitleMarkup(title, preset);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
  <defs>${leatherSurfaceDefs(preset)}</defs>
  <g filter="url(#leatherGrain)">
    <rect width="100%" height="100%" fill="url(#leatherBase)"/>
    <rect width="100%" height="100%" fill="url(#leatherSpot)"/>
  </g>
  <rect x="72" y="72" width="1056" height="1056" fill="none" stroke="${groove}" stroke-opacity="0.22" stroke-width="3"/>
  ${titleMarkup}
</svg>`;
}
