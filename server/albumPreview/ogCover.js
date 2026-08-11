import { createClient } from '@supabase/supabase-js';

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

const LEATHER_PRESETS = {
  tan: { base: '#e07b32', highlight: '#f0a060', shadow: '#b85c28', text: '#8a4018' },
  sky: { base: '#1a3d66', highlight: '#2a5588', shadow: '#0f2844', text: '#f4f0ea' },
  cream: { base: '#f8f8f8', highlight: '#ffffff', shadow: '#d6d6d6', text: '#6e6e6e' },
  charcoal: { base: '#3a3a3a', highlight: '#525252', shadow: '#222222', text: '#f4f0ea' },
  burgundy: { base: '#7a4f2a', highlight: '#a87248', shadow: '#523218', text: '#f4f0ea' },
};

export function getRequestOrigin(req) {
  const fromEnv = process.env.VITE_PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL || '';
  if (fromEnv) return String(fromEnv).replace(/\/$/, '');
  const forwardedProto = req.headers['x-forwarded-proto'];
  const host = req.headers.host;
  if (host) return `${forwardedProto || 'https'}://${host}`;
  return 'https://www.pixnxt.in';
}

function createAnonClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
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

export function resolveAlbumCoverPhotoUrl(album) {
  if (!album) return null;
  const preview = album.preview_data && typeof album.preview_data === 'object' ? album.preview_data : {};
  const blankCovers = album.blank_covers === true || preview.blank_covers === true;
  if (blankCovers) return null;

  const collection = Array.isArray(preview.collection) ? preview.collection : [];
  const pages = preview.pages && typeof preview.pages === 'object' ? preview.pages : {};

  return firstImageUrl(
    album.cover_image_url,
    preview.cover_url,
    storedUrl(pages['0'], collection),
    storedUrl(pages['spread:0'], collection),
    storedUrl(pages['1'], collection),
    storedUrl(collection[0], collection)
  );
}

export function resolveAlbumCoverMeta(album) {
  const preview = album?.preview_data && typeof album.preview_data === 'object' ? album.preview_data : {};
  const presetId = String(preview.cover_color_preset || 'sky');
  const preset = LEATHER_PRESETS[presetId] || LEATHER_PRESETS.sky;
  const title = String(preview.cover_text || album?.name || 'Album').trim() || 'Album';
  const updated = preview.updated_at || album?.updated_at || album?.created_at || String(Date.now());
  return { title, preset, updated };
}

export async function loadPublicAlbum(slugOrId) {
  const key = String(slugOrId || '').trim();
  if (!key) return null;
  const supabase = createAnonClient();
  if (!supabase) throw new Error('Database is not configured');

  const columns =
    'id, name, slug, status, cover_image_url, has_covers, blank_covers, preview_data, updated_at, created_at';

  if (isUuid(key)) {
    const byId = await supabase.from('album_proofer_albums').select(columns).eq('id', key).maybeSingle();
    if (byId.error && !/uuid|invalid input syntax/i.test(byId.error.message || '')) {
      throw byId.error;
    }
    if (byId.data) return byId.data;
  }

  const bySlug = await supabase.from('album_proofer_albums').select(columns).eq('slug', key).maybeSingle();
  if (bySlug.error) throw bySlug.error;
  return bySlug.data || null;
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
  const fontSize = lines.some((line) => line.length > 22) ? 42 : lines.length > 2 ? 48 : 56;
  const startY = 315 - ((lines.length - 1) * (fontSize + 14)) / 2;
  const tspans = lines
    .map((line, index) => {
      const dy = index === 0 ? 0 : fontSize + 14;
      return `<tspan x="600" dy="${dy}">${escapeXml(line)}</tspan>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
  <defs>
    <linearGradient id="leather" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${preset.highlight}"/>
      <stop offset="42%" stop-color="${preset.base}"/>
      <stop offset="100%" stop-color="${preset.shadow}"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#leather)"/>
  <rect x="72" y="48" width="1056" height="534" fill="none" stroke="${preset.text}" stroke-opacity="0.18" stroke-width="2"/>
  <text x="600" y="${startY}" fill="${preset.text}" font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" font-weight="600" letter-spacing="4" text-anchor="middle">${tspans}</text>
</svg>`;
}

export async function rasterizeCoverImage(album) {
  const sharp = (await import('sharp')).default;
  const photoUrl = resolveAlbumCoverPhotoUrl(album);
  const { title, preset } = resolveAlbumCoverMeta(album);

  if (photoUrl) {
    try {
      let input;
      if (photoUrl.startsWith('data:image')) {
        const base64 = photoUrl.split(',')[1] || '';
        input = Buffer.from(base64, 'base64');
      } else {
        const upstream = await fetch(photoUrl, { headers: { Accept: 'image/*' } });
        if (!upstream.ok) throw new Error(`cover fetch ${upstream.status}`);
        input = Buffer.from(await upstream.arrayBuffer());
      }
      return await sharp(input)
        .rotate()
        .resize(OG_WIDTH, OG_HEIGHT, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 84, mozjpeg: true })
        .toBuffer();
    } catch (err) {
      console.error('[album-preview-cover] photo failed, using leather', err?.message || err);
    }
  }

  const svg = buildLeatherCoverSvg(title, preset);
  return sharp(Buffer.from(svg)).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
}

export { OG_WIDTH, OG_HEIGHT };
