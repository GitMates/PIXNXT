/** Studio chrome is desktop-only until the product is made responsive. */

export const DESKTOP_MIN_WIDTH = 1024;

const PUBLIC_CLIENT_PREFIXES = [
  '/gallery/',
  '/g/',
  '/m/',
  '/e/',
  '/album-preview/',
  '/download/',
  '/p/',
];

function normalizePath(pathname) {
  const raw = String(pathname || '').split('?')[0];
  if (raw.length > 1 && raw.endsWith('/')) return raw.slice(0, -1);
  return raw || '/';
}

export function isPublicClientPath(pathname) {
  const path = normalizePath(pathname);
  return PUBLIC_CLIENT_PREFIXES.some(
    (prefix) => path === prefix.slice(0, -1) || path.startsWith(prefix),
  );
}

export function shouldRequireDesktop(pathname) {
  const path = normalizePath(pathname);
  const isAuthPath = path === '/auth'
    || path.startsWith('/auth/')
    || path === '/login'
    || path === '/signup';

  // The beta home and authentication flows are responsive. Keep unfinished
  // studio routes gated until each route has its own responsive pass.
  return path !== '/' && !isAuthPath && !isPublicClientPath(path);
}

export function isDesktopViewport(width) {
  return Number(width) >= DESKTOP_MIN_WIDTH;
}
