import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin, getSupabaseUrl } from '../photoAi/supabaseAdmin.js';

/** Square JPEG — fills the WhatsApp share thumbnail (the N-logo slot). */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 1200;

const LEATHER_PRESETS = {
  tan: { base: '#e07b32', highlight: '#f0a060', shadow: '#b85c28', text: '#8a4018' },
  sky: { base: '#1a3d66', highlight: '#2a5588', shadow: '#0f2844', text: '#8eb8dc' },
  cream: { base: '#f8f8f8', highlight: '#ffffff', shadow: '#d6d6d6', text: '#6e6e6e' },
  charcoal: { base: '#3a3a3a', highlight: '#525252', shadow: '#222222', text: '#f4f0ea' },
  burgundy: { base: '#7a4f2a', highlight: '#a87248', shadow: '#523218', text: '#f4f0ea' },
};

export function getRequestOrigin(req) {
  const forwardedProto = req.headers?.['x-forwarded-proto'];
  const host = req.headers?.host;
  if (host) return `${forwardedProto || 'https'}://${host}`;
  const fromEnv = process.env.VITE_PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL || '';
  if (fromEnv) return String(fromEnv).replace(/\/$/, '');
  return 'https://www.pixnxt.in';
}

function createAlbumClient() {
  const admin = getSupabaseAdmin();
  if (admin) return admin;

  const supabaseUrl = getSupabaseUrl() || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return null;
  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '')
  );
}

function publicStorageUrl(storagePath) {
  if (!storagePath || typeof storagePath !== 'string') return null;
  if (/^(https?:|data:image)/i.test(storagePath)) return storagePath;
  const base =
    process.env.VITE_R2_PUBLIC_URL ||
    process.env.R2_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
    '';
  if (!base) return null;
  const root = base.endsWith('/') ? base : `${base}/`;
  const key = storagePath.replace(/^\//, '');
  if (key.startsWith(root)) return key;
  return `${root}${key}`;
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

  const listed = firstImageUrl(album.cover_image_url, preview.cover_url);
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
  const presetId =
    typeof presetRaw === 'string'
      ? presetRaw
      : String(presetRaw?.id || presetRaw?.presetId || 'sky');
  const preset = LEATHER_PRESETS[presetId] || LEATHER_PRESETS.sky;
  const title = String(preview.cover_text || album?.name || 'Album').trim() || 'Album';
  const photoUrl = resolveAlbumCoverPhotoUrl(album);
  const kind = photoUrl ? 'p' : 'l';
  const photoBit = photoUrl ? String(photoUrl).replace(/[^\w]/g, '').slice(-16) : 'none';
  const stamp = String(preview.updated_at || album?.updated_at || album?.created_at || Date.now())
    .replace(/[^\w.-]/g, '')
    .slice(0, 24);
  return { title, preset, updated: `${kind}${photoBit}${stamp}`, presetId, photoUrl };
}

export function albumCoverImageUrl(origin, slug, updated) {
  const encodedSlug = encodeURIComponent(String(slug || '').trim());
  const cacheKey = String(updated || Date.now()).replace(/[^\w.-]/g, '').slice(0, 40) || '1';
  return `${origin}/album-preview/${encodedSlug}/og-${cacheKey}.jpg`;
}

async function selectAlbum(supabase, column, value, fields) {
  const { data, error } = await supabase
    .from('album_proofer_albums')
    .select(fields)
    .eq(column, value)
    .maybeSingle();
  if (error) {
    console.error('[album-preview-og] select failed', column, fields, error.message);
    return { data: null, error };
  }
  return { data, error: null };
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

export async function loadPublicAlbum(slugOrId) {
  const key = decodeURIComponent(String(slugOrId || '')).trim();
  if (!key) return null;
  const supabase = createAlbumClient();
  if (!supabase) {
    console.error('[album-preview-og] missing Supabase env');
    return null;
  }

  // Same query the public preview uses. Never select has_covers/blank_covers —
  // those are preview_data keys, not table columns (that 500'd the live cover API).
  const fullFields = 'id, name, slug, status, cover_image_url, preview_data, updated_at, created_at';
  const lightFields = 'id, name, slug, status, cover_image_url, updated_at, created_at';

  const lookups = isUuid(key)
    ? [
        ['id', key],
        ['slug', key],
      ]
    : [['slug', key]];

  for (const [column, value] of lookups) {
    let result = await selectAlbum(supabase, column, value, '*');
    if (result.error) {
      result = await selectAlbum(supabase, column, value, fullFields);
    }
    if (result.error) {
      result = await selectAlbum(supabase, column, value, lightFields);
    }
    if (result.data) return hydrateAlbum(result.data);
  }

  return null;
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

function leatherTitleFill(preset) {
  const base = String(preset?.base || '').toLowerCase();
  const light =
    base === '#f8f8f8' || base === '#e07b32' || base === '#f0ebe0' || base === '#ffffff';
  return light ? '#3a2a1a' : '#f4f0ea';
}

/** 5×7 glyphs — no system fonts (Vercel has no Georgia, so SVG <text> was blank). */
const GLYPHS = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
};

function glyphRects(text, originX, originY, cell, fill) {
  const rows = 7;
  const cols = 5;
  const advance = (cols + 1) * cell;
  let x = originX;
  const rects = [];
  for (const raw of String(text || '').toUpperCase()) {
    if (raw === ' ') {
      x += advance;
      continue;
    }
    const glyph = GLYPHS[raw];
    if (!glyph) {
      x += advance;
      continue;
    }
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (glyph[r][c] !== '1') continue;
        rects.push(
          `<rect x="${x + c * cell}" y="${originY + r * cell}" width="${cell}" height="${cell}" fill="${fill}"/>`
        );
      }
    }
    x += advance;
  }
  return rects.join('');
}

