import { apiBase } from './api/client';
import { R2_PUBLIC_URL } from './r2';
import { isPlatformHost } from './customDomain';
import { albumStoragePathCandidates, storagePathFromUrlOrPath } from '../components/smart-albums/albumStoragePathHeal';

const LEGACY_PROXY_QUERY = '/api/r2-media?';
const LEGACY_PROXY_PATH = '/api/r2-media/';
const WORKER_MEDIA_PATH = '/v1/r2/media';

/**
 * Prefer the Worker media proxy for cross-origin canvas / WebGL reads.
 * Custom domains are not on the R2 bucket CORS allowlist. Localhost / Vite
 * also fail often: bucket policy may omit the port, and a prior non-CORS
 * <img> cache entry for the same R2 URL blocks later crossOrigin loads.
 */
export function shouldPreferR2MediaProxy() {
  if (typeof window === 'undefined') return false;
  const host = String(window.location.hostname || '')
    .toLowerCase()
    .split(':')[0];
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost')) {
    return true;
  }
  return !isPlatformHost(host);
}

/** Worker media proxy base (GET /v1/r2/media), or '' when VITE_API_URL is unavailable. */
function mediaProxyBase() {
  try {
    return `${apiBase()}${WORKER_MEDIA_PATH}`;
  } catch {
    return '';
  }
}

/** Split an existing media-proxy URL (legacy /api/r2-media or Worker /v1/r2/media) into { path, query }. */
function parseProxyUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.indexOf(LEGACY_PROXY_QUERY) >= 0) {
    try {
      const parsed = new URL(trimmed, 'https://www.pixnxt.in');
      const path = parsed.searchParams.get('path');
      if (!path) return null;
      parsed.searchParams.delete('path');
      return { path, query: parsed.searchParams.toString() };
    } catch {
      return null;
    }
  }
  if (trimmed.startsWith(LEGACY_PROXY_PATH)) {
    const rest = trimmed.slice(LEGACY_PROXY_PATH.length);
    if (!rest) return null;
    const qIdx = rest.indexOf('?');
    return {
      path: qIdx >= 0 ? rest.slice(0, qIdx) : rest,
      query: qIdx >= 0 ? rest.slice(qIdx + 1) : '',
    };
  }

  if (trimmed.indexOf(WORKER_MEDIA_PATH) >= 0) {
    try {
      const parsed = new URL(trimmed, 'https://www.pixnxt.in');
      const queryPath = parsed.searchParams.get('path');
      if (queryPath) {
        parsed.searchParams.delete('path');
        return { path: queryPath, query: parsed.searchParams.toString() };
      }
      const prefix = `${WORKER_MEDIA_PATH}/`;
      const idx = parsed.pathname.indexOf(prefix);
      if (idx < 0) return null;
      const rest = parsed.pathname.slice(idx + prefix.length);
      if (!rest) return null;
      return { path: decodeURIComponent(rest), query: parsed.searchParams.toString() };
    } catch {
      return null;
    }
  }
  return null;
}

/** Rewrite an R2 key (+ carried query such as download=1) to a Worker media proxy URL. */
function toProxyUrl(pathAndQuery) {
  const base = mediaProxyBase();
  if (!base) return '';
  const normalized = String(pathAndQuery).replace(/^\//, '');
  if (!normalized) return '';
  const qIdx = normalized.indexOf('?');
  const pathPart = qIdx >= 0 ? normalized.slice(0, qIdx) : normalized;
  if (!pathPart) return '';
  const extraQuery = qIdx >= 0 ? normalized.slice(qIdx + 1) : '';
  const params = new URLSearchParams();
  params.set('path', pathPart);
  if (extraQuery) {
    new URLSearchParams(extraQuery).forEach((value, key) => params.set(key, value));
  }
  return `${base}?${params.toString()}`;
}

/**
 * Fetch URL for canvas, WebGL, audio, and other cross-origin reads.
 * Proxies on custom domains and localhost; direct R2 on production platform hosts.
 */
export function resolveCrossOriginMediaUrl(url) {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return trimmed;
  if (shouldPreferR2MediaProxy()) {
    return getProxiedMediaFetchUrl(trimmed);
  }
  return trimmed;
}

const crossOriginImageCache = new Map();
const crossOriginImagePending = new Map();

function loadCrossOriginImageOnce(url) {
  const cached = crossOriginImageCache.get(url);
  if (cached) return Promise.resolve(cached);

  const inflight = crossOriginImagePending.get(url);
  if (inflight) return inflight;

  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    if (!url.startsWith('blob:') && !url.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      crossOriginImageCache.set(url, img);
      crossOriginImagePending.delete(url);
      resolve(img);
    };
    img.onerror = (err) => {
      crossOriginImagePending.delete(url);
      reject(err);
    };
    img.src = url;
  });
  crossOriginImagePending.set(url, promise);
  return promise;
}

