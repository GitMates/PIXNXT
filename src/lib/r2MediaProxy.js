import { apiBase } from './api/client';
import { R2_PUBLIC_URL } from './r2';
import { isPlatformHost } from './customDomain';

const LEGACY_PROXY_QUERY = '/api/r2-media?';
const LEGACY_PROXY_PATH = '/api/r2-media/';
const WORKER_MEDIA_PATH = '/v1/r2/media';

/** Photographer custom domains are not on the R2 bucket CORS allowlist — route via the Worker media proxy. */
export function shouldPreferR2MediaProxy() {
  if (typeof window === 'undefined') return false;
  return !isPlatformHost(window.location.hostname);
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
 * Fetch URL for canvas, WebGL, audio, and other cross-origin reads on custom domains.
 * On pixnxt.in / localhost keeps direct R2 URLs (bucket CORS already allows those origins).
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

/** Load an image for canvas / 3D — proxy first on custom domains, direct-first on platform. */
export function loadCrossOriginImage(src) {
  if (!src || typeof src !== 'string') {
    return Promise.reject(new Error('Missing image src'));
  }
  if (src.startsWith('blob:') || src.startsWith('data:')) {
    return loadCrossOriginImageOnce(src);
  }

  if (shouldPreferR2MediaProxy()) {
    const proxied = resolveCrossOriginMediaUrl(src);
    return loadCrossOriginImageOnce(proxied).catch(() => {
      if (proxied !== src) return loadCrossOriginImageOnce(src);
      return Promise.reject(new Error('Image failed to load'));
    });
  }

  return loadCrossOriginImageOnce(src).catch(() => {
    const proxied = getProxiedMediaFetchUrl(src);
    if (!proxied || proxied === src) {
      return Promise.reject(new Error('Image failed to load'));
    }
    return loadCrossOriginImageOnce(proxied);
  });
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
