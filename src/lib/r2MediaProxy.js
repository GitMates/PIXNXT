import { R2_PUBLIC_URL } from './r2';

/** Same-origin path — avoids R2 CORS blocking programmatic downloads in the browser. */
export const R2_MEDIA_PROXY_PREFIX = '/api/r2-media/';

/**
 * Rewrite a public R2 URL to the app proxy (dev: Vite proxy, prod: Vercel serverless).
 * Display URLs stay direct; only download fetches use the proxy.
 */
function encodeProxyPath(pathAndQuery) {
  const qIdx = pathAndQuery.indexOf('?');
  const pathPart = qIdx >= 0 ? pathAndQuery.slice(0, qIdx) : pathAndQuery;
  const query = qIdx >= 0 ? pathAndQuery.slice(qIdx) : '';
  const encoded = pathPart
    .split('/')
    .filter((seg) => seg.length > 0)
    .map((seg) => {
      try {
        return encodeURIComponent(decodeURIComponent(seg));
      } catch {
        return encodeURIComponent(seg);
      }
    })
    .join('/');
  return `${encoded}${query}`;
}

function toProxyUrl(pathAndQuery) {
  const normalized = pathAndQuery.replace(/^\//, '');
  if (!normalized) return '';
  return `${R2_MEDIA_PROXY_PREFIX}${encodeProxyPath(normalized)}`;
}

export function getProxiedMediaFetchUrl(url) {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  if (trimmed.startsWith(R2_MEDIA_PROXY_PREFIX)) return trimmed;

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
