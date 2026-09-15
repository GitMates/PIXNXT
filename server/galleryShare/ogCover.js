import { getRequestOrigin } from '../albumPreview/ogCover.js';

export { getRequestOrigin };

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

function publicStorageUrl(storagePath) {
  if (!storagePath || typeof storagePath !== 'string') return null;
  const trimmed = storagePath.trim();
  if (/^(https?:|data:image)/i.test(trimmed)) return trimmed.split('#')[0];
  return workersMediaUrl(trimmed);
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
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (/^data:image/i.test(trimmed)) return trimmed.split('#')[0];
  if (/^https?:/i.test(trimmed)) {
    const clean = trimmed.split('#')[0];
    if (clean.includes('/original/')) {
      let next = clean.replace('/original/', '/web/');
      if (!/\.jpe?g(\?|#|$)/i.test(next)) {
        next = next.replace(/(\/[^/?#]+)\.[^./?#]+/, '$1.jpg');
      }
      return next;
    }
    if (clean.includes('/thumb/')) return clean.replace('/thumb/', '/web/');
    return clean;
  }
  let key = trimmed.replace(/^\//, '').split('#')[0];
  if (!key) return null;
  if (key.includes('/original/')) {
    key = key.replace('/original/', '/web/');
    if (!/\.jpe?g(\?|#|$)/i.test(key)) {
      key = key.replace(/(\/[^/?#]+)\.[^./?#]+/, '$1.jpg');
    }
  } else if (key.includes('/thumb/')) {
    key = key.replace('/thumb/', '/web/');
  }
  return workersMediaUrl(key);
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

export async function loadPublicGallery(slugOrId, authHeader) {
  const key = decodeURIComponent(String(slugOrId || '')).trim();
  if (!key) return { collection: null, photos: [] };
  if (!getWorkersBase()) {
    console.error('[gallery-og] missing VITE_API_URL');
    return { collection: null, photos: [] };
  }
  const header =
    typeof authHeader === 'string' ? authHeader : authHeader?.headers?.authorization || null;

  let collection = null;
  try {
    const data = await fetchWorkersJson(
      `/v1/public/gallery-by-slug/${encodeURIComponent(key)}`,
      { authHeader: header }
    );
    collection = data?.gallery || null;
  } catch (err) {
    console.error('[gallery-og] gallery fetch failed', err?.message || err);
    return { collection: null, photos: [] };
  }
  if (!collection) return { collection: null, photos: [] };

  try {
    const photosData = await fetchWorkersJson(
      `/v1/public/gallery/${encodeURIComponent(collection.id)}/photos?limit=8`,
      { authHeader: header }
    );
    const photos = Array.isArray(photosData?.photos) ? photosData.photos : [];
    return { collection, photos };
  } catch (err) {
    console.error('[gallery-og] photos fetch failed', err?.message || err);
    return { collection, photos: [] };
  }
}
