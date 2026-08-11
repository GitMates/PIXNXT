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
  if (/^https?:\/\//i.test(storagePath) || /^data:image/i.test(storagePath)) return storagePath;
  const base = process.env.VITE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL || '';
  if (!base) return null;
  const root = base.endsWith('/') ? base : `${base}/`;
  const key = storagePath.replace(/^\//, '');
  if (key.startsWith(root)) return key;
  return `${root}${key}`;
}

function storedUrl(stored, collection = []) {
  if (!stored) return null;
  if (typeof stored === 'string' && /^(https?:|data:image)/i.test(stored)) return stored;
  if (stored.storagePath) {
    const fromPath = publicStorageUrl(stored.storagePath);
    if (fromPath) return fromPath;
  }
  if (stored.collectionItemId) {
    const item = collection.find((entry) => entry.id === stored.collectionItemId);
    if (item?.dataUrl && /^(https?:|data:image)/i.test(item.dataUrl)) return item.dataUrl;
    const fromItem = publicStorageUrl(item?.storagePath);
    if (fromItem) return fromItem;
  }
  if (stored.dataUrl && /^(https?:|data:image)/i.test(stored.dataUrl)) return stored.dataUrl;
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

export function resolveAlbumCoverPhotoUrl(album) {
  if (!album) return null;
  const preview = normalizePreviewData(album.preview_data);
  const blankCovers = truthyFlag(album.blank_covers) || truthyFlag(preview.blank_covers);
  // Leather covers must not use pool/list photos (cover_image_url is often collection[0]).
  if (blankCovers) return null;

  const collection = Array.isArray(preview.collection) ? preview.collection : [];
  const pages = preview.pages && typeof preview.pages === 'object' ? preview.pages : {};

  return firstImageUrl(
    storedUrl(pages['spread:0'], collection),
    storedUrl(pages['0'], collection),
    album.cover_image_url,
    preview.cover_url,
    storedUrl(pages['1'], collection)
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
  const updated =
    preview.updated_at || album?.updated_at || album?.created_at || String(Date.now());
  return { title, preset, updated, presetId };
}

export function albumCoverImageUrl(origin, slug, updated) {
  const encodedSlug = encodeURIComponent(String(slug || '').trim());
  const cacheKey = encodeURIComponent(String(updated || Date.now()).replace(/[^\w.-]/g, ''));
  return `${origin}/album-preview/${encodedSlug}/cover.jpg?v=${cacheKey}`;
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

export function buildLeatherCoverSvg(title, preset) {
  const lines = wrapTitleLines(title);
  const fontSize = lines.some((line) => line.length > 22) ? 52 : lines.length > 2 ? 58 : 68;
  const startY = 600 - ((lines.length - 1) * (fontSize + 18)) / 2;
  const tspans = lines
    .map((line, index) => {
      const dy = index === 0 ? 0 : fontSize + 18;
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
  <rect x="90" y="90" width="1020" height="1020" fill="none" stroke="${preset.text}" stroke-opacity="0.22" stroke-width="3"/>
  <text x="600" y="${startY}" fill="${preset.text}" font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" font-weight="600" letter-spacing="6" text-anchor="middle">${tspans}</text>
</svg>`;
}
