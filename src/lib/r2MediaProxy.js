import { R2_PUBLIC_URL } from './r2';

/** Same-origin path — avoids R2 CORS blocking programmatic downloads in the browser. */
export const R2_MEDIA_PROXY_PREFIX = '/api/r2-media/';

/**
 * Rewrite a public R2 URL to the app proxy (dev: Vite proxy, prod: Vercel serverless).
 * Prefer direct R2 URLs for canvas/CSS when the bucket already sends CORS for pixnxt.in.
 * /api/r2-media/[...path] has been 404 on production and blanked book-wrap covers —
 * keep this helper for ZIP/Drive downloads and as a canvas load fallback.
 */
function toProxyUrl(pathAndQuery) {
  const normalized = pathAndQuery.replace(/^\//, '');
  if (!normalized) return '';
  // Query form is more reliable than /api/r2-media/[...path] on Vite+Vercel.
  const qIdx = normalized.indexOf('?');
  const pathPart = qIdx >= 0 ? normalized.slice(0, qIdx) : normalized;
  const extraQuery = qIdx >= 0 ? normalized.slice(qIdx + 1) : '';
  const params = new URLSearchParams();
  params.set('path', pathPart);
  if (extraQuery) {
    const extra = new URLSearchParams(extraQuery);
    extra.forEach((value, key) => params.set(key, value));
  }
  return `/api/r2-media?${params.toString()}`;
}

export function getProxiedMediaFetchUrl(url) {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  if (trimmed.startsWith(R2_MEDIA_PROXY_PREFIX) || trimmed.startsWith('/api/r2-media?')) {
    return trimmed;
  }

  const base = R2_PUBLIC_URL ? R2_PUBLIC_URL.replace(/\/+$/, '') : '';
  if (!base) return trimmed;

  if (trimmed.startsWith(base)) {
    const pathAndQuery = trimmed.slice(base.length).replace(/^\//, '');
    return pathAndQuery ? toProxyUrl(pathAndQuery) : trimmed;
  }

  /* Storage path only (no scheme) — still route through same-origin proxy */
  if (!/^https?:\/\//i.test(trimmed)) {
    return toProxyUrl(trimmed);
  }

  return trimmed;
}

/** Direct public URL for <img> / CSS backgrounds (never the media proxy). */
export function getDisplayMediaUrl(url) {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('/api/r2-media?')) {
    try {
      const params = new URL(trimmed, 'https://www.pixnxt.in').searchParams;
      const path = params.get('path');
      const base = R2_PUBLIC_URL ? R2_PUBLIC_URL.replace(/\/+$/, '') : '';
      if (path && base) return `${base}/${path.replace(/^\//, '')}`;
    } catch {
      /* fall through */
    }
  }
  if (!trimmed.startsWith(R2_MEDIA_PROXY_PREFIX)) return trimmed;

  const base = R2_PUBLIC_URL ? R2_PUBLIC_URL.replace(/\/+$/, '') : '';
  if (!base) return trimmed;
  const rest = trimmed.slice(R2_MEDIA_PROXY_PREFIX.length).replace(/^\//, '');
  if (!rest) return trimmed;
  try {
    return `${base}/${rest
      .split('/')
      .map((seg) => decodeURIComponent(seg))
      .join('/')}`;
  } catch {
    return `${base}/${rest}`;
  }
}