function titleGlyphMarkup(title, fill) {
  const lines = wrapTitleLines(title, 16);
  const longest = Math.max(...lines.map((line) => line.length), 1);
  const cell = longest > 16 ? 9 : longest > 12 ? 11 : 13;
  const advance = 6 * cell;
  const lineHeight = 9 * cell;
  const blockH = lines.length * lineHeight - 2 * cell;
  const startY = 600 - blockH / 2;
  return lines
    .map((line, index) => {
      const width = line.replace(/ /g, ' ').length * advance - cell;
      const x = Math.round(600 - width / 2);
      const y = Math.round(startY + index * lineHeight);
      return glyphRects(line, x, y, cell, fill);
    })
    .join('');
}

export function buildLeatherCoverSvg(title, preset) {
  const fill = leatherTitleFill(preset);
  const glyphs = titleGlyphMarkup(title, fill);
  const lines = wrapTitleLines(title, 16);
  const longest = Math.max(...lines.map((line) => line.length), 1);
  const fontSize = longest > 16 ? 52 : longest > 12 ? 60 : 70;
  const lineGap = fontSize + 18;
  const startY = 600 - ((lines.length - 1) * lineGap) / 2;
  const tspans = lines
    .map((line, index) => {
      const dy = index === 0 ? 0 : lineGap;
      return `<tspan x="600" dy="${dy}">${escapeXml(line)}</tspan>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
  <defs>
    <linearGradient id="leather" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${preset.highlight}"/>
      <stop offset="45%" stop-color="${preset.base}"/>
      <stop offset="100%" stop-color="${preset.shadow}"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#leather)"/>
  <rect x="72" y="72" width="1056" height="1056" fill="none" stroke="${fill}" stroke-opacity="0.28" stroke-width="4"/>
  ${glyphs}
  <text x="600" y="${startY}" fill="${fill}" stroke="${preset.shadow}" stroke-width="8" stroke-linejoin="round" paint-order="stroke fill" font-family="Times New Roman, Times, Liberation Serif, DejaVu Serif, Georgia, serif" font-size="${fontSize}" font-weight="600" letter-spacing="6" text-anchor="middle">${tspans}</text>
</svg>`;
}
