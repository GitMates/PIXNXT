import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin, getSupabaseUrl } from '../photoAi/supabaseAdmin.js';
import { getRequestOrigin } from '../albumPreview/ogCover.js';

export { getRequestOrigin };

function createGalleryClient() {
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

function publicStorageUrl(storagePath) {
  if (!storagePath || typeof storagePath !== 'string') return null;
  const trimmed = storagePath.trim();
  if (/^(https?:|data:image)/i.test(trimmed)) return trimmed.split('#')[0];
  const base =
    process.env.VITE_R2_PUBLIC_URL ||
    process.env.R2_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
    '';
  if (!base) return null;
  const root = base.endsWith('/') ? base : `${base}/`;
  const key = trimmed.replace(/^\//, '').split('#')[0];
  if (key.startsWith(root)) return key;
  return `${root}${key}`;
}

function firstImageUrl(...candidates) {
  for (const value of candidates) {
    if (typeof value !== 'string') continue;
    const resolved = publicStorageUrl(value);
    if (resolved && /^(https?:|data:image)/i.test(resolved)) return resolved;
  }
  return null;
}

/** Prefer a smaller derivative so WhatsApp can fetch the image quickly. */
export function preferShareablePhotoUrl(url) {
  const resolved = publicStorageUrl(url);
  if (!resolved) return null;
  if (resolved.startsWith('data:image')) return resolved;
  if (resolved.includes('/original/')) {
    let next = resolved.replace('/original/', '/web/');
    if (!/\.jpe?g(\?|#|$)/i.test(next)) {
      next = next.replace(/(\/[^/?#]+)\.[^./?#]+/, '$1.jpg');
    }
    return next;
  }
  if (resolved.includes('/thumb/')) return resolved.replace('/thumb/', '/web/');
  return resolved;
}

function photoShareUrl(photo) {
  if (!photo || photo.is_private === true) return null;
  return preferShareablePhotoUrl(
    firstImageUrl(
      photo.watermarked_url,
      photo.web_url,
      photo.thumbnail_url,
      photo.full_url
    )
  );
}

export function galleryCoverCandidateUrls(collection, firstPhotos = []) {
  const urls = [];
  const push = (value) => {
    const resolved = preferShareablePhotoUrl(value);
    if (resolved && !urls.includes(resolved)) urls.push(resolved);
  };
  push(firstImageUrl(collection?.cover_url, collection?.cover, collection?.list_cover_url));
  for (const photo of firstPhotos) {
    push(photoShareUrl(photo));
  }
  return urls;
}

export function resolveGalleryCoverPhotoUrl(collection, firstPhotos = []) {
  return galleryCoverCandidateUrls(collection, firstPhotos)[0] || null;
}

export function resolveGalleryShareMeta(collection, firstPhotos = []) {
  const title = String(collection?.name || 'Photo gallery').trim() || 'Photo gallery';
  const photoUrl = resolveGalleryCoverPhotoUrl(collection, firstPhotos);
  const kind = photoUrl ? 'p' : 'n';
  const photoBit = photoUrl ? String(photoUrl).replace(/[^\w]/g, '').slice(-16) : 'none';
  const stamp = String(collection?.updated_at || collection?.created_at || Date.now())
    .replace(/[^\w.-]/g, '')
    .slice(0, 24);
  return { title, photoUrl, updated: `${kind}${photoBit}${stamp}` };
}

export function galleryCoverImageUrl(origin, slug, updated) {
  const encodedSlug = encodeURIComponent(String(slug || '').trim());
  const cacheKey = String(updated || Date.now()).replace(/[^\w.-]/g, '').slice(0, 40) || '1';
  return `${origin}/gallery/${encodedSlug}/og-${cacheKey}.jpg`;
}

async function selectDelivery(supabase, column, value, fields) {
  const published = await supabase
    .from('deliveries')
    .select(fields)
    .eq(column, value)
    .eq('status', 'published')
    .maybeSingle();
  if (!published.error) return { data: published.data, error: null };

  const { data, error } = await supabase
    .from('deliveries')
    .select(fields)
    .eq(column, value)
    .maybeSingle();
  if (error) {
    console.error('[gallery-og] select failed', column, fields, error.message);
    return { data: null, error };
  }
  if (data?.status && data.status !== 'published') return { data: null, error: null };
  return { data, error: null };
}

export async function loadPublicGallery(slugOrId) {
  const key = decodeURIComponent(String(slugOrId || '')).trim();
  if (!key) return { collection: null, photos: [] };
  const supabase = createGalleryClient();
  if (!supabase) {
    console.error('[gallery-og] missing Supabase env');
    return { collection: null, photos: [] };
  }

  const fullFields = 'id, name, slug, status, cover_url, updated_at, created_at';
  const lightFields = 'id, name, slug, status, cover_url';
  const lookups = /^[0-9a-f-]{36}$/i.test(key)
    ? [
        ['id', key],
        ['slug', key],
      ]
    : [['slug', key]];

  let collection = null;
  for (const [column, value] of lookups) {
    let result = await selectDelivery(supabase, column, value, fullFields);
    if (result.error) {
      result = await selectDelivery(supabase, column, value, lightFields);
    }
    if (result.data) {
      collection = result.data;
      break;
    }
  }

  if (!collection && !/^[0-9a-f-]{36}$/i.test(key)) {
    const { data } = await supabase
      .from('deliveries')
      .select(fullFields)
      .ilike('slug', key)
      .eq('status', 'published')
      .maybeSingle();
    collection = data || null;
  }

  if (!collection) return { collection: null, photos: [] };

  let photos = [];
  const { data, error } = await supabase
    .from('photos')
    .select('web_url, thumbnail_url, full_url, watermarked_url, is_private, position, created_at')
    .eq('collection_id', collection.id)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(8);
  if (error) {
    const fallback = await supabase
      .from('photos')
      .select('web_url, thumbnail_url, full_url, position, created_at')
      .eq('collection_id', collection.id)
      .order('position', { ascending: true })
      .limit(8);
    photos = fallback.data || [];
  } else {
    photos = data || [];
  }

  return { collection, photos };
}