/**
 * Load an image for canvas / 3D with crossOrigin=anonymous.
 * Always try the Worker media proxy first — that response carries ACAO and
 * uses a different URL than display <img> tags, avoiding tainted HTTP cache
 * entries from non-CORS loads of the same R2 object.
 * Falls back to direct R2 + alternate key spellings (mangled `-jpg` vs `.jpg`).
 */
export function loadCrossOriginImage(src) {
  if (!src || typeof src !== 'string') {
    return Promise.reject(new Error('Missing image src'));
  }
  if (src.startsWith('blob:') || src.startsWith('data:')) {
    return loadCrossOriginImageOnce(src);
  }

  const path = storagePathFromUrlOrPath(src, R2_PUBLIC_URL);
  const pathCandidates = path ? albumStoragePathCandidates(path) : [];
  const base = R2_PUBLIC_URL ? String(R2_PUBLIC_URL).replace(/\/+$/, '') : '';
  const urlCandidates = [];
  const pushUrl = (url) => {
    if (url && !urlCandidates.includes(url)) urlCandidates.push(url);
  };
  pushUrl(src);
  for (const candidate of pathCandidates) {
    if (base) pushUrl(`${base}/${candidate}`);
  }

  const ordered = [];
  const pushOrdered = (url) => {
    if (url && !ordered.includes(url)) ordered.push(url);
  };
  for (const url of urlCandidates) {
    pushOrdered(getProxiedMediaFetchUrl(url));
    pushOrdered(url);
  }

  return (async () => {
    let lastErr = null;
    for (const url of ordered) {
      try {
        return await loadCrossOriginImageOnce(url);
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('Image failed to load');
  })();
}

/**
 * Rewrite a public R2 URL to the Worker media proxy (GET /v1/r2/media).
 * Prefer direct R2 URLs for canvas/CSS when the bucket already sends CORS for pixnxt.in.
 * Used for ZIP/Drive downloads and as a canvas load fallback.
 */
export function getProxiedMediaFetchUrl(url) {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  const proxied = parseProxyUrl(trimmed);
  if (proxied) {
    const rebuilt = toProxyUrl(proxied.query ? `${proxied.path}?${proxied.query}` : proxied.path);
    return rebuilt || trimmed;
  }

  const base = R2_PUBLIC_URL ? R2_PUBLIC_URL.replace(/\/+$/, '') : '';
  if (base && trimmed.startsWith(base)) {
    const pathAndQuery = trimmed.slice(base.length).replace(/^\//, '');
    return pathAndQuery ? toProxyUrl(pathAndQuery) || trimmed : trimmed;
  }

  /* Storage path only (no scheme) — still route through the media proxy */
  if (!/^https?:\/\//i.test(trimmed)) {
    return toProxyUrl(trimmed) || trimmed;
  }

  return trimmed;
}

/** Direct public URL for <img> / CSS backgrounds (never the media proxy). */
export function getDisplayMediaUrl(url) {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  const proxied = parseProxyUrl(trimmed);
  if (!proxied) return trimmed;

  const base = R2_PUBLIC_URL ? R2_PUBLIC_URL.replace(/\/+$/, '') : '';
  if (!base) return trimmed;
  const path = proxied.path.replace(/^\//, '');
  if (!path) return trimmed;
  try {
    return `${base}/${path
      .split('/')
      .map((seg) => decodeURIComponent(seg))
      .join('/')}`;
  } catch {
    return `${base}/${path}`;
  }
}
